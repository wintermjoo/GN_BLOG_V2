import type { JSONContent } from "@tiptap/react";

export type TocItem = { id: string; level: number; text: string };

function textOf(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(textOf).join("");
}

// Heading ids are positional, so the TOC and the renderer agree without storing ids in the document.
export function extractToc(content: JSONContent): TocItem[] {
  const items: TocItem[] = [];
  function walk(node: JSONContent) {
    if (node.type === "heading") {
      const text = textOf(node).trim();
      if (text) items.push({ id: `section-${items.length + 1}`, level: node.attrs?.level ?? 2, text });
      return;
    }
    node.content?.forEach(walk);
  }
  walk(content);
  return items;
}
