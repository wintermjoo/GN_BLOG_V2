import Link from "next/link";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
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

export async function HomeFeed({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const me = await getCurrentProfile();
  const tab = sp.tab === "following" && me ? "following" : "latest";
  const supabase = await createClient();
  const { from, to } = pageRange(page);

  let posts: PostCardData[] = [];
  let followingCount = 0;

  if (tab === "following" && me) {
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", me.id);
    const ids = (follows ?? []).map((f) => f.following_id as string);
    followingCount = ids.length;
    if (ids.length > 0) {
      const { data } = await supabase
        .from("posts")
        .select(POST_CARD_SELECT)
        .eq("status", "published")
        .in("author_id", ids)
        .order("published_at", { ascending: false })
        .range(from, to + 1)
        .overrideTypes<PostCardData[], { merge: false }>();
      posts = data ?? [];
    }
  } else {
    const { data } = await supabase
      .from("posts")
      .select(POST_CARD_SELECT)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .range(from, to + 1)
      .overrideTypes<PostCardData[], { merge: false }>();
    posts = data ?? [];
  }

  const hasNext = posts.length > PAGE_SIZE;
  const tabClass = (active: boolean) =>
    `pb-2 text-sm font-medium ${active ? "border-b-2 border-foreground" : "text-zinc-500"}`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-8 py-10">
      {!me && (
        <section className="mb-10 flex flex-col items-center gap-5 rounded-2xl border border-zinc-200 p-10 text-center dark:border-zinc-800">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-4xl text-[#E88C46]">포갠</h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              속마음을 안전하게 나누는 익명 블로그.
              <br />
              Google 계정으로 1초 만에 시작하세요.
            </p>
          </div>
          <GoogleSignInButton />
        </section>
      )}

      <nav className="flex gap-6 border-b border-zinc-200 dark:border-zinc-800">
        <Link href="/" className={tabClass(tab === "latest")}>
          최신글
        </Link>
        <Link
          href={me ? "/?tab=following" : "/login"}
          className={tabClass(tab === "following")}
        >
          팔로잉
        </Link>
      </nav>

      {posts.length === 0 ? (
        <p className="py-20 text-center text-zinc-500">
          {tab === "following"
            ? followingCount === 0
              ? "아직 팔로우한 회원이 없습니다. 마음에 드는 블로그를 팔로우해 보세요."
              : "팔로우한 회원의 새 글이 없습니다."
            : "아직 올라온 글이 없습니다."}
        </p>
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
        hrefFor={(p) => {
          const qs = new URLSearchParams();
          if (tab === "following") qs.set("tab", "following");
          if (p > 1) qs.set("page", String(p));
          const s = qs.toString();
          return s ? `/?${s}` : "/";
        }}
      />
    </div>
  );
}
