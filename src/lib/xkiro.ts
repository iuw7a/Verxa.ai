/**
 * xKiro gateway (api.xkiro.com) — OpenAI-compatible.
 * Base URL always ends with /v1, auth via `Authorization: Bearer <key>`.
 * Docs: https://docs.xkiro.com — GET /v1/models is public, chat needs a key.
 */

export const XKIRO_BASE_URL =
  process.env.XKIRO_BASE_URL?.trim().replace(/\/+$/, "") ??
  "https://api.xkiro.com/v1";

export type XkiroModelInfo = {
  id: string;
  display_name: string;
  access_tier: "free" | "paid" | "premium" | string;
  capabilities?: { vision?: boolean; tools?: boolean; reasoning?: boolean };
  context_length?: number;
};

export type XkiroUsageInfo = {
  free_used_today: number;
  free_limit_per_day: number;
  free_remaining: number;
  wallet_balance_usd: string;
  plan: string | null;
  user?: { name?: string; email?: string };
};

function serverKey(): string | null {
  const k = process.env.XKIRO_API_KEY?.trim();
  return k ? k : null;
}

export function isXkiroConfigured(): boolean {
  return Boolean(serverKey());
}

function normalizeBase(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (/\/v\d+$/.test(trimmed)) return trimmed;
  return `${trimmed}/v1`;
}

/** Server-only: list the full catalog with the configured key. */
export async function listXkiroModels(): Promise<{
  models: XkiroModelInfo[];
  usage: XkiroUsageInfo | null;
}> {
  const key = serverKey();
  if (!key) throw new Error("XKIRO_API_KEY is not configured.");
  const base = normalizeBase(
    process.env.XKIRO_BASE_URL ?? "https://api.xkiro.com/v1",
  );

  const [modelsRes, usageRes] = await Promise.all([
    fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    }),
    fetch(`${base}/usage`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    }).catch(() => null),
  ]);

  if (!modelsRes.ok) {
    const text = await modelsRes.text().catch(() => "");
    throw new Error(`xKiro models failed: HTTP ${modelsRes.status} ${text.slice(0, 160)}`);
  }
  const modelsJson = (await modelsRes.json()) as { data?: XkiroModelInfo[] };
  const models = Array.isArray(modelsJson.data) ? modelsJson.data : [];

  let usage: XkiroUsageInfo | null = null;
  if (usageRes && usageRes.ok) {
    const u = (await usageRes.json().catch(() => null)) as {
      plan?: string | null;
      free_tokens?: { used_today?: number; limit_per_day?: number; remaining?: number };
      wallet?: { balance_usd?: string };
      user?: { name?: string; email?: string };
    } | null;
    if (u) {
      usage = {
        free_used_today: u.free_tokens?.used_today ?? 0,
        free_limit_per_day: u.free_tokens?.limit_per_day ?? 0,
        free_remaining: u.free_tokens?.remaining ?? 0,
        wallet_balance_usd: u.wallet?.balance_usd ?? "0",
        plan: u.plan ?? null,
        user: u.user,
      };
    }
  }

  return { models, usage };
}

/** A model is directly usable with this key: free tier, or paid with balance. */
export function isModelUsable(
  m: XkiroModelInfo,
  usage: XkiroUsageInfo | null,
): boolean {
  if (m.access_tier === "free") return (usage?.free_remaining ?? 1) > 0;
  if (m.access_tier === "paid") {
    const bal = parseFloat(usage?.wallet_balance_usd ?? "0");
    return Number.isFinite(bal) && bal > 0;
  }
  return false; // premium needs a plan — show as locked
}
