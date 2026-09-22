/**
 * Secure tokens for verification, password reset (DB-backed, hashed,
 * single-use, expiring) and unsubscribe (stateless HMAC).
 *
 * Raw tokens are NEVER logged and never stored — only SHA-256 hashes.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertServerOnly } from "./config";

export type TokenPurpose = "verify_email" | "reset_password" | "email_change";

const TOKEN_TTL: Record<TokenPurpose, number> = {
  verify_email: 24 * 3600 * 1000,
  reset_password: 3600 * 1000,
  email_change: 24 * 3600 * 1000,
};

function serviceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return null;
  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/** Create a single-use token; returns the RAW token (send it, never store). */
export async function createEmailToken(opts: {
  purpose: TokenPurpose;
  userId?: string | null;
  email: string;
  meta?: Record<string, unknown>;
}): Promise<{ token: string; expiresAt: string } | null> {
  assertServerOnly("createEmailToken");
  const db = serviceSupabase();
  if (!db) return null;
  const raw = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL[opts.purpose]).toISOString();
  try {
    // Invalidate older unused tokens of the same purpose (rotation).
    await db
      .from("verxa_email_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("email", opts.email.trim().toLowerCase())
      .eq("purpose", opts.purpose)
      .is("used_at", null);
    const { error } = await db.from("verxa_email_tokens").insert({
      user_id: opts.userId ?? null,
      email: opts.email.trim().toLowerCase(),
      purpose: opts.purpose,
      token_hash: hashToken(raw),
      expires_at: expiresAt,
      meta: opts.meta ?? {},
    });
    if (error) return null;
    return { token: raw, expiresAt };
  } catch {
    return null;
  }
}

export type ConsumedToken = {
  userId: string | null;
  email: string;
  meta: Record<string, unknown>;
};

/**
 * Verify + atomically consume a token. Returns the record, or an error
 * code: "invalid" | "expired" | "used". Generic callers should map all
 * three to the same user-facing message where enumeration matters.
 */
export async function consumeEmailToken(
  purpose: TokenPurpose,
  raw: string,
): Promise<{ ok: true; token: ConsumedToken } | { ok: false; code: "invalid" | "expired" | "used" }> {
  assertServerOnly("consumeEmailToken");
  const db = serviceSupabase();
  if (!db || !raw) return { ok: false, code: "invalid" };
  const digest = hashToken(raw);
  try {
    const { data } = await db
      .from("verxa_email_tokens")
      .select("id,user_id,email,expires_at,used_at,meta")
      .eq("purpose", purpose)
      .eq("token_hash", digest)
      .maybeSingle();
    if (!data) return { ok: false, code: "invalid" };
    const row = data as {
      id: string;
      user_id: string | null;
      email: string;
      expires_at: string;
      used_at: string | null;
      meta: Record<string, unknown>;
    };
    if (row.used_at) return { ok: false, code: "used" };
    if (new Date(row.expires_at).getTime() < Date.now())
      return { ok: false, code: "expired" };
    // Atomic single-use: only mark when still unused.
    const { data: claimed } = await db
      .from("verxa_email_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", row.id)
      .is("used_at", null)
      .select("id");
    if (!claimed || (claimed as unknown[]).length === 0)
      return { ok: false, code: "used" };
    return {
      ok: true,
      token: { userId: row.user_id, email: row.email, meta: row.meta ?? {} },
    };
  } catch {
    return { ok: false, code: "invalid" };
  }
}

/** Peek without consuming (to choose expired-vs-invalid UX). */
export async function peekEmailToken(
  purpose: TokenPurpose,
  raw: string,
): Promise<"valid" | "invalid" | "expired" | "used"> {
  assertServerOnly("peekEmailToken");
  const db = serviceSupabase();
  if (!db || !raw) return "invalid";
  try {
    const { data } = await db
      .from("verxa_email_tokens")
      .select("expires_at,used_at")
      .eq("purpose", purpose)
      .eq("token_hash", hashToken(raw))
      .maybeSingle();
    if (!data) return "invalid";
    const row = data as { expires_at: string; used_at: string | null };
    if (row.used_at) return "used";
    if (new Date(row.expires_at).getTime() < Date.now()) return "expired";
    return "valid";
  } catch {
    return "invalid";
  }
}

function hmacKey(): string | null {
  // Reuses the existing server-side encryption secret; never exposed.
  const k = process.env.INTEGRATION_ENCRYPTION_KEY?.trim();
  return k || null;
}

const B64URL = /^[A-Za-z0-9_-]+$/;

/** Stateless unsubscribe token: `<payloadB64>.<sig>` (no DB row). */
export function signUnsubscribe(email: string, userId?: string | null): string | null {
  assertServerOnly("signUnsubscribe");
  const key = hmacKey();
  if (!key) return null;
  const payload = JSON.stringify({
    v: 1,
    e: email.trim().toLowerCase(),
    u: userId ?? null,
    // 2-year validity; actual opt-out is permanent once applied.
    exp: Date.now() + 1000 * 86400 * 365 * 2,
  });
  const payloadB64 = Buffer.from(payload, "utf8").toString("base64url");
  const sig = createHmac("sha256", key).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sig}`;
}

/** Verify an unsubscribe token; returns email+userId or null. */
export function verifyUnsubscribe(
  token: string,
): { email: string; userId: string | null } | null {
  assertServerOnly("verifyUnsubscribe");
  const key = hmacKey();
  if (!key || !token || token.length > 500) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!B64URL.test(payloadB64) || !B64URL.test(sig)) return null;
  const expected = createHmac("sha256", key).update(payloadB64).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  try {
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as { v?: number; e?: string; u?: string | null; exp?: number };
    if (payload.v !== 1 || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now()) return null;
    const email = String(payload.e ?? "").toLowerCase();
    if (!email.includes("@")) return null;
    return { email, userId: payload.u ?? null };
  } catch {
    return null;
  }
}
