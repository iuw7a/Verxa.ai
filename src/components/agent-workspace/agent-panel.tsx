"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentStatusKind, AgentToolEvent } from "@/lib/browser-agent/events";
import { STATUS_COPY } from "@/lib/browser-agent/events";

/** Compact execution status — updates from actual tool events. */
export function AgentStatus({ status, live }: { status: AgentStatusKind; live: boolean }) {
  return (
    <div className="flex items-center gap-2" aria-live="polite">
      <span className="relative flex h-2 w-2">
        {live ? (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        ) : null}
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            status === "error" ? "bg-red-400" : status === "completed" ? "bg-emerald-400" : "bg-emerald-300",
          )}
        />
      </span>
      <span className="text-[12.5px] font-medium text-white/85">{STATUS_COPY[status]}</span>
      {live ? <Loader2 size={12} className="animate-spin text-white/40" /> : null}
    </div>
  );
}

/** One chat bubble in the agent panel (user / agent / tool narration). */
export function AgentMessage({
  role,
  children,
}: {
  role: "user" | "agent" | "tool";
  children: React.ReactNode;
}) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[90%] rounded-[14px] rounded-br-[5px] bg-white px-3.5 py-2 text-[13.5px] leading-relaxed text-black">
          {children}
        </p>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "max-w-[95%] rounded-[14px] rounded-bl-[5px] border px-3.5 py-2.5 text-[13.5px] leading-relaxed",
        role === "tool"
          ? "border-white/10 bg-white/[0.04] text-white/75"
          : "border-white/10 bg-[#141419] text-white/90",
      )}
    >
      {children}
    </div>
  );
}

/** Expandable completed steps (✓ Opened ChatGPT …). */
export function AgentExecutionTimeline({ events }: { events: AgentToolEvent[] }) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  if (!events.length) return null;
  return (
    <ol className="space-y-1">
      {events.map((e, i) => {
        const failed = e.type === "browser.error";
        const isOpen = open[i] ?? false;
        return (
          <li key={`${e.at}-${i}`} className="rounded-[10px] border border-white/[0.07] bg-white/[0.02]">
            <button
              type="button"
              onClick={() => setOpen((p) => ({ ...p, [i]: !p[i] }))}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left"
            >
              {failed ? (
                <XCircle size={13} className="shrink-0 text-red-400" />
              ) : (
                <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />
              )}
              <span className="flex-1 truncate text-[12.5px] text-white/80">{e.label}</span>
              <ChevronDown size={13} className={cn("text-white/40 transition", isOpen && "rotate-180")} />
            </button>
            {isOpen ? (
              <div className="border-t border-white/[0.06] px-3 py-2 text-[12px] leading-relaxed text-white/55">
                {e.detail ? <p className="break-words">{e.detail}</p> : null}
                {e.url ? <p className="mt-1 truncate font-mono text-[11px] text-white/40">{e.url}</p> : null}
                <p className="mt-1 font-mono text-[10.5px] text-white/30">{e.type} · {new Date(e.at).toLocaleTimeString()}</p>
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
