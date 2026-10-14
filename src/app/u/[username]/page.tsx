import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { toggleFollow } from "@/app/follow/actions";
import { Pager } from "@/components/pager";
import { PostCard } from "@/components/post-card";
import {
  PAGE_SIZE,
  POST_CARD_SELECT,
  pageRange,
  parsePage,
  type PostCardData,
} from "@/lib/posts";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { decodeParam } from "@/lib/utils";
import { JsonLd } from "@/components/json-ld";
import { getPublicProfile } from "@/lib/public-data";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const username = decodeParam((await params).username).toLowerCase();
  const profile = await getPublicProfile(username);
  if (!profile) return { title: "블로그를 찾을 수 없어요", robots: { index: false, follow: false } };

  const title = `@${username}의 글`;
  const description =
    profile.bio || `익명 블로그 포갠의 @${username}님이 나눈 속마음 이야기를 읽어보세요.`;
  const url = absoluteUrl(`/@${username}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "profile", url, title, description, siteName: SITE_NAME, locale: "ko_KR" },
    twitter: { card: "summary", title, description },
  };
}

async function ProfileBody({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const username = decodeParam((await params).username).toLowerCase();
  const page = parsePage((await searchParams).page);

  const supabase = await createClient();
  const { data: author } = await supabase
    .from("profiles")
    .select("id, username, bio")
    .eq("username", username)
    .maybeSingle();
  if (!author) notFound();

  const me = await getCurrentProfile();
  const isMe = me?.id === author.id;

  const [followers, following, followingRow] = await Promise.all([
    supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", author.id),
    supabase
      .from("follows")
      .select("following_id", { count: "exact", head: true })
      .eq("follower_id", author.id),
    me && !isMe
      ? supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", me.id)
          .eq("following_id", author.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const isFollowing = !!followingRow.data;

  const { from, to } = pageRange(page);
  let query = supabase
    .from("posts")
    .select(POST_CARD_SELECT)
    .eq("author_id", author.id);
  // The author also sees their own drafts (RLS hides them from everyone else).
  if (!isMe) query = query.eq("status", "published");
  const { data } = await query
    .order("created_at", { ascending: false })
    .range(from, to + 1)
    .overrideTypes<PostCardData[], { merge: false }>();
  const posts = data ?? [];
  const hasNext = posts.length > PAGE_SIZE;

  const path = `/@${author.username}`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-8 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          url: absoluteUrl(path),
          mainEntity: {
            "@type": "Person",
            name: `@${author.username}`,
            url: absoluteUrl(path),
            description: author.bio ?? undefined,
          },
        }}
      />
      <header className="flex items-start gap-5 border-b border-zinc-200 pb-8 dark:border-zinc-800">
        <div className="flex flex-1 flex-col gap-2">
          <h1 className="text-2xl font-bold">@{author.username}</h1>
          {author.bio && <p className="text-sm">{author.bio}</p>}
          <p className="text-sm text-zinc-500">
            팔로워 {followers.count ?? 0} · 팔로잉 {following.count ?? 0}
          </p>
        </div>
        {isMe ? (
          <Link
            href="/write"
            className="flex h-10 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background"
          >
            글쓰기
          </Link>
        ) : me ? (
          <form action={toggleFollow.bind(null, author.id, path)}>
            <button
              type="submit"
              className={`h-10 rounded-full px-5 text-sm font-medium ${
                isFollowing
                  ? "border border-zinc-300 dark:border-zinc-700"
                  : "bg-foreground text-background"
              }`}
            >
              {isFollowing ? "팔로잉" : "팔로우"}
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="flex h-10 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background"
          >
            팔로우
          </Link>
        )}
      </header>

      {posts.length === 0 ? (
        <p className="py-16 text-center text-zinc-500">아직 작성한 글이 없습니다.</p>
      ) : (
        <div>
          {posts.slice(0, PAGE_SIZE).map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
      <Pager
        page={page}
        hasNext={hasNext}
        hrefFor={(p) => (p === 1 ? path : `${path}?page=${p}`)}
      />
    </div>
  );
}

export default function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <Suspense fallback={<div className="mx-auto h-64 w-full max-w-3xl animate-pulse p-8" />}>
        <ProfileBody params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
