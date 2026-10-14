import Link from "next/link";
import { addComment, deleteComment } from "@/app/posts/comment-actions";
import type { Profile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

type CommentRow = {
  id: string;
  parent_id: string | null;
  content: string;
  deleted_at: string | null;
  created_at: string;
  author_id: string;
  author: { username: string | null } | null;
};

function CommentForm({
  postId,
  path,
  parentId,
  placeholder,
}: {
  postId: string;
  path: string;
  parentId: string | null;
  placeholder: string;
}) {
  return (
    <form
      action={addComment.bind(null, postId, path, parentId)}
      className="flex flex-col gap-2"
    >
      <textarea
        name="content"
        required
        maxLength={2000}
        rows={3}
        placeholder={placeholder}
        className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none dark:border-zinc-700"
      />
      <button
        type="submit"
        className="h-9 self-end rounded-full bg-foreground px-4 text-sm font-medium text-background"
      >
        등록
      </button>
    </form>
  );
}

function CommentItem({
  comment,
  postId,
  path,
  me,
  canReply,
}: {
  comment: CommentRow;
  postId: string;
  path: string;
  me: Profile | null;
  canReply: boolean;
}) {
  const deleted = comment.deleted_at !== null;
  const mine = me?.id === comment.author_id;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm">
        {!deleted && comment.author?.username ? (
          <Link href={`/@${comment.author.username}`} className="font-medium">
            @{comment.author.username}
          </Link>
        ) : null}
        <span className="text-zinc-500">{formatDate(comment.created_at)}</span>
      </div>

      {deleted ? (
        <p className="text-sm text-zinc-500">삭제된 댓글입니다.</p>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-6">{comment.content}</p>
      )}

      {!deleted && (
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          {canReply && me?.username && (
            <details>
              <summary className="cursor-pointer">답글</summary>
              <div className="mt-2">
                <CommentForm
                  postId={postId}
                  path={path}
                  parentId={comment.id}
                  placeholder="답글을 입력하세요"
                />
              </div>
            </details>
          )}
          {mine && (
            <form action={deleteComment.bind(null, comment.id, path)}>
              <button type="submit" className="underline">
                삭제
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export async function Comments({
  postId,
  path,
  me,
}: {
  postId: string;
  path: string;
  postAuthorId: string;
  me: Profile | null;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("comments")
    .select(
      "id, parent_id, content, deleted_at, created_at, author_id, author:profiles!author_id(username)",
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(500)
    .overrideTypes<CommentRow[], { merge: false }>();

  const comments = data ?? [];
  const topLevel = comments.filter((c) => c.parent_id === null);
  const repliesOf = (id: string) => comments.filter((c) => c.parent_id === id);

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold">댓글</h2>

      {me?.username ? (
        <CommentForm
          postId={postId}
          path={path}
          parentId={null}
          placeholder="댓글을 입력하세요"
        />
      ) : (
        <p className="text-sm text-zinc-500">
          <Link href="/login" className="underline">
            로그인
          </Link>
          하고 댓글을 남겨보세요.
        </p>
      )}

      <ul className="flex flex-col gap-6">
        {topLevel.map((comment) => (
          <li key={comment.id} className="flex flex-col gap-4">
            <CommentItem comment={comment} postId={postId} path={path} me={me} canReply />
            {repliesOf(comment.id).length > 0 && (
              <ul className="ml-6 flex flex-col gap-4 border-l border-zinc-200 pl-4 dark:border-zinc-800">
                {repliesOf(comment.id).map((reply) => (
                  <li key={reply.id}>
                    <CommentItem
                      comment={reply}
                      postId={postId}
                      path={path}
                      me={me}
                      canReply={false}
                    />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
