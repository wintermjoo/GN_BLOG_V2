import type { JSONContent } from "@tiptap/react";
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import { baseExtensions } from "@/lib/editor/extensions";

// Renders stored Tiptap JSON straight to React elements (no HTML string injection).
export function PostContent({ content }: { content: JSONContent }) {
  return (
    <div className="rich-content">
      {renderToReactElement({ content, extensions: baseExtensions })}
    </div>
  );
}
