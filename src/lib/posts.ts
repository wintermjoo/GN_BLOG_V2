export const PAGE_SIZE = 10;

export const POST_CARD_SELECT =
  "id, slug, title, excerpt, cover_image_url, status, published_at, created_at, view_count, like_count, comment_count, author:profiles!author_id(username)";

export type PostCardData = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_image_url: string | null;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  author: { username: string | null } | null;
};

export function parsePage(value: string | string[] | undefined): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : 1;
}

export function pageRange(page: number) {
  const from = (page - 1) * PAGE_SIZE;
  return { from, to: from + PAGE_SIZE - 1 };
}
