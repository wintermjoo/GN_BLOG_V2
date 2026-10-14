"use client";

import type { JSONContent } from "@tiptap/react";
import { useState } from "react";
import {
  autoDescription,
  buildChecklist,
  collectImages,
  extractPlainText,
  normalizeTag,
  SEO_LIMITS,
  type PostMetaInput,
} from "@/lib/post-meta";
import { SITE_NAME } from "@/lib/site";
import { slugify } from "@/lib/utils";

export type { PostMetaInput };

function Counter({ value, min, max }: { value: number; min: number; max: number }) {
  const ok = value === 0 || (value >= min && value <= max);
  return (
    <span className={`text-xs ${ok ? "text-zinc-500" : "text-amber-700"}`}>
      {value}/{max}
    </span>
  );
}

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700";

export function PublishPanel({
  title,
  content,
  meta,
  onChange,
  username,
  slugLocked,
}: {
  title: string;
  content: JSONContent;
  meta: PostMetaInput;
  onChange: (next: PostMetaInput) => void;
  username: string;
  slugLocked: boolean;
}) {
  const [tagDraft, setTagDraft] = useState("");
  const set = (patch: Partial<PostMetaInput>) => onChange({ ...meta, ...patch });

  const text = extractPlainText(content);
  const images = collectImages(content);
  const summary = autoDescription(text);
  const shownTitle = (meta.seoTitle || title || "제목").trim();
  const shownDesc = (meta.seoDescription || summary || "본문을 쓰면 설명이 자동으로 만들어져요.").trim();
  const slugPreview = meta.slug || slugify(title || "post");
  const cover = images.find((i) => i.src === meta.coverImageUrl) ?? images[0] ?? null;
  const checklist = buildChecklist(title, meta, content);
  const doneCount = checklist.filter((c) => c.ok).length;

  function addTag(raw: string) {
    const tag = normalizeTag(raw);
    if (!tag || meta.tags.includes(tag) || meta.tags.length >= SEO_LIMITS.maxTags) {
      setTagDraft("");
      return;
    }
    set({ tags: [...meta.tags, tag] });
    setTagDraft("");
  }

  return (
    <details open className="rounded-xl border border-zinc-300 dark:border-zinc-700">
      <summary className="cursor-pointer select-none px-4 py-3 font-medium">
        발행 설정 · 검색/공유 미리보기{" "}
        <span className="ml-2 text-xs font-normal text-zinc-500">
          체크 {doneCount}/{checklist.length}
        </span>
      </summary>

      <div className="flex flex-col gap-6 border-t border-zinc-300 p-4 dark:border-zinc-700">
        <label className="flex items-start justify-between gap-4">
          <span>
            <span className="block text-sm font-medium">검색 엔진·AI 검색에 노출</span>
            <span className="block text-xs text-zinc-500">
              끄면 검색 결과, 사이트맵, 피드에서 빠지고 noindex가 적용돼요. (링크를 아는 사람은 볼 수 있어요)
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={meta.indexable}
            onChange={(e) => set({ indexable: e.target.checked })}
            className="mt-1 h-5 w-5 accent-amber-700"
          />
        </label>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between">
            <label htmlFor="seo-title" className="text-sm font-medium">
              검색 제목
            </label>
            <Counter value={meta.seoTitle.length} min={SEO_LIMITS.titleMin} max={SEO_LIMITS.titleMax} />
          </div>
          <input
            id="seo-title"
            value={meta.seoTitle}
            maxLength={SEO_LIMITS.titleMax}
            placeholder={title || "비워두면 글 제목을 사용해요"}
            onChange={(e) => set({ seoTitle: e.target.value })}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between">
            <label htmlFor="seo-desc" className="text-sm font-medium">
              설명 (요약)
            </label>
            <Counter value={meta.seoDescription.length} min={SEO_LIMITS.descMin} max={SEO_LIMITS.descMax} />
          </div>
          <textarea
            id="seo-desc"
            value={meta.seoDescription}
            maxLength={SEO_LIMITS.descMax}
            rows={3}
            placeholder="비워두면 본문 앞부분으로 자동 생성돼요"
            onChange={(e) => set({ seoDescription: e.target.value })}
            className={inputClass}
          />
          <button
            type="button"
            disabled={!summary}
            onClick={() => set({ seoDescription: summary.slice(0, SEO_LIMITS.descMax) })}
            className="self-start text-xs text-amber-800 underline disabled:opacity-40"
          >
            본문에서 자동 요약 채우기
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="slug" className="text-sm font-medium">
            글 주소
          </label>
          <div className="flex items-center gap-1 text-sm text-zinc-500">
            <span>@{username}/</span>
            <input
              id="slug"
              value={meta.slug}
              maxLength={80}
              disabled={slugLocked}
              placeholder="비워두면 제목으로 자동 생성"
              onChange={(e) => set({ slug: e.target.value })}
              className={inputClass}
            />
          </div>
          <span className="text-xs text-zinc-500">
            {slugLocked
              ? "발행된 글의 주소는 바꾸면 기존 링크가 끊겨서 잠겨 있어요."
              : `주소 미리보기: /@${username}/${slugPreview}`}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <label htmlFor="tag-input" className="text-sm font-medium">
              태그
            </label>
            <span className="text-xs text-zinc-500">
              {meta.tags.length}/{SEO_LIMITS.maxTags}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {meta.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-900"
              >
                #{tag}
                <button
                  type="button"
                  aria-label={`${tag} 태그 삭제`}
                  onClick={() => set({ tags: meta.tags.filter((t) => t !== tag) })}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            id="tag-input"
            value={tagDraft}
            disabled={meta.tags.length >= SEO_LIMITS.maxTags}
            placeholder="태그를 입력하고 Enter"
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag(tagDraft);
              }
            }}
            onBlur={() => tagDraft && addTag(tagDraft)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">대표 이미지</span>
          {images.length === 0 ? (
            <p className="text-xs text-zinc-500">본문에 이미지를 넣으면 대표 이미지를 고를 수 있어요.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {images.map((img) => (
                  <button
                    key={img.src}
                    type="button"
                    onClick={() => set({ coverImageUrl: img.src })}
                    aria-pressed={cover?.src === img.src}
                    className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${
                      cover?.src === img.src ? "border-amber-700" : "border-transparent"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.src} alt={img.alt} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
              <input
                value={meta.coverImageAlt}
                maxLength={200}
                placeholder={cover?.alt || "대표 이미지 설명 (alt)"}
                onChange={(e) => set({ coverImageAlt: e.target.value })}
                className={inputClass}
                aria-label="대표 이미지 설명"
              />
            </>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-white p-3 text-sm dark:bg-zinc-900">
            <p className="mb-2 text-xs text-zinc-500">Google 검색 미리보기</p>
            <p className="truncate text-xs text-zinc-600">
              {SITE_NAME} › @{username} › {slugPreview}
            </p>
            <p className="truncate text-lg text-blue-700">{shownTitle}</p>
            <p className="line-clamp-2 text-zinc-600">{shownDesc}</p>
          </div>
          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
            <p className="px-3 pt-3 text-xs text-zinc-500">공유(카카오톡 등) 미리보기</p>
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover.src} alt="" className="mt-2 aspect-[1.91/1] w-full object-cover" />
            ) : (
              <div className="mt-2 flex aspect-[1.91/1] items-center justify-center bg-amber-100 text-sm text-amber-900">
                자동 생성 이미지가 사용돼요
              </div>
            )}
            <div className="p-3">
              <p className="truncate font-medium">{shownTitle}</p>
              <p className="line-clamp-2 text-xs text-zinc-500">{shownDesc}</p>
            </div>
          </div>
        </div>

        <ul className="flex flex-col gap-1 text-sm" aria-label="SEO 체크리스트">
          {checklist.map((item) => (
            <li key={item.id} className={item.ok ? "text-green-700" : "text-zinc-500"}>
              {item.ok ? "✓" : "○"} {item.label}
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
