import type { JSONContent } from "@tiptap/react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Comments } from "@/components/comments";
import { LikeButton } from "@/components/like-button";
import { PostContent } from "@/components/post-content";
import { ViewTracker } from "@/components/view-tracker";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { decodeParam, formatDate, postPath } from "@/lib/utils";

async function PostBody({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username: rawUsername, slug: rawSlug } = await params;
  const username = decodeParam(rawUsername).toLowerCase();
  const slug = decodeParam(rawSlug);

  const supabase = await createClient();
  const { data: author } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .eq("username", username)
    .maybeSingle();
  if (!author?.username) notFound();

  const { data: post } = await supabase
    .from("posts")
    .select(
      "id, title, content, status, published_at, created_at, view_count, like_count, comment_count",
    )
    .eq("author_id", author.id)
    .eq("slug", slug)
    .maybeSingle();
  if (!post) notFound();

  const me = await getCurrentProfile();
  const isAuthor = me?.id === author.id;
  const path = postPath(author.username!, slug);

  let liked = false;
  if (me) {
    const { data } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("post_id", post.id)
      .eq("user_id", me.id)
      .maybeSingle();
    liked = !!data;
  }

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-8 py-10">
      {post.status === "published" && <ViewTracker postId={post.id} />}

      <header className="flex flex-col gap-4">
        {post.status === "draft" && (
          <span className="w-fit rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            임시저장 (나만 볼 수 있음)
          </span>
        )}
        <h1 className="text-4xl font-bold tracking-tight">{post.title}</h1>
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <Link href={`/@${author.username}`} className="flex items-center gap-2">
            {author.avatar_url && (
              <Image
                src={author.avatar_url}
                alt=""
                width={28}
                height={28}
                className="rounded-full"
              />
            )}
            <span className="font-medium text-foreground">
              {author.full_name ?? author.username}
            </span>
            <span>@{author.username}</span>
          </Link>
          <div className="flex items-center gap-3">
            <span>{formatDate(post.published_at ?? post.created_at)}</span>
            <span>조회 {post.view_count}</span>
          </div>
        </div>
        {isAuthor && (
          <Link href={`${path}/edit`} className="w-fit text-sm underline">
            글 수정
          </Link>
        )}
      </header>

      <PostContent content={post.content as JSONContent} />

      <div className="flex items-center gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <LikeButton
          postId={post.id}
          path={path}
          count={post.like_count}
          liked={liked}
          signedIn={!!me}
        />
        <span className="text-sm text-zinc-500">댓글 {post.comment_count}</span>
      </div>

      <Comments postId={post.id} path={path} postAuthorId={author.id} me={me} />
    </article>
  );
}

export default function PostPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <Suspense
        fallback={<div className="mx-auto h-64 w-full max-w-3xl animate-pulse p-8" />}
      >
        <PostBody params={params} />
      </Suspense>
    </div>
  );
}
