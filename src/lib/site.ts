export const SITE_NAME = "포갠";
export const SITE_TAGLINE = "속마음을 안전하게 나누는 익명 블로그";
export const SITE_DESCRIPTION =
  "이불 속처럼 포근한 공간에서 속마음을 안전하게 털어놓으세요. 포갠은 서로의 이야기에 따뜻하게 공감하는 익명 블로그입니다.";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://gn-blog-v2-zeta.vercel.app"
).replace(/\/$/, "");

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function postUrlPath(username: string, slug: string): string {
  return `/@${username}/${encodeURIComponent(slug)}`;
}
