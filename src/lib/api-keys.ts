import { createHash, randomBytes, timingSafeEqual } from "crypto";

/**
 * Verxa API keys — format: `vx_live_<43 url-safe chars>`
 * Only a SHA-256 hash (peppered with SERVER_SECRET) is persisted; the raw
 * key exists exactly once — in the response of the create call.
 */

const PREFIX = "vx_live_";
const KEY_LENGTH = 32; // → 43 base64url chars

function pepper() {
  return process.env.API_KEY_PEPPER ?? process.env.SERVER_SECRET ?? "verxa-dev-pepper";
}

/** Generates a fresh raw key. Show once, then hash. */
export function generateApiKey(): string {
  return PREFIX + randomBytes(KEY_LENGTH).toString("base64url");
}

export function isVerxaApiKey(value: string): boolean {
  return value.startsWith(PREFIX) && value.length >= 40;
}

/** SHA-256 (key + server pepper). Stored in verxa_api_keys.key_hash. */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(`${rawKey}${pepper()}`).digest("hex");
}

/** Display prefix, e.g. `vx_live_7Kq2…` */
export function keyDisplayPrefix(rawKey: string): string {
  return rawKey.slice(0, PREFIX.length + 4);
}

/** Constant-time comparison of two hashes. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function maskKey(prefix: string): string {
  return `${prefix}${"•".repeat(12)}`;
}

/** Plan limits: how many active keys a plan may hold + rate limits. */
export const PLAN_LIMITS = {
  free: { maxKeys: 1, requestsPerMinute: 10, requestsPerDay: 200 },
  pro: { maxKeys: 100, requestsPerMinute: 120, requestsPerDay: 20_000 },
} as const;

export type PlanId = keyof typeof PLAN_LIMITS;

export function planLimitsFor(plan: string | null | undefined) {
  return PLAN_LIMITS[(plan ?? "free") as PlanId] ?? PLAN_LIMITS.free;
}
