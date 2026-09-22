"use client";

import { useEffect, useState } from "react";
import { Check, Cpu, Eye, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModelProvider } from "@/lib/models";

type ApiModel = {
  id: string;
  name: string;
  provider: ModelProvider;
  tier: string;
  vision: boolean;
  tools?: boolean;
  context: number | null;
  available: boolean;
};

type ApiResponse = {
  models?: ApiModel[];
  availableCount?: number;
  nvidiaCount?: number;
  xkiroCount?: number;
  usage?: {
    free_used_today: number;
    free_limit_per_day: number;
    free_remaining: number;
  } | null;
  error?: string;
};

/**
 * Bottom strip on the chat page: every model both API keys (NVIDIA + xKiro)
 * can actually run — each pill switches the model on tap.
 */
export function XkiroModelBar({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/models", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: ApiResponse) => {
        if (alive) {
          setData(j);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) {
          setData({ error: "Models could not be loaded." });
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const models = data?.models ?? [];
  const usage = data?.usage ?? null;

  return (
    <section className="relative mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="pointer-events-none absolute -top-20 left-1/4 h-40 w-1/2 rounded-full bg-[#7c3aed]/25 blur-[70px]" />
      <div className="relative flex flex-wrap items-center justify-between gap-2 px-4 pt-3 sm:px-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/50">
          Models with your API keys
        </p>
        <p className="text-[12px] text-white/60">
          {loading ? (
            <span className="animate-pulse">Loading live catalog…</span>
          ) : data?.error && models.length === 0 ? (
            <span className="text-red-300/80">{data.error}</span>
          ) : (
            <>
              <span className="font-semibold text-white/60">
                {data?.nvidiaCount ?? 0} NVIDIA · {data?.xkiroCount ?? 0} xKiro free
              </span>
              {usage ? (
                <span className="ml-2 text-white/40">
                  · {usage.free_remaining.toLocaleString()} / {usage.free_limit_per_day.toLocaleString()} free tokens left today
                </span>
              ) : null}
            </>
          )}
        </p>
      </div>

      {loading ? (
        <div className="flex gap-2 overflow-hidden px-4 py-4 sm:px-5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 w-44 shrink-0 animate-pulse rounded-full bg-white/[0.06]" />
          ))}
        </div>
      ) : (
        <div className="relative">
          <div className="flex gap-2 overflow-x-auto px-4 py-4 sm:px-5 [scrollbar-width:thin]">
            {models.map((m) => {
              const active = m.id === selectedId;
              return (
                <button
                  key={`${m.provider}:${m.id}`}
                  type="button"
                  onClick={() => onSelect(m.id)}
                  title={`${m.name} (${m.id}) · via ${m.provider === "nvidia" ? "NVIDIA" : "xKiro"}${m.context ? ` · ${(m.context / 1000).toFixed(0)}k context` : ""}`}
                  className={cn(
                    "group flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] transition-all duration-200",
                    active
                      ? "border-[#8ea4ff]/70 bg-[#8ea4ff]/15 text-white shadow-[0_0_18px_rgba(142,164,255,0.35)]"
                      : "border-white/10 bg-white/[0.04] text-white/75 hover:border-[#8ea4ff]/40 hover:text-white",
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white/10 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                  <Cpu size={13} className={active ? "text-[#b8c5ff]" : "text-white/40 group-hover:text-[#b8c5ff]"} />
                  <span className="max-w-[180px] truncate font-medium">{m.name}</span>
                  {m.vision ? <Eye size={12} className="text-white/35" /> : null}
                  {m.tools ? <Wrench size={12} className="text-white/35" /> : null}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wider",
                      m.provider === "nvidia"
                        ? "bg-white/10/15 text-white/60"
                        : "bg-[#8ea4ff]/15 text-[#b8c5ff]",
                    )}
                  >
                    {m.provider === "nvidia" ? "NV" : "xK"}
                  </span>
                  {active ? <Check size={13} strokeWidth={3} className="text-white/60" /> : null}
                </button>
              );
            })}
            {models.length === 0 && !loading ? (
              <p className="px-1 py-1 text-[13px] text-white/50">
                No usable model right now — check both API keys.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
