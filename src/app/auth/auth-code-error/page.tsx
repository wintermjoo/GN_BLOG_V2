import Link from "next/link";
import { Suspense } from "react";

async function ErrorReason({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  if (!reason) return null;

  return (
    <p className="font-mono text-sm text-zinc-500">오류 코드: {reason}</p>
  );
}

export default function AuthCodeErrorPage({
  searchParams,
}: PageProps<"/auth/auth-code-error">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">로그인에 실패했습니다</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        잠시 후 다시 시도해 주세요.
      </p>
      <Suspense>
        <ErrorReason searchParams={searchParams as Promise<{ reason?: string }>} />
      </Suspense>
      <Link href="/login" className="underline">
        로그인 페이지로 돌아가기
      </Link>
    </main>
  );
}
