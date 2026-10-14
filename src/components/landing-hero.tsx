import Image from "next/image";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { getCurrentProfile } from "@/lib/supabase/profile";

export async function LandingHero() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <div className="flex flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-semibold tracking-tight">blog_v2</h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Google 계정으로 1초 만에 가입하고 시작하세요.
          </p>
        </div>
        <GoogleSignInButton />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {profile.avatar_url && (
        <Image
          src={profile.avatar_url}
          alt=""
          width={72}
          height={72}
          className="rounded-full"
        />
      )}
      <h1 className="text-3xl font-semibold tracking-tight">
        {profile.full_name ?? profile.email}님, 환영합니다
      </h1>
    </div>
  );
}

export function LandingHeroFallback() {
  return <div className="h-40 w-80 animate-pulse rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60" />;
}
