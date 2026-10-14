import type { JSONContent } from "@tiptap/react";
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import { createElement } from "react";
import { baseExtensions } from "@/lib/editor/extensions";

function textOf(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(textOf).join("");
}

// Renders stored Tiptap JSON straight to React elements (no HTML string injection).
// Headings get positional ids (section-1, section-2, ...) matching extractToc().
export function PostContent({ content }: { content: JSONContent }) {
  let index = 0;
  return (
    <div className="rich-content">
      {renderToReactElement({
        content,
        extensions: baseExtensions,
        options: {
          nodeMapping: {
            heading: ({ node, children }) => {
              const level = node.attrs?.level === 3 ? 3 : 2;
              const hasText = textOf(node as unknown as JSONContent).trim().length > 0;
              const id = hasText ? `section-${++index}` : undefined;
              return createElement(`h${level}`, { id }, children);
            },
          },
        },
      })}
    </div>
  );
}
