import { createClient } from "@/lib/supabase/server";

// Anonymous blog: only the self-chosen handle is ever shown. Google name/photo are never used.
export type Profile = {
  id: string;
  username: string | null;
  bio: string | null;
};

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, username, bio")
    .eq("id", userId)
    .maybeSingle();

  return {
    id: userId,
    username: data?.username ?? null,
    bio: data?.bio ?? null,
  };
}
