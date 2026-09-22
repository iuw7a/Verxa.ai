/**
 * Verxa AI — shared server-side config.
 *
 * SECURITY: this module reads XKIRO_API_KEY and must only ever be imported
 * by server code (route handlers / server actions). It throws if bundled
 * for the browser so the key can never leak to the client.
 */

if (typeof window !== "undefined") {
  throw new Error(
    "[ai-config] server-only module imported in browser — refusing to load.",
  );
}

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (/\/v\d+$/.test(trimmed)) return trimmed;
  return `${trimmed}/v1`;
}

export function xkiroBaseUrl(): string {
  return normalizeBaseUrl(
    process.env.XKIRO_BASE_URL ?? "https://api.xkiro.com/v1",
  );
}

export function xkiroApiKey(): string | undefined {
  return process.env.XKIRO_API_KEY?.trim() || undefined;
}

/**
 * Active chat model for the /ai assistant.
 * Benchmarked 2026-09-21 against the live XKiro catalog (free tier):
 * - mistralai/ministral-3b ........ ~650ms but NO reasoning
 * - mistralai/mistral-small-2603 .. ~830ms, vision + tools + reasoning, 256k ctx
 * - qwen flash models ............. ~2.9s
 * - minimax highspeed ............. ~3.2–4.0s
 * mistral-small-2603 is the fastest model with vision + tools + reasoning,
 * which the diabetes assistant needs (meal/glucose-meter photos, memory use).
 * Override with XKIRO_MODEL (server env only).
 */
export function aiModel(): string {
  return process.env.XKIRO_MODEL?.trim() || "mistralai/mistral-small-2603";
}

/** Fallbacks if the primary model is unavailable (same gateway, free tier). */
export function aiModelFallbacks(): string[] {
  const primary = aiModel();
  return [
    primary,
    "mistralai/ministral-8b",
    "qwen/qwen3.5-flash:free",
    "mistralai/mistral-small-2603",
  ].filter((m, i, arr) => m && arr.indexOf(m) === i);
}
