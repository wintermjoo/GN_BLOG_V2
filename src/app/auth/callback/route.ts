import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  // Only allow same-origin relative paths to prevent open redirects.
  const redirectPath = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  let reason: string;
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // New users have no username yet: send them to pick one first.
      const { data: auth } = await supabase.auth.getClaims();
      const { data: profile } = auth?.claims?.sub
        ? await supabase
            .from("profiles")
            .select("username")
            .eq("id", auth.claims.sub)
            .maybeSingle()
        : { data: null };
      const target = profile?.username ? redirectPath : "/onboarding";
      return NextResponse.redirect(`${origin}${target}`);
    }
    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
    reason = error.code ?? error.message;
  } else {
    reason =
      searchParams.get("error_code") ??
      searchParams.get("error_description") ??
      searchParams.get("error") ??
      "missing_code";
    console.error("[auth/callback] missing code:", reason);
  }

  const errorUrl = new URL("/auth/auth-code-error", origin);
  errorUrl.searchParams.set("reason", reason);
  return NextResponse.redirect(errorUrl);
}
