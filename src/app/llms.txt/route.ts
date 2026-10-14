import { getTagCounts, listIndexablePosts } from "@/lib/public-data";
import { absoluteUrl, postUrlPath, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export async function GET() {
  const [posts, tags] = await Promise.all([
    listIndexablePosts({ limit: 50 }),
    getTagCounts(),
  ]);

  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_TAGLINE}. ${SITE_DESCRIPTION}`,
    "",
    "모든 글은 작성자가 직접 공개한 익명 글이며, 작성자는 `@닉네임`으로만 표기됩니다. 각 글은 `.md` 주소로 마크다운 원문을 제공합니다.",
    "",
    "## 최신 글",
    "",
    ...posts.map((p) => {
      const url = absoluteUrl(`${postUrlPath(p.author.username, p.slug)}.md`);
      const summary = (p.seo_description || p.excerpt).replace(/\s+/g, " ").trim();
      return `- [${p.title.replace(/[[\]]/g, "")}](${url}): ${summary}`;
    }),
    "",
    "## 주제(태그)",
    "",
    ...tags.slice(0, 30).map((t) => `- [#${t.tag}](${absoluteUrl(`/tags/${encodeURIComponent(t.tag)}`)}): ${t.count}개의 글`),
    "",
    "## Optional",
    "",
    `- [RSS 피드](${absoluteUrl("/feed.xml")})`,
    `- [사이트맵](${absoluteUrl("/sitemap.xml")})`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
