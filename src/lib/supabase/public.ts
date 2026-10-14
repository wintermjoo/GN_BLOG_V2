import { createClient } from "@supabase/supabase-js";

// Cookie-less client for public, cacheable reads (anonymous role only; RLS still applies).
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
