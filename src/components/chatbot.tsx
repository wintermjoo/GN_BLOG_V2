"use client";

import { useEffect, useRef, useState } from "react";
import { CHAT_LIMITS, GREETING, SUGGESTED_QUESTIONS } from "@/lib/chatbot";

type Message = { role: "user" | "assistant"; content: string };

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, loading, open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-CHAT_LIMITS.maxMessages) }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) throw new Error(data.error ?? "답변을 받지 못했어요.");
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "답변을 받지 못했어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <section
          aria-label="포갠 도우미 챗봇"
          className="flex h-[min(520px,70vh)] w-[min(360px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-amber-200 bg-[#FFF9F1] shadow-xl"
        >
          <header className="flex items-center justify-between bg-amber-100 px-4 py-3">
            <span className="font-display text-lg text-amber-900">포갠 도우미</span>
            <button type="button" aria-label="챗봇 닫기" onClick={() => setOpen(false)} className="text-amber-900">
              ✕
            </button>
          </header>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 text-sm">
            <p className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-zinc-800">{GREETING}</p>
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void send(q)}
                    className="rounded-full border border-amber-300 px-3 py-1 text-xs text-amber-900 hover:bg-amber-100"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <p
                key={i}
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 ${
                  m.role === "user"
                    ? "self-end rounded-tr-sm bg-amber-700 text-white"
                    : "rounded-tl-sm bg-white text-zinc-800"
                }`}
              >
                {m.content}
              </p>
            ))}
            {loading && <p className="text-xs text-zinc-500">답변을 쓰고 있어요…</p>}
            {error && (
              <p role="alert" className="text-xs text-red-600">
                {error}
              </p>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex gap-2 border-t border-amber-200 p-3"
          >
            <input
              value={input}
              maxLength={CHAT_LIMITS.maxChars}
              onChange={(e) => setInput(e.target.value)}
              placeholder="이용 방법을 물어보세요"
              aria-label="질문 입력"
              className="min-w-0 flex-1 rounded-full border border-amber-300 bg-white px-4 py-2 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-full bg-amber-700 px-4 text-sm text-white disabled:opacity-40"
            >
              전송
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        aria-label={open ? "챗봇 닫기" : "포갠 도우미 열기"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-700 text-2xl text-white shadow-lg transition hover:scale-105"
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
