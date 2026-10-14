import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The per-post OG image reads the Jua font from disk at runtime.
  outputFileTracingIncludes: {
    "/u/[username]/[slug]/og": ["./src/assets/fonts/**/*"],
  },
  images: {
    remotePatterns: [
      ...(supabaseHost
        ? [
            new URL(
              `https://${supabaseHost}/storage/v1/object/public/post-images/**`,
            ),
          ]
        : []),
    ],
  },
  // A folder named "@..." is a parallel-route slot in the App Router,
  // so "/@name" URLs are served from /u/[username].
  async rewrites() {
    return [
      // Markdown alternate of a post: /@user/slug.md
      { source: "/@:username/:slug.md", destination: "/u/:username/:slug/md" },
      { source: "/@:username", destination: "/u/:username" },
      { source: "/@:username/:path*", destination: "/u/:username/:path*" },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
