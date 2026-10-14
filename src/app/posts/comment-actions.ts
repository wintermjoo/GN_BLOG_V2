"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";

const contentSchema = z.string().trim().min(1).max(2000);

export async function addComment(
  postId: string,
  path: string,
  parentId: string | null,
  formData: FormData,
) {
  const user = await requireUser();
  const parsed = contentSchema.safeParse(formData.get("content"));
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase.from("comments").insert({
    post_id: postId,
    author_id: user.id,
    parent_id: parentId,
    content: parsed.data,
  });

  revalidatePath(path);
  revalidatePath("/");
}

export async function deleteComment(commentId: string, path: string) {
  const user = await requireUser();
  const supabase = await createClient();

  const { count } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", commentId);

  if (count && count > 0) {
    // Keep the row so replies stay attached; only blank it out.
    await supabase
      .from("comments")
      .update({ content: "", deleted_at: new Date().toISOString() })
      .eq("id", commentId)
      .eq("author_id", user.id);
  } else {
    await supabase.from("comments").delete().eq("id", commentId).eq("author_id", user.id);
  }

  revalidatePath(path);
  revalidatePath("/");
}
