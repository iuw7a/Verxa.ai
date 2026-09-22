"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronUp, Cpu, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHAT_MODELS, getModel, type ModelProvider } from "@/lib/models";

type ApiModel = {
  id: string;
  name: string;
  provider: ModelProvider;
  tier: string;
  vision: boolean;
  context: number | null;
  available: boolean;
};

/**
 * Single button that opens the live free-model list so the user can switch
 * the model. Used at the bottom of the landing page and the chat page.
 */
export function ModelChangeButton({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<ApiModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<{ left: number; bottom: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/models", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { models?: ApiModel[] }) => {
        if (!alive) return;
        setModels(j.models ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Static fallback so the list is never empty — same registry as the top picker.
  const fallback: ApiModel[] = useMemo(
    () =>
      CHAT_MODELS.map((m) => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
        tier: "static",
        vision: false,
        context: null,
        available: true,
      })),
    [],
  );

  const list = useMemo(
    () => (models.length > 0 ? models : loading ? [] : fallback),
    [models, loading, fallback],
  );
  const isFallback = models.length === 0 && !loading;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((m) => `${m.name} ${m.id}`.toLowerCase().includes(q));
  }, [list, query]);

  const nvidia = filtered.filter((m) => m.provider === "nvidia");
  const xkiro = filtered.filter((m) => m.provider !== "nvidia");

  const activeLive = models.find((m) => m.id === selectedId) ?? null;
  const activeStatic = getModel(selectedId) ?? null;
  const activeName = activeLive?.name ?? activeStatic?.name ?? (loading ? "Loading models…" : "Choose model");

  function updatePos() {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.min(400, window.innerWidth - 24);
    const left = Math.max(12, Math.min(r.left + r.width / 2 - width / 2, window.innerWidth - width - 12));
    const bottom = Math.max(12, window.innerHeight - r.top + 10);
    setPos({ left, bottom, width });
  }

  useEffect(() => {
    if (!open) return;
    updatePos();
    setQuery("");
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (dropRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onResize() {
      updatePos();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open ]);

  return (
    <div className="relative flex justify-center">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] backdrop-blur-xl transition",
          open
            ? "border-[#8ea4ff]/60 bg-[#8ea4ff]/15 text-white shadow-[0_0_20px_rgba(142,164,255,0.3)]"
            : "border-white/15 bg-white/[0.04] text-white/75 hover:border-white/35 hover:text-white",
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-white/10 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
        <Cpu size={14} className="text-[#b8c5ff]" />
        <span className="max-w-[220px] truncate font-medium">{activeName}</span>
        <ChevronUp size={14} className={cn("text-white/50 transition-transform", open && "rotate-180")} />
      </button>

      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={dropRef}
              className="fixed z-[100] overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d14]/98 shadow-2xl backdrop-blur-2xl"
              style={{ left: pos.left, bottom: pos.bottom, width: pos.width }}
            >
              <div className="border-b border-white/[0.07] p-2.5">
                <p className="px-1.5 pb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">
                  {isFallback ? `All models · ${list.length}` : `NVIDIA + xKiro free · ${list.length}`}
                </p>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                  <Search size={13} className="shrink-0 text-white/35" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search models…"
                    className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/30"
                  />
                </div>
              </div>
              {loading ? (
                <div className="space-y-2 px-4 py-3">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-9 animate-pulse rounded-xl bg-white/[0.05]" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <p className="px-4 py-4 text-[13px] text-white/50">
                  No model matches “{query}”.
                </p>
              ) : (
                <div className="max-h-[55vh] overflow-y-auto py-1.5">
                  {nvidia.length > 0 && (
                    <>
                      <p className="px-4 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60/70">
                        NVIDIA · {nvidia.length}
                      </p>
                      {nvidia.map((m) => (
                        <ModelRow key={m.id} m={m} selected={m.id === selectedId} onSelect={() => { onSelect(m.id); setOpen(false); }} />
                      ))}
                    </>
                  )}
                  {xkiro.length > 0 && (
                    <>
                      <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#b8c5ff]/70">
                        xKiro free · {xkiro.length}
                      </p>
                      {xkiro.map((m) => (
                        <ModelRow key={m.id} m={m} selected={m.id === selectedId} onSelect={() => { onSelect(m.id); setOpen(false); }} />
                      ))}
                    </>
                  )}
                </div>
              )}
              <p className="border-t border-white/[0.07] px-4 py-2 text-center text-[11px] text-white/30">
                Klick zum Wechseln · {filtered.length} sichtbar
              </p>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function ModelRow({ m, selected, onSelect }: { m: ApiModel; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition",
        selected ? "bg-[#8ea4ff]/15" : "hover:bg-white/[0.04]",
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-white/30 bg-white/10/20 text-white/60" : "border-white/15 text-transparent",
        )}
      >
        <Check size={11} strokeWidth={3} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="block truncate text-[13.5px] text-white">{m.name}</span>
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wider",
              m.provider === "nvidia"
                ? "bg-white/10/15 text-white/60"
                : "bg-[#8ea4ff]/15 text-[#b8c5ff]",
            )}
          >
            {m.provider === "nvidia" ? "NV" : "xK"}
          </span>
        </span>
        <span className="block truncate text-[11.5px] text-white/40">{m.id}</span>
      </span>
    </button>
  );
}
