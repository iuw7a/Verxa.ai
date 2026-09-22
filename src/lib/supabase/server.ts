import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

export async function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  // Mobile clients (Expo app) authenticate with a Supabase access token in
  // the Authorization header — accept it before falling back to cookies.
  try {
    const h = await headers();
    const auth = h.get("authorization");
    if (auth?.toLowerCase().startsWith("bearer ")) {
      const token = auth.slice(7).trim();
      if (token) {
        return createServerClient(url, key, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          cookies: {
            getAll: () => [],
            setAll: () => {
              /* token auth — no cookie writes */
            },
          },
        });
      }
    }
  } catch {
    /* headers() unavailable in this context — fall through to cookies */
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
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
          /* Server Component — middleware refreshes sessions */
        }
      },
    },
  });
}
