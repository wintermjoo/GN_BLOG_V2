"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { extractFirstImage, extractText, sanitizeContent } from "@/lib/editor/content";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { makeSlug, postPath } from "@/lib/utils";

const postSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해 주세요.").max(200, "제목은 200자 이내로 입력해 주세요."),
  content: z.looseObject({ type: z.literal("doc") }),
  status: z.enum(["draft", "published"]),
});

type Result = { error?: string };

function prepare(input: unknown):
  | { error: string }
  | { data: { title: string; content: object; excerpt: string; cover: string | null; status: "draft" | "published" } } {
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const content = sanitizeContent(parsed.data.content);
  if (!content) return { error: "본문 형식이 올바르지 않거나 너무 깁니다." };

  return {
    data: {
      title: parsed.data.title,
      content,
      excerpt: extractText(content).slice(0, 200),
      cover: extractFirstImage(content),
      status: parsed.data.status,
    },
  };
}

export async function createPost(input: unknown): Promise<Result> {
  const user = await requireUser();
  const prepared = prepare(input);
  if ("error" in prepared) return { error: prepared.error };
  const { title, content, excerpt, cover, status } = prepared.data;

  const supabase = await createClient();
  const slug = makeSlug(title);
  const { error } = await supabase.from("posts").insert({
    author_id: user.id,
    slug,
    title,
    content,
    excerpt,
    cover_image_url: cover,
    status,
  });
  if (error) return { error: "글을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };

  revalidatePath("/");
  redirect(postPath(user.username, slug));
}

export async function updatePost(postId: string, input: unknown): Promise<Result> {
  const user = await requireUser();
  const prepared = prepare(input);
  if ("error" in prepared) return { error: prepared.error };
  const { title, content, excerpt, cover, status } = prepared.data;

  const supabase = await createClient();
  // RLS limits this to the author's own posts; no row back means not found or not yours.
  const { data, error } = await supabase
    .from("posts")
    .update({ title, content, excerpt, cover_image_url: cover, status })
    .eq("id", postId)
    .select("slug")
    .maybeSingle();
  if (error || !data) return { error: "글을 수정하지 못했습니다." };

  revalidatePath("/");
  revalidatePath(`/u/${user.username}`);
  redirect(postPath(user.username, data.slug));
}

export async function deletePost(postId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("posts").delete().eq("id", postId);

  revalidatePath("/");
  redirect(`/@${user.username}`);
}
