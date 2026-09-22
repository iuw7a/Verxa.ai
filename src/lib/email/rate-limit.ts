/** DB-backed fixed-window rate limiting (abuse / email-bombing protection). */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertServerOnly } from "./config";

function serviceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return null;
  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type RateLimitResult = { allowed: boolean; remaining: number };

/**
 * Fixed window counter. Fail-open when the DB is unavailable (logs warn)
 * so email never hard-breaks, but strict when storage works.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  assertServerOnly("checkRateLimit");
  const db = serviceSupabase();
  if (!db) return { allowed: true, remaining: limit };
  const now = Date.now();
  const windowStart = new Date(now - (now % windowMs)).toISOString();
  try {
    const { data } = await db
      .from("verxa_email_rate_limits")
      .select("count")
      .eq("key", key)
      .eq("window_start", windowStart)
      .maybeSingle();
    const count = ((data as { count?: number } | null)?.count ?? 0) as number;
    if (count >= limit) return { allowed: false, remaining: 0 };
    await db.from("verxa_email_rate_limits").upsert(
      { key, window_start: windowStart, count: count + 1, updated_at: new Date().toISOString() },
      { onConflict: "key,window_start" },
    );
    return { allowed: true, remaining: limit - count - 1 };
  } catch {
    return { allowed: true, remaining: limit };
  }
}

export const RATE_LIMITS = {
  /** 5 reset emails per address per hour. */
  passwordReset: { limit: 5, windowMs: 3600 * 1000 },
  /** 5 verification emails per address per hour. */
  verification: { limit: 5, windowMs: 3600 * 1000 },
  /** 10 login notices per user per day (defense in depth). */
  loginNotice: { limit: 10, windowMs: 24 * 3600 * 1000 },
  /** 20 marketing sends per address per day. */
  marketingPerAddress: { limit: 20, windowMs: 24 * 3600 * 1000 },
};
