import { Suspense } from "react";
import { AuthStatus } from "@/components/auth-status";
import { Brand } from "@/components/brand";
import { HomeFeed } from "@/components/home-feed";

export default function Home({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-16 w-full items-center justify-between px-8">
        <Brand />
        <Suspense>
          <AuthStatus />
        </Suspense>
      </header>
      <main className="flex flex-1 flex-col">
        <Suspense
          fallback={<div className="mx-auto h-64 w-full max-w-3xl animate-pulse p-8" />}
        >
          <HomeFeed searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
