import { renderToMarkdown } from "@tiptap/static-renderer/pm/markdown";
import { baseExtensions } from "@/lib/editor/extensions";
import { getPublicPost } from "@/lib/public-data";
import { absoluteUrl, postUrlPath } from "@/lib/site";
import { decodeParam } from "@/lib/utils";

// Markdown alternate of a post (served at /@user/slug.md) for AI agents and tools.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string; slug: string }> },
) {
  const { username: rawUser, slug: rawSlug } = await params;
  const username = decodeParam(rawUser).toLowerCase();
  const slug = decodeParam(rawSlug);
  const post = await getPublicPost(username, slug);
  if (!post || !post.indexable) return new Response("Not found", { status: 404 });

  const body = renderToMarkdown({ content: post.content, extensions: baseExtensions });
  const meta = [
    `작성자: @${username}`,
    `발행: ${post.published_at ?? post.created_at}`,
    `수정: ${post.updated_at}`,
    post.tags.length ? `태그: ${post.tags.map((t) => `#${t}`).join(" ")}` : null,
    `원문: ${absoluteUrl(postUrlPath(username, slug))}`,
  ].filter(Boolean);

  const markdown = `# ${post.title}\n\n${meta.join("  \n")}\n\n${body}\n`;
  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
