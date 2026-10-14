import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getPublicPost } from "@/lib/public-data";
import { decodeParam } from "@/lib/utils";

const size = { width: 1200, height: 630 };

async function loadFont() {
  const file = await readFile(join(process.cwd(), "src/assets/fonts/Jua-Regular.ttf"));
  return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
}

// satori can't decode webp, so only use covers in formats it supports.
function usableCover(url: string | null) {
  return url && /\.(png|jpe?g)$/i.test(url) ? url : null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string; slug: string }> },
) {
  const { username: rawUser, slug: rawSlug } = await params;
  const username = decodeParam(rawUser).toLowerCase();
  const post = await getPublicPost(username, decodeParam(rawSlug));
  if (!post) return new Response("Not found", { status: 404 });

  const cover = usableCover(post.cover_image_url);
  const title = post.seo_title || post.title;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#FFF4E6",
          fontFamily: "Jua",
          color: "#5B3A29",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 64,
            flex: 1,
          }}
        >
          <div style={{ display: "flex", fontSize: 40, color: "#C77B3B" }}>포갠 · 속마음을 나누는 곳</div>
          <div
            style={{
              display: "flex",
              fontSize: title.length > 40 ? 56 : 72,
              lineHeight: 1.25,
              overflow: "hidden",
              maxHeight: 340,
            }}
          >
            {title.length > 70 ? `${title.slice(0, 70)}…` : title}
          </div>
          <div style={{ display: "flex", gap: 24, fontSize: 36 }}>
            <span>@{post.author.username}</span>
            {post.tags.slice(0, 3).map((t) => (
              <span key={t} style={{ color: "#C77B3B" }}>
                #{t}
              </span>
            ))}
          </div>
        </div>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" width={420} height={630} style={{ objectFit: "cover" }} />
        )}
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Jua", data: await loadFont(), style: "normal", weight: 400 }],
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
