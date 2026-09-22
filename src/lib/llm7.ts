/**
 * LLM7 gateway (api.llm7.io) — OpenAI-compatible.
 * Base URL always ends with /v1, auth via `Authorization: Bearer <key>`
 * (dash.llm7.io token for higher limits, `unused` for anonymous).
 * Docs: https://docs.llm7.io — GET /v1/models is public, chat needs a key.
 *
 * Only models verified live with real completions against the configured
 * key are registered — the catalog listing alone does not imply access
 * (pro/402 and 429-limited entries fail on call).
 */

export const LLM7_BASE_URL = "https://api.llm7.io/v1";

export type Llm7ModelInfo = {
  id: string;
  display_name: string;
  access_tier: "llm7" | string;
  capabilities?: { vision?: boolean };
};

/** Verified working 2026-09-20 with real /v1/chat/completions calls. */
const VERIFIED: Record<string, { name: string; vision?: boolean }> = {
  default: { name: "LLM7 Default" },
  fast: { name: "LLM7 Fast" },
  "GLM-5.3-Flash": { name: "GLM 5.3 Flash" },
  "codestral-latest": { name: "Codestral" },
  "minimax-m2.7": { name: "MiniMax M2.7" },
  "mistral-Nemo-Instruct-2407": { name: "Mistral Nemo" },
};

export const LLM7_CHAT_IDS = Object.keys(VERIFIED);

export function llm7DisplayName(id: string): string {
  return VERIFIED[id]?.name ?? id;
}

export function isLlm7ChatModel(id: string): boolean {
  return id in VERIFIED;
}

function serverKey(): string | null {
  const k = process.env.LLM7_API_KEY?.trim();
  return k ? k : null;
}

export function isLlm7Configured(): boolean {
  return Boolean(serverKey());
}

function normalizeBase(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (/\/v\d+$/.test(trimmed)) return trimmed;
  return `${trimmed}/v1`;
}

export function llm7BaseUrl(): string {
  return normalizeBase(process.env.LLM7_BASE_URL ?? LLM7_BASE_URL);
}

/**
 * Server-only: live catalog intersected with the verified set.
 * Only these ids can actually run through our chat route.
 */
export async function listLlm7Models(): Promise<Llm7ModelInfo[]> {
  const key = serverKey();
  if (!key) throw new Error("LLM7_API_KEY is not configured.");
  const res = await fetch(`${llm7BaseUrl()}/models`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `LLM7 models failed: HTTP ${res.status} ${text.slice(0, 160)}`,
    );
  }
  const json = (await res.json()) as { data?: { id?: string }[] };
  const ids = Array.isArray(json.data)
    ? json.data.map((m) => String(m.id ?? "")).filter(Boolean)
    : [];
  return ids
    .filter((id) => isLlm7ChatModel(id))
    .map((id) => ({
      id,
      display_name: llm7DisplayName(id),
      access_tier: "llm7",
      capabilities: { vision: Boolean(VERIFIED[id]?.vision) },
    }));
}
