import type { MetadataRoute } from "next";
import {
  getTagCounts,
  listIndexablePosts,
  listPublicProfilesWithPosts,
} from "@/lib/public-data";
import { absoluteUrl, postUrlPath } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, profiles, tags] = await Promise.all([
    listIndexablePosts({ limit: 1000 }),
    listPublicProfilesWithPosts(),
    getTagCounts(),
  ]);

  return [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    ...posts.map((post) => ({
      url: absoluteUrl(postUrlPath(post.author.username, post.slug)),
      lastModified: post.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...profiles.map((p) => ({
      url: absoluteUrl(`/@${p.username}`),
      lastModified: p.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...tags.map((t) => ({
      url: absoluteUrl(`/tags/${encodeURIComponent(t.tag)}`),
      changeFrequency: "weekly" as const,
      priority: 0.4,
    })),
  ];
}
