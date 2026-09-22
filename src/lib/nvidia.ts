/**
 * NVIDIA Build gateway (integrate.api.nvidia.com) — OpenAI-compatible.
 * Second chat provider next to xKiro. Only models verified live with real
 * completions against the configured key are registered — the NVIDIA
 * catalog listing alone does not imply access (most entries 404 on call).
 */

export type NvidiaModelInfo = {
  id: string;
  name: string;
  description: string;
  badge?: string;
};

/** Verified working 2026-09-19 with real /v1/chat/completions calls. */
export const NVIDIA_MODELS: NvidiaModelInfo[] = [
  {
    id: "openai/gpt-oss-20b",
    name: "GPT-OSS 20B",
    description: "Best all-rounder — fast and capable",
    badge: "Default",
  },
  {
    id: "google/gemma-4-31b-it",
    name: "Gemma 4 31B",
    description: "Strong chat quality, quick responses",
  },
  {
    id: "meta/llama-3.2-11b-vision-instruct",
    name: "Llama 3.2 11B Vision",
    description: "Chat with image understanding",
    badge: "Vision",
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b",
    name: "Nemotron 3 Super",
    description: "Largest quality, a bit slower",
  },
  {
    id: "nvidia/nemotron-3.5-lightning-30b-a3b",
    name: "Nemotron Lightning",
    description: "Optimized for speed",
    badge: "Fast",
  },
];

export function isNvidiaConfigured(): boolean {
  return Boolean(process.env.NVIDIA_API_KEY?.trim());
}

function normalizeBase(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (/\/v\d+$/.test(trimmed)) return trimmed;
  return `${trimmed}/v1`;
}

export function nvidiaBaseUrl(): string {
  return normalizeBase(
    process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
  );
}

/**
 * Server-only: intersect the verified registry with the live catalog so
 * retired models disappear from the UI instead of failing at request time.
 */
export async function listNvidiaModels(): Promise<
  (NvidiaModelInfo & { available: boolean })[]
> {
  const key = process.env.NVIDIA_API_KEY?.trim();
  if (!key) return NVIDIA_MODELS.map((m) => ({ ...m, available: false }));

  let catalog: Set<string> | null = null;
  try {
    const res = await fetch(`${nvidiaBaseUrl()}/models`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    if (res.ok) {
      const j = (await res.json()) as { data?: { id?: string }[] };
      catalog = new Set(
        Array.isArray(j.data)
          ? j.data.map((d) => d.id).filter((id): id is string => Boolean(id))
          : [],
      );
    }
  } catch {
    catalog = null; // catalog unreachable — trust the verified registry
  }

  return NVIDIA_MODELS.map((m) => ({
    ...m,
    available: catalog ? catalog.has(m.id) : true,
  }));
}
