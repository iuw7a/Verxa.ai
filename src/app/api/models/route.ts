import { NextResponse } from "next/server";
import { listXkiroModels, isModelUsable } from "@/lib/xkiro";
import { listNvidiaModels } from "@/lib/nvidia";
import type { ModelProvider } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type UnifiedModel = {
  id: string;
  name: string;
  provider: ModelProvider;
  tier: string;
  vision: boolean;
  context: number | null;
  available: boolean;
  badge?: string;
};

/**
 * Unified live catalog for BOTH keys (xKiro + NVIDIA).
 * The chat page renders this at the very bottom — only models flagged
 * `available: true` can actually run with the configured keys.
 */
export async function GET() {
  const [xkiro, nvidia] = await Promise.all([
    listXkiroModels().catch((e: unknown) => ({
      models: [],
      usage: null,
      error: e instanceof Error ? e.message : "xKiro failed.",
    })),
    listNvidiaModels().catch(() => []),
  ]);

  const xkiroUsage =
    "usage" in xkiro && xkiro.usage
      ? {
          free_used_today: xkiro.usage.free_used_today,
          free_limit_per_day: xkiro.usage.free_limit_per_day,
          free_remaining: xkiro.usage.free_remaining,
        }
      : null;

  const models: UnifiedModel[] = [
    ...nvidia.map((m) => ({
      id: m.id,
      name: m.name,
      provider: "nvidia" as const,
      tier: "nvidia",
      vision: m.id.includes("vision"),
      context: null as number | null,
      available: m.available,
      badge: m.badge,
    })),
    ..."models" in xkiro
      ? xkiro.models.map((m) => ({
          id: m.id,
          name: m.display_name || m.id,
          provider: "xkiro" as const,
          tier: m.access_tier,
          vision: Boolean(m.capabilities?.vision),
          context: m.context_length ?? null,
          available: isModelUsable(m, xkiro.usage),
          badge: undefined as string | undefined,
        }))
      : [],
  ];

  const available = models.filter((m) => m.available);
  // NVIDIA first (primary), then xKiro free, alphabetical inside.
  available.sort((a, b) => {
    if (a.provider !== b.provider) return a.provider === "nvidia" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({
    models: available,
    availableCount: available.length,
    nvidiaCount: available.filter((m) => m.provider === "nvidia").length,
    xkiroCount: available.filter((m) => m.provider === "xkiro").length,
    usage: xkiroUsage,
    errors: {
      xkiro: "error" in xkiro ? (xkiro.error ?? null) : null,
    },
    updatedAt: Date.now(),
  });
}
