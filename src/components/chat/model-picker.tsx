"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_MODEL_ID,
  getModel,
  CHAT_MODELS,
} from "@/lib/models";

export function ModelPicker({
  modelId,
  onSelect,
  className,
}: {
  modelId: string;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const active = getModel(modelId) ?? CHAT_MODELS[0];

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex h-10 items-center gap-2.5 rounded-full spatial-slab px-4 text-[13px] transition-all duration-300 hover:shadow-[0_0_15px_rgba(142,164,255,0.2)] backdrop-blur-md"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-ink">
          <Cpu size={12} />
        </div>
        <span className="max-w-[160px] truncate font-light text-ink/90">{active.name}</span>
        <ChevronDown
          size={14}
          className={cn("text-faint transition-transform duration-300", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className="animate-spatial-materialize absolute right-0 z-40 mt-2 w-[320px] overflow-hidden rounded-3xl spatial-slab py-2 shadow-2xl backdrop-blur-2xl"
        >
          <p className="px-5 pt-2 pb-1.5 text-[10px] font-medium tracking-[0.14em] text-faint uppercase font-mono">
            Cognitive Engine
          </p>
          <ul className="max-h-[400px] overflow-y-auto py-1">
            {CHAT_MODELS.map((m) => {
              const selected = m.id === modelId;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onSelect(m.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 px-5 py-3 text-left transition-all duration-200",
                      selected
                        ? "bg-accent-soft shadow-[inset_0_0_0_1px_rgba(142,164,255,0.2)]"
                        : "hover:bg-white/[0.03]",
                    )}
                  >
                    <div className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                      selected
                        ? "border-accent bg-accent text-ink"
                        : "border-glass-edge text-faint group-hover:text-accent"
                    )}>
                      {selected ? <Check size={10} strokeWidth={3} /> : <div className="h-1 w-1 rounded-full bg-faint" />}
                    </div>
                    <span className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[13.5px] font-light",
                          selected ? "text-ink" : "text-ink/80",
                        )}>
                          {m.name}
                        </span>
                        {m.badge || m.id === DEFAULT_MODEL_ID ? (
                          <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-accent uppercase font-mono">
                            {m.badge ?? "Default"}
                          </span>
                        ) : null}
                      </div>
                      <span className="mt-0.5 block truncate text-[12px] text-faint leading-tight font-light">
                        {m.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
