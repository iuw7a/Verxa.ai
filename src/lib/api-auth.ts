import { NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { hashApiKey, isVerxaApiKey, planLimitsFor, safeEqual } from "@/lib/api-keys";

export type ApiKeyContext = {
  keyId: string;
  userId: string;
  plan: "free" | "pro";
  limits: ReturnType<typeof planLimitsFor>;
};

export type AuthResult =
  | { ok: true; ctx: ApiKeyContext }
  | { ok: false; status: number; code: string; message: string };

function apiError(status: number, code: string, message: string) {
  return { ok: false as const, status, code, message };
}

/**
 * Resolves the caller from `Authorization: Bearer vx_live_...`.
 *
 * Two paths:
 * 1. Dashboard session (Supabase cookie) → treated as a plan-limited
 *    implicit key so the playground/usage pages work without a raw key.
 * 2. Raw API key → peppered SHA-256 hash compared against verxa_api_keys.
 *
 * Rate limiting is enforced against verxa_api_usage (requests today).
 */
export async function authenticateApiRequest(
  req: NextRequest,
): Promise<AuthResult> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!token) {
    return apiError(
      401,
      "missing_api_key",
      "Provide your key as 'Authorization: Bearer vx_live_...'. Create one at /api-keys.",
    );
  }

  // Path 1: dashboard session (no raw key needed for dashboard features).
  if (!isVerxaApiKey(token)) {
    const supabase = await createServerSupabase();
    if (!supabase) return apiError(500, "server_config", "Auth is not configured.");
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return apiError(401, "invalid_api_key", "Invalid or expired API key.");
    }
    const limits = planLimitsFor("free");
    return {
      ok: true,
      ctx: {
        keyId: `session:${data.user.id}`,
        userId: data.user.id,
        plan: "free",
        limits,
      },
    };
  }

  // Path 2: real API key.
  const admin = createAdminSupabase();
  if (!admin) {
    return apiError(500, "server_config", "Service key not configured.");
  }
  const hash = hashApiKey(token);
  const { data: row, error } = await admin
    .from("verxa_api_keys")
    .select("id,user_id,revoked_at,key_hash")
    .eq("key_hash", hash)
    .maybeSingle();

  if (error || !row) {
    return apiError(401, "invalid_api_key", "Invalid or expired API key.");
  }
  if (!safeEqual(row.key_hash, hash)) {
    return apiError(401, "invalid_api_key", "Invalid or expired API key.");
  }
  if (row.revoked_at) {
    return apiError(403, "key_revoked", "This API key has been revoked.");
  }

  // Plan lookup (pro when the user holds any pro subscription marker).
  const { data: sub } = await admin
    .from("verxa_subscriptions")
    .select("plan")
    .eq("user_id", row.user_id)
    .eq("status", "active")
    .maybeSingle();
  const plan = sub?.plan === "pro" ? "pro" : "free";
  const limits = planLimitsFor(plan);

  // Fire-and-forget last_used_at update.
  void admin
    .from("verxa_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id)
    .then(undefined, () => {});

  return {
    ok: true,
    ctx: {
      keyId: row.id,
      userId: row.user_id,
      plan,
      limits,
    },
  };
}

export function apiJson(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Records one request (+token counts) for the daily usage aggregate. */
export async function recordApiUsage(
  keyId: string,
  tokensIn = 0,
  tokensOut = 0,
) {
  if (keyId.startsWith("session:")) return;
  const admin = createAdminSupabase();
  if (!admin) return;
  const { error } = await admin.rpc("verxa_bump_api_usage", {
    p_key_id: keyId,
    p_tokens_in: tokensIn,
    p_tokens_out: tokensOut,
  });
  if (error) {
    // Fallback: read-modify-write.
    const day = new Date().toISOString().slice(0, 10);
    const { data } = await admin
      .from("verxa_api_usage")
      .select("requests,tokens_in,tokens_out")
      .eq("key_id", keyId)
      .eq("day", day)
      .maybeSingle();
    const next = {
      key_id: keyId,
      day,
      requests: (data?.requests ?? 0) + 1,
      tokens_in: (data?.tokens_in ?? 0) + tokensIn,
      tokens_out: (data?.tokens_out ?? 0) + tokensOut,
    };
    await admin
      .from("verxa_api_usage")
      .upsert(next, { onConflict: "key_id,day" });
  }
}

/** Returns requests made today for a key (for rate limiting). */
export async function requestsToday(keyId: string): Promise<number> {
  if (keyId.startsWith("session:")) return 0;
  const admin = createAdminSupabase();
  if (!admin) return 0;
  const day = new Date().toISOString().slice(0, 10);
  const { data } = await admin
    .from("verxa_api_usage")
    .select("requests")
    .eq("key_id", keyId)
    .eq("day", day)
    .maybeSingle();
  return data?.requests ?? 0;
}
