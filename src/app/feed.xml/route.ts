import { listIndexablePosts } from "@/lib/public-data";
import { absoluteUrl, postUrlPath, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  const posts = await listIndexablePosts({ limit: 50 });

  const items = posts
    .map((p) => {
      const url = absoluteUrl(postUrlPath(p.author.username, p.slug));
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${esc(url)}</link>
      <guid isPermaLink="true">${esc(url)}</guid>
      <pubDate>${new Date(p.published_at ?? p.updated_at).toUTCString()}</pubDate>
      <author>@${esc(p.author.username)}</author>
      <description>${esc(p.seo_description || p.excerpt)}</description>
${p.tags.map((t) => `      <category>${esc(t)}</category>`).join("\n")}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(SITE_NAME)}</title>
    <link>${esc(absoluteUrl("/"))}</link>
    <description>${esc(SITE_DESCRIPTION)}</description>
    <language>ko</language>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
