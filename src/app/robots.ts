import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

// Private / duplicate surfaces. Post pages live at /@user/slug (the /u/ paths are internal rewrites targets).
const DISALLOW = ["/write", "/api/", "/auth/", "/login", "/u/", "/*/edit"];

// Search and user-initiated AI retrieval: allowed so posts can be found and cited.
const SEARCH_BOTS = [
  "Googlebot",
  "Yeti", // Naver
  "Bingbot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Claude-SearchBot",
  "Claude-User",
];

// Model-training crawlers: blocked (these are independent of the search bots above).
const TRAINING_BOTS = [
  "GPTBot",
  "Google-Extended",
  "ClaudeBot",
  "CCBot",
  "Applebot-Extended",
  "Bytespider",
  "meta-externalagent",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...SEARCH_BOTS.map((userAgent) => ({ userAgent, allow: "/", disallow: DISALLOW })),
      ...TRAINING_BOTS.map((userAgent) => ({ userAgent, disallow: "/" })),
      { userAgent: "*", allow: "/", disallow: DISALLOW },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
