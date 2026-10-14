import type { JSONContent } from "@tiptap/react";

const MAX_NODES = 5000;

function storagePrefix() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return url ? `${url}/storage/v1/object/public/post-images/` : null;
}

// Server-side cleanup of untrusted editor JSON: only images stored in our own bucket are kept,
// and the document size is capped.
export function sanitizeContent(content: JSONContent): JSONContent | null {
  const prefix = storagePrefix();
  let count = 0;

  function walk(node: JSONContent): JSONContent | null {
    if (++count > MAX_NODES) return null;
    if (node.type === "image") {
      const src = node.attrs?.src;
      if (typeof src !== "string" || !prefix || !src.startsWith(prefix)) return null;
      return { type: "image", attrs: { src, alt: String(node.attrs?.alt ?? "") } };
    }
    if (!node.content) return node;
    const children = node.content
      .map(walk)
      .filter((child): child is JSONContent => child !== null);
    return { ...node, content: children };
  }

  if (content?.type !== "doc") return null;
  return walk(content);
}

export function extractText(content: JSONContent): string {
  const parts: string[] = [];
  function walk(node: JSONContent) {
    if (node.type === "text" && node.text) parts.push(node.text);
    node.content?.forEach(walk);
    if (node.type === "paragraph" || node.type === "heading") parts.push(" ");
  }
  walk(content);
  return parts.join("").replace(/\s+/g, " ").trim();
}

export function extractFirstImage(content: JSONContent): string | null {
  let found: string | null = null;
  function walk(node: JSONContent) {
    if (found) return;
    if (node.type === "image" && typeof node.attrs?.src === "string") {
      found = node.attrs.src;
      return;
    }
    node.content?.forEach(walk);
  }
  walk(content);
  return found;
}
