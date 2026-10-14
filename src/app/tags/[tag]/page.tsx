import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { PostSummary } from "@/components/post-summary";
import { listIndexablePosts } from "@/lib/public-data";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { decodeParam } from "@/lib/utils";

type TagParams = Promise<{ tag: string }>;

export async function generateMetadata({ params }: { params: TagParams }): Promise<Metadata> {
  const tag = decodeParam((await params).tag).toLowerCase();
  const posts = await listIndexablePosts({ limit: 1, tag });
  const title = `#${tag} 이야기`;
  const description = `포갠에서 #${tag} 태그로 나눈 속마음 이야기 모음입니다.`;
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/tags/${encodeURIComponent(tag)}`) },
    // Thin pages with no posts shouldn't be indexed.
    robots: posts.length === 0 ? { index: false, follow: true } : undefined,
    openGraph: { title, description, siteName: SITE_NAME, locale: "ko_KR" },
  };
}

async function TagBody({ params }: { params: TagParams }) {
  const tag = decodeParam((await params).tag).toLowerCase();
  const posts = await listIndexablePosts({ limit: 50, tag });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-8 py-10">
      <nav aria-label="breadcrumb" className="mb-4 text-sm text-zinc-500">
        <Link href="/">{SITE_NAME}</Link> › <span>#{tag}</span>
      </nav>
      <h1 className="text-2xl font-bold">#{tag}</h1>
      {posts.length === 0 ? (
        <p className="py-16 text-center text-zinc-500">이 태그의 글이 아직 없어요.</p>
      ) : (
        posts.map((post) => <PostSummary key={post.id} post={post} />)
      )}
    </div>
  );
}

export default function TagPage({ params }: { params: TagParams }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-16 w-full items-center px-8">
        <Brand />
      </header>
      <Suspense fallback={<div className="mx-auto h-64 w-full max-w-3xl animate-pulse p-8" />}>
        <TagBody params={params} />
      </Suspense>
    </div>
  );
}
