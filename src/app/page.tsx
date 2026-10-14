import { Suspense } from "react";
import { AuthStatus } from "@/components/auth-status";
import { LandingHero, LandingHeroFallback } from "@/components/landing-hero";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <header className="flex h-16 w-full items-center justify-between px-8">
        <span className="text-lg font-semibold">blog_v2</span>
        <Suspense>
          <AuthStatus />
        </Suspense>
      </header>
      <main className="flex flex-1 items-center justify-center p-8">
        <Suspense fallback={<LandingHeroFallback />}>
          <LandingHero />
        </Suspense>
      </main>
    </div>
  );
}
