import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";

// For pages and actions that need a signed-in member. The nickname is assigned at signup by the database.
export async function requireUser() {
  const profile = await getCurrentProfile();
  if (!profile?.username) redirect("/login");
  return { ...profile, username: profile.username };
}
