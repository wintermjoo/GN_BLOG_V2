import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string | null;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

// Returns the signed-in user's profile, or null when signed out.
// Email comes from the auth claims: the profiles.email column is not publicly readable.
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const claims = auth?.claims;
  if (!claims?.sub) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio")
    .eq("id", claims.sub)
    .maybeSingle();

  const metadata = claims.user_metadata ?? {};
  return {
    id: claims.sub,
    email: claims.email ?? null,
    username: data?.username ?? null,
    full_name: data?.full_name ?? metadata.full_name ?? metadata.name ?? null,
    avatar_url: data?.avatar_url ?? metadata.avatar_url ?? metadata.picture ?? null,
    bio: data?.bio ?? null,
  };
}
