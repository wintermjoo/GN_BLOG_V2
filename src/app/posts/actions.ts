"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { extractFirstImage, sanitizeContent } from "@/lib/editor/content";
import {
  autoDescription,
  collectImages,
  extractPlainText,
  normalizeTags,
  readingMinutes,
} from "@/lib/post-meta";
import { POSTS_TAG, postTag, profileTag } from "@/lib/public-data";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { makeSlug, postPath, slugify } from "@/lib/utils";

const postSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해 주세요.").max(200, "제목은 200자 이내로 입력해 주세요."),
  content: z.looseObject({ type: z.literal("doc") }),
  status: z.enum(["draft", "published"]),
  seoTitle: z.string().trim().max(60, "검색 제목은 60자 이내로 입력해 주세요.").default(""),
  seoDescription: z.string().trim().max(160, "설명은 160자 이내로 입력해 주세요.").default(""),
  slug: z.string().trim().max(80, "글 주소는 80자 이내로 입력해 주세요.").default(""),
  tags: z.array(z.string().max(60)).max(20).default([]),
  coverImageUrl: z.string().max(1000).nullable().default(null),
  coverImageAlt: z.string().trim().max(200, "대표 이미지 설명은 200자 이내로 입력해 주세요.").default(""),
  indexable: z.boolean().default(true),
});

type Result = { error?: string };

function prepare(input: unknown) {
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message } as const;

  const content = sanitizeContent(parsed.data.content);
  if (!content) return { error: "본문 형식이 올바르지 않거나 너무 깁니다." } as const;

  const text = extractPlainText(content);
  const images = collectImages(content);
  const cover =
    images.find((i) => i.src === parsed.data.coverImageUrl) ?? images[0] ?? null;

  return {
    data: {
      title: parsed.data.title,
      content,
      status: parsed.data.status,
      excerpt: text.slice(0, 200),
      seo_title: parsed.data.seoTitle || null,
      seo_description: parsed.data.seoDescription || autoDescription(text) || null,
      tags: normalizeTags(parsed.data.tags),
      cover_image_url: cover?.src ?? extractFirstImage(content),
      cover_image_alt: parsed.data.coverImageAlt || cover?.alt || null,
      indexable: parsed.data.indexable,
      reading_minutes: readingMinutes(text),
      slugInput: parsed.data.slug,
    },
  } as const;
}

function invalidate(username: string, ...slugs: string[]) {
  updateTag(POSTS_TAG);
  updateTag(profileTag(username));
  for (const slug of new Set(slugs)) updateTag(postTag(username, slug));
}

export async function createPost(input: unknown): Promise<Result> {
  const user = await requireUser();
  const prepared = prepare(input);
  if ("error" in prepared) return { error: prepared.error };
  const { slugInput, ...fields } = prepared.data;

  const supabase = await createClient();
  const slug = slugInput ? slugify(slugInput) : makeSlug(fields.title);
  const { error } = await supabase
    .from("posts")
    .insert({ author_id: user.id, slug, ...fields });
  if (error) {
    if (error.code === "23505") return { error: "이미 사용 중인 글 주소예요. 다른 주소를 입력해 주세요." };
    return { error: "글을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  invalidate(user.username, slug);
  revalidatePath("/");
  redirect(postPath(user.username, slug));
}

export async function updatePost(postId: string, input: unknown): Promise<Result> {
  const user = await requireUser();
  const prepared = prepare(input);
  if ("error" in prepared) return { error: prepared.error };
  const { slugInput, ...fields } = prepared.data;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("posts")
    .select("slug")
    .eq("id", postId)
    .eq("author_id", user.id)
    .maybeSingle();
  if (!existing) return { error: "글을 찾을 수 없습니다." };

  const slug = slugInput ? slugify(slugInput) : existing.slug;
  // RLS limits this to the author's own posts; no row back means not found or not yours.
  const { data, error } = await supabase
    .from("posts")
    .update({ slug, ...fields })
    .eq("id", postId)
    .select("slug")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") return { error: "이미 사용 중인 글 주소예요. 다른 주소를 입력해 주세요." };
    return { error: "글을 수정하지 못했습니다." };
  }
  if (!data) return { error: "글을 수정하지 못했습니다." };

  invalidate(user.username, existing.slug, data.slug);
  revalidatePath("/");
  revalidatePath(`/u/${user.username}`);
  redirect(postPath(user.username, data.slug));
}

export async function deletePost(postId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("posts")
    .select("slug")
    .eq("id", postId)
    .eq("author_id", user.id)
    .maybeSingle();
  await supabase.from("posts").delete().eq("id", postId);

  invalidate(user.username, ...(existing ? [existing.slug] : []));
  revalidatePath("/");
  redirect(`/@${user.username}`);
}
