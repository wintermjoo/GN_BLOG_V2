import Link from "next/link";
import { toggleLike } from "@/app/posts/interactions";

export function LikeButton({
  postId,
  path,
  count,
  liked,
  signedIn,
}: {
  postId: string;
  path: string;
  count: number;
  liked: boolean;
  signedIn: boolean;
}) {
  const className =
    "flex h-10 items-center gap-2 rounded-full border border-zinc-300 px-4 text-sm font-medium dark:border-zinc-700";

  if (!signedIn) {
    return (
      <Link href="/login" className={className}>
        ♡ {count}
      </Link>
    );
  }

  return (
    <form action={toggleLike.bind(null, postId, path)}>
      <button type="submit" aria-pressed={liked} className={className}>
        <span className={liked ? "text-red-500" : ""}>{liked ? "♥" : "♡"}</span> {count}
      </button>
    </form>
  );
}
