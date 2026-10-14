import { createServerClient } from "@supabase/ssr";
import { io } from "next/cache";
import { cookies } from "next/headers";

// Create a new client per request; never share one across requests.
export async function createClient() {
  const cookieStore = await cookies();
  // The client reads Date.now() as soon as it's constructed, which Cache Components can't prerender.
  await io();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components can't set cookies; the proxy refreshes the session instead.
          }
        },
      },
    },
  );
}
