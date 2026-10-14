import Image from "next/image";
import Link from "next/link";
import type { PostCardData } from "@/lib/posts";
import { formatDate, postPath } from "@/lib/utils";

export function PostCard({ post }: { post: PostCardData }) {
  const username = post.author?.username;
  if (!username) return null;

  return (
    <article className="flex gap-4 border-b border-zinc-200 py-6 dark:border-zinc-800">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Link href={`/@${username}`} className="text-sm font-medium">
          @{username}
        </Link>
        <Link href={postPath(username, post.slug)} className="flex flex-col gap-1">
          <h2 className="truncate text-xl font-semibold">
            {post.status === "draft" && (
              <span className="mr-2 rounded bg-amber-100 px-1.5 py-0.5 align-middle text-xs font-medium text-amber-800">
                임시저장
              </span>
            )}
            {post.title}
          </h2>
          {post.excerpt && (
            <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
              {post.excerpt}
            </p>
          )}
        </Link>
        <div className="flex gap-3 text-xs text-zinc-500">
          <span>{formatDate(post.published_at ?? post.created_at)}</span>
          <span>조회 {post.view_count}</span>
          <span>♡ {post.like_count}</span>
          <span>댓글 {post.comment_count}</span>
        </div>
      </div>
      {post.cover_image_url && (
        <Link href={postPath(username, post.slug)} className="shrink-0">
          <Image
            src={post.cover_image_url}
            alt=""
            width={112}
            height={112}
            className="h-28 w-28 rounded-lg object-cover"
          />
        </Link>
      )}
    </article>
  );
}
