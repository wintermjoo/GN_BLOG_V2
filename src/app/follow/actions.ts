"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";

export async function toggleFollow(targetId: string, path: string) {
  const user = await requireUser();
  if (user.id === targetId) return;

  const supabase = await createClient();
  const { data: removed } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", targetId)
    .select("following_id");

  if (!removed || removed.length === 0) {
    await supabase
      .from("follows")
      .insert({ follower_id: user.id, following_id: targetId });
  }

  revalidatePath(path);
  revalidatePath("/");
}
