import type { JSONContent } from "@tiptap/react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Comments } from "@/components/comments";
import { LikeButton } from "@/components/like-button";
import { PostContent } from "@/components/post-content";
import { ViewTracker } from "@/components/view-tracker";
import { JsonLd } from "@/components/json-ld";
import { PostSummary } from "@/components/post-summary";
import { ShareButton } from "@/components/share-button";
import { Toc } from "@/components/toc";
import { extractToc } from "@/lib/toc";
import { getPublicPost, getRelatedPosts } from "@/lib/public-data";
import { absoluteUrl, postUrlPath, SITE_NAME } from "@/lib/site";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { decodeParam, formatDate, postPath } from "@/lib/utils";
import type { Metadata } from "next";

type PostParams = Promise<{ username: string; slug: string }>;

async function RelatedPosts({ tags, excludeId }: { tags: string[]; excludeId: string }) {
  const related = await getRelatedPosts(tags, excludeId);
  if (related.length === 0) return null;
  return (
    <section aria-label="함께 읽어보세요">
      <h2 className="text-lg font-semibold">함께 읽어보세요</h2>
      {related.map((p) => (
        <PostSummary key={p.id} post={p} />
      ))}
    </section>
  );
}

export async function generateMetadata({ params }: { params: PostParams }): Promise<Metadata> {
  const { username: rawUser, slug: rawSlug } = await params;
  const username = decodeParam(rawUser).toLowerCase();
  const slug = decodeParam(rawSlug);
  const post = await getPublicPost(username, slug);
  if (!post) return { title: "글을 찾을 수 없어요", robots: { index: false, follow: false } };

  const title = post.seo_title || post.title;
  const description = post.seo_description || post.excerpt;
  const url = absoluteUrl(postUrlPath(username, slug));
  const ogImage = absoluteUrl(`${postUrlPath(username, slug)}/og`);

  return {
    title,
    description,
    authors: [{ name: `@${username}`, url: absoluteUrl(`/@${username}`) }],
    keywords: post.tags,
    alternates: { canonical: url, types: { "text/markdown": `${url}.md` } },
    robots: post.indexable
      ? { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 }
      : { index: false, follow: true },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      siteName: SITE_NAME,
      locale: "ko_KR",
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      authors: [absoluteUrl(`/@${username}`)],
      tags: post.tags,
      images: [{ url: ogImage, width: 1200, height: 630, alt: post.cover_image_alt || title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

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
    .select("id, username")
    .eq("username", username)
    .maybeSingle();
  if (!author?.username) notFound();

  const { data: post } = await supabase
    .from("posts")
    .select(
      "id, title, content, status, published_at, created_at, updated_at, view_count, like_count, comment_count, seo_title, seo_description, excerpt, tags, cover_image_url, cover_image_alt, indexable, reading_minutes",
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

  const publicUrl = absoluteUrl(postUrlPath(author.username!, slug));
  const profileUrl = absoluteUrl(`/@${author.username}`);
  const headline = (post.seo_title || post.title).slice(0, 110);
  const structuredData =
    post.status === "published" && post.indexable
      ? [
          {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline,
            description: post.seo_description || post.excerpt,
            image: post.cover_image_url
              ? [post.cover_image_url, absoluteUrl(`${postUrlPath(author.username!, slug)}/og`)]
              : [absoluteUrl(`${postUrlPath(author.username!, slug)}/og`)],
            datePublished: post.published_at ?? post.created_at,
            dateModified: post.updated_at,
            inLanguage: "ko",
            keywords: post.tags.join(", "),
            url: publicUrl,
            mainEntityOfPage: { "@type": "WebPage", "@id": publicUrl },
            author: { "@type": "Person", name: `@${author.username}`, url: profileUrl },
            publisher: {
              "@type": "Organization",
              name: SITE_NAME,
              logo: { "@type": "ImageObject", url: absoluteUrl("/logo.png") },
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl("/") },
              { "@type": "ListItem", position: 2, name: `@${author.username}`, item: profileUrl },
              { "@type": "ListItem", position: 3, name: post.title, item: publicUrl },
            ],
          },
        ]
      : null;

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-8 py-10">
      {structuredData && <JsonLd data={structuredData} />}
      {post.status === "published" && <ViewTracker postId={post.id} />}

      <header className="flex flex-col gap-4">
        {post.status === "draft" && (
          <span className="w-fit rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            임시저장 (나만 볼 수 있음)
          </span>
        )}
        <nav aria-label="breadcrumb" className="text-sm text-zinc-500">
          <Link href="/">{SITE_NAME}</Link> ›{" "}
          <Link href={`/@${author.username}`}>@{author.username}</Link>
        </nav>
        {isAuthor && post.status === "published" && !post.indexable && (
          <span className="w-fit rounded bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
            검색 비노출
          </span>
        )}
        <h1 className="text-4xl font-bold tracking-tight">{post.title}</h1>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-500">
          <Link href={`/@${author.username}`} className="font-medium text-foreground">
            @{author.username}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <time dateTime={post.published_at ?? post.created_at}>
              {formatDate(post.published_at ?? post.created_at)}
            </time>
            {post.updated_at.slice(0, 10) !== (post.published_at ?? post.created_at).slice(0, 10) && (
              <span>
                (수정 <time dateTime={post.updated_at}>{formatDate(post.updated_at)}</time>)
              </span>
            )}
            <span>{post.reading_minutes}분 분량</span>
            <span>조회 {post.view_count}</span>
          </div>
        </div>
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag: string) => (
              <Link
                key={tag}
                href={`/tags/${encodeURIComponent(tag)}`}
                className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-900"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
        {isAuthor && (
          <Link href={`${path}/edit`} className="w-fit text-sm underline">
            글 수정
          </Link>
        )}
      </header>

      <Toc items={extractToc(post.content as JSONContent)} />

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
        <div className="ml-auto">
          <ShareButton title={post.title} />
        </div>
      </div>

      {post.status === "published" && post.indexable && post.tags.length > 0 && (
        <Suspense>
          <RelatedPosts tags={post.tags} excludeId={post.id} />
        </Suspense>
      )}

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
