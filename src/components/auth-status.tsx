import { signOut } from "@/app/auth/actions";
import { getCurrentProfile } from "@/lib/supabase/profile";

export async function AuthStatus() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  return (
    <div className="flex items-center gap-4">
      <span className="text-zinc-600 dark:text-zinc-400">
        {profile.full_name ?? profile.email}
      </span>
      <form action={signOut}>
        <button type="submit" className="font-medium underline">
          로그아웃
        </button>
      </form>
    </div>
  );
}
