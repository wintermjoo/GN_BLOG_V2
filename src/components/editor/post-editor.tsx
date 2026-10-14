"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, type Editor, type JSONContent } from "@tiptap/react";
import { useRef, useState, useTransition } from "react";
import { baseExtensions } from "@/lib/editor/extensions";
import { createClient } from "@/lib/supabase/client";

export type PostEditorSubmit = (input: {
  title: string;
  content: JSONContent;
  status: "draft" | "published";
}) => Promise<{ error?: string } | void>;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

async function uploadImage(file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("JPG, PNG, WEBP, GIF 이미지만 올릴 수 있습니다.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("이미지는 5MB 이하만 올릴 수 있습니다.");
  }

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) throw new Error("로그인이 필요합니다.");

  const ext = file.type.split("/")[1];
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("post-images")
    .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) throw new Error("이미지를 업로드하지 못했습니다.");

  return supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl;
}

function ToolbarButton({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded px-2 py-1 text-sm hover:bg-zinc-200 disabled:opacity-40 dark:hover:bg-zinc-800 ${
        active ? "bg-zinc-200 font-semibold dark:bg-zinc-800" : ""
      }`}
    >
      {label}
    </button>
  );
}

export function PostEditor({
  initialTitle = "",
  initialContent,
  onSubmit,
  submitLabels = { draft: "임시저장", published: "발행" },
}: {
  initialTitle?: string;
  initialContent?: JSONContent;
  onSubmit: PostEditorSubmit;
  submitLabels?: { draft: string; published: string };
}) {
  const [title, setTitle] = useState(initialTitle);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);

  async function insertImages(files: File[]) {
    setError(null);
    setUploading(true);
    try {
      for (const file of files) {
        const src = await uploadImage(file);
        editorRef.current?.chain().focus().setImage({ src }).run();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "이미지를 올리지 못했습니다.");
    } finally {
      setUploading(false);
    }
  }

  const editor = useEditor({
    extensions: [
      ...baseExtensions,
      Placeholder.configure({ placeholder: "내용을 입력하세요..." }),
    ],
    content: initialContent,
    immediatelyRender: false,
    onCreate: ({ editor }) => {
      editorRef.current = editor;
    },
    editorProps: {
      attributes: {
        class: "rich-content min-h-[360px] px-4 py-3 outline-none",
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (files.length === 0) return false;
        void insertImages(files);
        return true;
      },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (files.length === 0) return false;
        event.preventDefault();
        void insertImages(files);
        return true;
      },
    },
  });

  function setLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("링크 주소", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function submit(status: "draft" | "published") {
    if (!editor) return;
    setError(null);
    if (!title.trim()) {
      setError("제목을 입력해 주세요.");
      return;
    }
    if (status === "published" && editor.isEmpty) {
      setError("본문을 입력해 주세요.");
      return;
    }
    startTransition(async () => {
      // ProseMirror attrs are null-prototype objects, which React can't send to a Server Action
      // (they arrive as empty client references). Round-trip through JSON to get plain objects.
      const content: JSONContent = JSON.parse(JSON.stringify(editor.getJSON()));
      const result = await onSubmit({ title, content, status });
      if (result?.error) setError(result.error);
    });
  }

  const busy = pending || uploading;

  return (
    <div className="flex w-full flex-col gap-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목"
        maxLength={200}
        className="bg-transparent text-3xl font-bold outline-none"
      />

      <div className="rounded-lg border border-zinc-300 dark:border-zinc-700">
        <div className="flex flex-wrap gap-1 border-b border-zinc-300 p-2 dark:border-zinc-700">
          <ToolbarButton
            label="H2"
            active={editor?.isActive("heading", { level: 2 })}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          />
          <ToolbarButton
            label="H3"
            active={editor?.isActive("heading", { level: 3 })}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          />
          <ToolbarButton
            label="굵게"
            active={editor?.isActive("bold")}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            label="기울임"
            active={editor?.isActive("italic")}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          />
          <ToolbarButton
            label="목록"
            active={editor?.isActive("bulletList")}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          />
          <ToolbarButton
            label="번호"
            active={editor?.isActive("orderedList")}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          />
          <ToolbarButton
            label="인용"
            active={editor?.isActive("blockquote")}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          />
          <ToolbarButton
            label="코드"
            active={editor?.isActive("codeBlock")}
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          />
          <ToolbarButton
            label="링크"
            active={editor?.isActive("link")}
            onClick={setLink}
          />
          <ToolbarButton
            label={uploading ? "업로드 중..." : "이미지"}
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
          />
          <input
            ref={fileInput}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (files.length) void insertImages(files);
            }}
          />
        </div>
        <EditorContent editor={editor} />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => submit("draft")}
          className="h-11 rounded-full border border-zinc-300 px-6 font-medium disabled:opacity-50 dark:border-zinc-700"
        >
          {submitLabels.draft}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit("published")}
          className="h-11 rounded-full bg-foreground px-6 font-medium text-background disabled:opacity-50"
        >
          {submitLabels.published}
        </button>
      </div>
    </div>
  );
}
