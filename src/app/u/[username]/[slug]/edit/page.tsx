import { notFound } from "next/navigation";
import { Suspense } from "react";
import { deletePost, updatePost } from "@/app/posts/actions";
import { PostEditor } from "@/components/editor/post-editor";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { decodeParam } from "@/lib/utils";
import type { JSONContent } from "@tiptap/react";

async function EditForm({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const user = await requireUser();
  const { username, slug } = await params;
  if (decodeParam(username) !== user.username) notFound();

  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select(
      "id, slug, title, content, status, seo_title, seo_description, tags, cover_image_url, cover_image_alt, indexable",
    )
    .eq("author_id", user.id)
    .eq("slug", decodeParam(slug))
    .maybeSingle();
  if (!post) notFound();

  return (
    <>
      <PostEditor
        initialTitle={post.title}
        initialContent={post.content as JSONContent}
        username={user.username}
        slugLocked={post.status === "published"}
        initialMeta={{
          seoTitle: post.seo_title ?? "",
          seoDescription: post.seo_description ?? "",
          slug: post.slug,
          tags: post.tags ?? [],
          coverImageUrl: post.cover_image_url,
          coverImageAlt: post.cover_image_alt ?? "",
          indexable: post.indexable,
        }}
        onSubmit={updatePost.bind(null, post.id)}
        submitLabels={{ draft: "임시저장", published: post.status === "published" ? "수정 완료" : "발행" }}
      />
      <form action={deletePost.bind(null, post.id)} className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <button type="submit" className="text-sm text-red-600 underline">
          이 글 삭제
        </button>
      </form>
    </>
  );
}

export default function EditPostPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <h1 className="text-sm font-medium text-zinc-500">글 수정</h1>
      <Suspense>
        <EditForm params={params} />
      </Suspense>
    </main>
  );
}
