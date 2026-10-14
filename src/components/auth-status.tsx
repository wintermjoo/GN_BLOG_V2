import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { getCurrentProfile } from "@/lib/supabase/profile";

export async function AuthStatus() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <Link href="/login" className="text-sm font-medium underline">
        로그인
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      {profile.username ? (
        <>
          <Link href="/write" className="font-medium">
            글쓰기
          </Link>
          <Link
            href={`/@${profile.username}`}
            className="text-zinc-600 dark:text-zinc-400"
          >
            {profile.full_name ?? profile.username}
          </Link>
        </>
      ) : (
        <Link href="/onboarding" className="font-medium">
          아이디 만들기
        </Link>
      )}
      <form action={signOut}>
        <button type="submit" className="font-medium underline">
          로그아웃
        </button>
      </form>
    </div>
  );
}
