import { Suspense } from "react";
import { createPost } from "@/app/posts/actions";
import { PostEditor } from "@/components/editor/post-editor";
import { requireUser } from "@/lib/supabase/require-user";

async function Editor() {
  await requireUser();
  return <PostEditor onSubmit={createPost} />;
}

export default function WritePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <h1 className="text-sm font-medium text-zinc-500">새 글 작성</h1>
      <Suspense>
        <Editor />
      </Suspense>
    </main>
  );
}
