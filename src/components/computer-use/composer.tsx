"use client";

import { useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/primitives";

const EXAMPLES = [
  "Open the calculator and compute 12 × 8",
  "Open Notepad and write a short shopping list",
  "Take a look at my screen and tell me what is open",
];

/** Goal composer — the entry point for a web-driven Computer Use session. */
export function GoalComposer({
  disabled,
  disabledReason,
  busy,
  onStart,
}: {
  disabled: boolean;
  disabledReason?: string;
  busy: boolean;
  onStart: (goal: string) => void;
}) {
  const [value, setValue] = useState("");
  const canSend = !disabled && !busy && value.trim().length >= 3;

  return (
    <div>
      <div className="overflow-hidden rounded-[18px] border border-line bg-card shadow-[var(--shadow)]">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && canSend) {
              e.preventDefault();
              onStart(value.trim());
              setValue("");
            }
          }}
          rows={2}
          disabled={disabled}
          placeholder={
            disabled
              ? disabledReason ?? "Melde dich an, um zu starten"
              : "Alles erledigen…"
          }
          className="max-h-40 min-h-[64px] w-full resize-none bg-transparent px-4 pt-3.5 text-[14.5px] leading-relaxed text-ink outline-none placeholder:text-faint disabled:cursor-not-allowed"
        />
        <div className="flex items-center justify-between gap-2 px-3 pb-3">
          <span className="pl-1 text-[12px] text-faint">
            Verxa arbeitet in einer Web-Sitzung direkt hier — keine Installation nötig.
          </span>
          <Button
            size="sm"
            disabled={!canSend}
            onClick={() => {
              onStart(value.trim());
              setValue("");
            }}
          >
            {busy ? "Starting…" : "Start session"}
            <ArrowUp size={14} strokeWidth={2.4} />
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={disabled}
            onClick={() => setValue(ex)}
            className="flex items-center gap-1.5 rounded-full border border-line bg-white/[0.02] px-3 py-1.5 text-[12.5px] text-muted transition hover:border-white/20 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles size={11} className="text-faint" />
            <span className="max-w-[260px] truncate">{ex}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
