"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";

export async function toggleLike(postId: string, path: string) {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: removed } = await supabase
    .from("post_likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .select("post_id");

  if (!removed || removed.length === 0) {
    await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
  }

  revalidatePath(path);
  revalidatePath("/");
}
