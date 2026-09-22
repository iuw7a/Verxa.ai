import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Emails allowed into the admin surfaces (dashboard + /mobile).
 * Extend via ADMIN_EMAILS env var (comma-separated) — never expose this list
 * to the client; every gate re-verifies server-side.
 */
export const ADMIN_EMAILS = (
  process.env.ADMIN_EMAILS || "admin@verxta.de"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | null | undefined) {
  return Boolean(email && ADMIN_EMAILS.includes(email.toLowerCase()));
}

/** Service-role client: bypasses RLS. Server-side only, never exposed. */
export function createAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return null;
  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Returns the service client if (and only if) the caller is an admin. */
export async function requireAdmin() {
  const supabase = await createServerSupabase();
  if (!supabase) {
    return {
      error: NextResponse.json(
        { error: "Auth not configured." },
        { status: 500 },
      ),
    } as const;
  }
  const { data } = await supabase.auth.getUser();
  if (!isAdminEmail(data.user?.email)) {
    return {
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    } as const;
  }
  const admin = createAdminSupabase();
  if (!admin) {
    return {
      error: NextResponse.json(
        { error: "Service key not configured." },
        { status: 500 },
      ),
    } as const;
  }
  return { admin, userId: data.user!.id } as const;
}
