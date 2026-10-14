import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  // Only allow same-origin relative paths to prevent open redirects.
  const redirectPath = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
  } else {
    console.error(
      "[auth/callback] missing code:",
      searchParams.get("error_description") ?? searchParams.get("error"),
    );
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
