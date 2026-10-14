import type { JSONContent } from "@tiptap/react";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

// Cached reads for anything that must be visible to crawlers (metadata, sitemap, feeds).
// Only published posts are ever returned. Mutating actions call updateTag() with these tags.

export const POSTS_TAG = "posts";
export const postTag = (username: string, slug: string) => `post:${username}:${slug}`;
export const profileTag = (username: string) => `profile:${username}`;

const POST_FIELDS =
  "id, slug, title, excerpt, content, cover_image_url, cover_image_alt, seo_title, seo_description, tags, indexable, reading_minutes, published_at, updated_at, created_at, view_count, like_count, comment_count";

export type PublicPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: JSONContent;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  seo_title: string | null;
  seo_description: string | null;
  tags: string[];
  indexable: boolean;
  reading_minutes: number;
  published_at: string | null;
  updated_at: string;
  created_at: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  author: { username: string };
};

export type PublicPostSummary = Pick<
  PublicPost,
  | "id"
  | "slug"
  | "title"
  | "excerpt"
  | "seo_description"
  | "tags"
  | "published_at"
  | "updated_at"
  | "cover_image_url"
  | "reading_minutes"
> & { author: { username: string } };

const SUMMARY_FIELDS =
  "id, slug, title, excerpt, seo_description, tags, published_at, updated_at, cover_image_url, reading_minutes, author:profiles!author_id!inner(username)";

export async function getPublicProfile(username: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(profileTag(username));

  const { data } = await createPublicClient()
    .from("profiles")
    .select("id, username, bio, created_at")
    .eq("username", username)
    .maybeSingle();
  return data;
}

export async function getPublicPost(username: string, slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(POSTS_TAG, postTag(username, slug));

  const { data } = await createPublicClient()
    .from("posts")
    .select(`${POST_FIELDS}, author:profiles!author_id!inner(username)`)
    .eq("status", "published")
    .eq("author.username", username)
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<PublicPost, { merge: false }>();
  return data;
}

// Published AND indexable posts, newest first. Used by sitemap, llms.txt, RSS, tag pages.
export async function listIndexablePosts(options: {
  limit: number;
  offset?: number;
  tag?: string;
}) {
  "use cache";
  cacheLife("hours");
  cacheTag(POSTS_TAG);

  let query = createPublicClient()
    .from("posts")
    .select(SUMMARY_FIELDS)
    .eq("status", "published")
    .eq("indexable", true);
  if (options.tag) query = query.contains("tags", [options.tag]);

  const offset = options.offset ?? 0;
  const { data } = await query
    .order("published_at", { ascending: false })
    .range(offset, offset + options.limit - 1)
    .overrideTypes<PublicPostSummary[], { merge: false }>();
  return data ?? [];
}

export async function getRelatedPosts(tags: string[], excludeId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(POSTS_TAG);

  if (tags.length === 0) return [];
  const { data } = await createPublicClient()
    .from("posts")
    .select(SUMMARY_FIELDS)
    .eq("status", "published")
    .eq("indexable", true)
    .overlaps("tags", tags)
    .neq("id", excludeId)
    .order("published_at", { ascending: false })
    .limit(3)
    .overrideTypes<PublicPostSummary[], { merge: false }>();
  return data ?? [];
}

export async function getTagCounts(): Promise<{ tag: string; count: number }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(POSTS_TAG);

  const { data } = await createPublicClient()
    .from("posts")
    .select("tags")
    .eq("status", "published")
    .eq("indexable", true)
    .limit(2000);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    for (const tag of (row.tags as string[]) ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export async function listPublicProfilesWithPosts() {
  "use cache";
  cacheLife("hours");
  cacheTag(POSTS_TAG);

  const { data } = await createPublicClient()
    .from("posts")
    .select("author:profiles!author_id!inner(username), updated_at")
    .eq("status", "published")
    .eq("indexable", true)
    .order("updated_at", { ascending: false })
    .limit(2000)
    .overrideTypes<{ author: { username: string }; updated_at: string }[], { merge: false }>();

  const latest = new Map<string, string>();
  for (const row of data ?? []) {
    if (!latest.has(row.author.username)) latest.set(row.author.username, row.updated_at);
  }
  return [...latest.entries()].map(([username, updated_at]) => ({ username, updated_at }));
}
