import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const claims = auth?.claims;
  if (!claims?.sub) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url")
    .eq("id", claims.sub)
    .maybeSingle();

  if (data) return data;

  // Signed in but no profile row yet (e.g. the profiles migration hasn't been applied).
  const metadata = claims.user_metadata ?? {};
  return {
    id: claims.sub,
    email: claims.email ?? null,
    full_name: metadata.full_name ?? metadata.name ?? null,
    avatar_url: metadata.avatar_url ?? metadata.picture ?? null,
  };
}
