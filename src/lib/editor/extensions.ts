import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";

// Single source of truth: the editor and the read-only renderer must use the same list,
// otherwise saved content could render differently from what the author saw.
export const baseExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    link: {
      openOnClick: false,
      autolink: true,
      HTMLAttributes: {
        rel: "noopener noreferrer nofollow",
        target: "_blank",
      },
    },
  }),
  Image.configure({ HTMLAttributes: { loading: "lazy" } }),
];
