"use client";

import { useActionState } from "react";
import { setUsername, type OnboardingState } from "./actions";

export function OnboardingForm() {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(
    setUsername,
    {},
  );

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">아이디</span>
        <div className="flex items-center rounded-lg border border-zinc-300 px-3 dark:border-zinc-700">
          <span className="text-zinc-500">@</span>
          <input
            name="username"
            required
            minLength={3}
            maxLength={20}
            pattern="[a-zA-Z0-9_]{3,20}"
            autoComplete="off"
            className="w-full bg-transparent px-1 py-2 outline-none"
          />
        </div>
        <span className="text-xs text-zinc-500">
          영문, 숫자, _ 조합 3~20자. 블로그 주소가 됩니다.
        </span>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">한 줄 소개 (선택)</span>
        <textarea
          name="bio"
          maxLength={200}
          rows={3}
          className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 outline-none dark:border-zinc-700"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-full bg-foreground font-medium text-background disabled:opacity-50"
      >
        {pending ? "저장 중..." : "시작하기"}
      </button>
    </form>
  );
}
