import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";

// For pages and actions that need a signed-in user who has chosen a username.
export async function requireUser() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.username) redirect("/onboarding");
  return { ...profile, username: profile.username };
}
