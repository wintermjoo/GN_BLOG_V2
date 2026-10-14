"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/, "아이디는 영문 소문자, 숫자, _ 조합 3~20자여야 합니다."),
  bio: z.string().trim().max(200, "소개는 200자 이내로 입력해 주세요."),
});

export type OnboardingState = { error?: string };

export async function setUsername(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const parsed = schema.safeParse({
    username: formData.get("username"),
    bio: formData.get("bio") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ username: parsed.data.username, bio: parsed.data.bio || null })
    .eq("id", userId);

  if (error) {
    console.error("[onboarding/setUsername] failed:", error.code, error.message);
    if (error.code === "23505") return { error: "이미 사용 중인 아이디입니다." };
    return { error: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  redirect("/");
}
