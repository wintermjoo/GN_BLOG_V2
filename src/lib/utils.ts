export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return base || "post";
}

export function makeSlug(title: string): string {
  return `${slugify(title)}-${crypto.randomUUID().slice(0, 6)}`;
}

// Route params may arrive percent-encoded (e.g. Korean slugs).
export function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function postPath(username: string, slug: string): string {
  return `/@${username}/${encodeURIComponent(slug)}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(new Date(iso));
}
