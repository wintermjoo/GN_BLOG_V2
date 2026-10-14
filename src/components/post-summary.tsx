import Link from "next/link";
import type { PublicPostSummary } from "@/lib/public-data";
import { formatDate, postPath } from "@/lib/utils";

export function PostSummary({ post }: { post: PublicPostSummary }) {
  return (
    <article className="flex flex-col gap-2 border-b border-zinc-200 py-5 dark:border-zinc-800">
      <Link href={`/@${post.author.username}`} className="text-sm font-medium">
        @{post.author.username}
      </Link>
      <Link href={postPath(post.author.username, post.slug)} className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{post.title}</h2>
        <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
          {post.seo_description || post.excerpt}
        </p>
      </Link>
      <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
        <span>{formatDate(post.published_at ?? post.updated_at)}</span>
        <span>{post.reading_minutes}분 분량</span>
        {post.tags.map((tag) => (
          <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
            #{tag}
          </Link>
        ))}
      </div>
    </article>
  );
}
