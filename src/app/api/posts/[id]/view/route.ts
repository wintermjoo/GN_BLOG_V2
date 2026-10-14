import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const VIEWER_COOKIE = "viewer_id";

// Counts one view per viewer per day (deduplication happens in record_post_view()).
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;

  let anonId = request.cookies.get(VIEWER_COOKIE)?.value;
  const isNewAnon = !userId && !anonId;
  if (isNewAnon) anonId = crypto.randomUUID();

  const viewerKey = userId ? `u:${userId}` : `a:${anonId}`;
  await supabase.rpc("record_post_view", { p_post_id: id, p_viewer_key: viewerKey });

  const response = NextResponse.json({ ok: true });
  if (isNewAnon && anonId) {
    response.cookies.set(VIEWER_COOKIE, anonId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}
