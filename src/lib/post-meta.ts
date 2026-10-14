import type { JSONContent } from "@tiptap/react";

// Shared (client + server) rules for post SEO metadata.

export const SEO_LIMITS = {
  titleMin: 15,
  titleMax: 60,
  descMin: 50,
  descMax: 160,
  bodyMin: 300,
  maxTags: 5,
  tagMax: 20,
} as const;

export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .slice(0, SEO_LIMITS.tagMax);
}

export function normalizeTags(raw: string[]): string[] {
  const out: string[] = [];
  for (const item of raw) {
    const tag = normalizeTag(item);
    if (tag && !out.includes(tag)) out.push(tag);
    if (out.length === SEO_LIMITS.maxTags) break;
  }
  return out;
}

export function extractPlainText(content: JSONContent): string {
  const parts: string[] = [];
  function walk(node: JSONContent) {
    if (node.type === "text" && node.text) parts.push(node.text);
    node.content?.forEach(walk);
    if (["paragraph", "heading", "listItem", "blockquote", "codeBlock"].includes(node.type ?? "")) {
      parts.push(" ");
    }
  }
  walk(content);
  return parts.join("").replace(/\s+/g, " ").trim();
}

// Korean reads ~500 characters per minute.
export function readingMinutes(text: string): number {
  return Math.min(600, Math.max(1, Math.ceil(text.length / 500)));
}

export function autoDescription(text: string, max = 150): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

export type ContentImage = { src: string; alt: string };

export function collectImages(content: JSONContent): ContentImage[] {
  const images: ContentImage[] = [];
  function walk(node: JSONContent) {
    if (node.type === "image" && typeof node.attrs?.src === "string") {
      images.push({ src: node.attrs.src, alt: String(node.attrs.alt ?? "").trim() });
    }
    node.content?.forEach(walk);
  }
  walk(content);
  return images;
}

export function countH2(content: JSONContent): number {
  let count = 0;
  function walk(node: JSONContent) {
    if (node.type === "heading" && node.attrs?.level === 2) count++;
    node.content?.forEach(walk);
  }
  walk(content);
  return count;
}

export type PostMetaInput = {
  seoTitle: string;
  seoDescription: string;
  slug: string;
  tags: string[];
  coverImageUrl: string | null;
  coverImageAlt: string;
  indexable: boolean;
};

export type ChecklistItem = { id: string; label: string; ok: boolean };

export function buildChecklist(
  title: string,
  meta: PostMetaInput,
  content: JSONContent,
): ChecklistItem[] {
  const text = extractPlainText(content);
  const images = collectImages(content);
  const seoTitle = (meta.seoTitle || title).trim();
  const description = (meta.seoDescription || autoDescription(text)).trim();
  return [
    {
      id: "title",
      label: `검색 제목 ${SEO_LIMITS.titleMin}~${SEO_LIMITS.titleMax}자 (지금 ${seoTitle.length}자)`,
      ok: seoTitle.length >= SEO_LIMITS.titleMin && seoTitle.length <= SEO_LIMITS.titleMax,
    },
    {
      id: "desc",
      label: `설명 ${SEO_LIMITS.descMin}~${SEO_LIMITS.descMax}자 (지금 ${description.length}자)`,
      ok: description.length >= SEO_LIMITS.descMin && description.length <= SEO_LIMITS.descMax,
    },
    {
      id: "body",
      label: `본문 ${SEO_LIMITS.bodyMin}자 이상 (지금 ${text.length}자)`,
      ok: text.length >= SEO_LIMITS.bodyMin,
    },
    { id: "h2", label: "소제목(H2) 1개 이상", ok: countH2(content) >= 1 },
    {
      id: "alt",
      label:
        images.length === 0
          ? "이미지 대체 텍스트 (이미지 없음)"
          : "모든 이미지에 대체 텍스트(alt)",
      ok: images.every((i) => i.alt.length > 0),
    },
    { id: "tags", label: "태그 1개 이상", ok: meta.tags.length >= 1 },
  ];
}
