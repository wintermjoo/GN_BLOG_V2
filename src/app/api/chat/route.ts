import { NextResponse } from "next/server";
import { z } from "zod";
import { CHAT_LIMITS, SYSTEM_PROMPT } from "@/lib/chatbot";

const MODEL = process.env.CHAT_MODEL ?? "gemini-flash-lite-latest";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(CHAT_LIMITS.maxChars),
      }),
    )
    .min(1)
    .max(CHAT_LIMITS.maxMessages),
});

// Best-effort per-instance rate limit (resets on cold start); protects the API key from casual abuse.
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;

function limited(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "챗봇이 아직 준비되지 않았어요." }, { status: 503 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (limited(ip)) {
    return NextResponse.json({ error: "질문이 너무 빨라요. 잠시 후 다시 물어봐 주세요." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.messages.at(-1)?.role !== "user") {
    return NextResponse.json({ error: "질문을 확인해 주세요. (500자 이내)" }, { status: 400 });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: parsed.data.messages.map((m) => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          temperature: 0.4,
          // Newer models spend part of this budget on internal thinking, so keep it generous.
          maxOutputTokens: 2048,
        },
      }),
      signal: AbortSignal.timeout(25_000),
    },
  ).catch(() => null);

  if (!res?.ok) {
    console.error("[chat] Gemini request failed", res?.status, (await res?.text())?.slice(0, 500));
    return NextResponse.json({ error: "지금은 답변하기 어려워요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const reply = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!reply) {
    return NextResponse.json({ error: "답변을 만들지 못했어요. 질문을 바꿔 다시 물어봐 주세요." }, { status: 502 });
  }

  return NextResponse.json({ reply });
}
