"use client";

import { Loader2, MousePointerClick } from "lucide-react";
import type { AgentStatusKind } from "@/lib/browser-agent/events";
import { cn } from "@/lib/utils";

/**
 * Viewport rendering the ACTUAL browser/tool state: the latest screenshot
 * captured from the cloud Chromium, refreshed on every real tool step.
 * Never a canned animation — empty state says so honestly.
 */
export function BrowserViewport({
  screenshot,
  loading,
  status,
  lastAction,
  userControl,
}: {
  screenshot: string | null;
  loading: boolean;
  status: AgentStatusKind;
  lastAction: string | null;
  userControl: boolean;
}) {
  return (
    <div className="relative min-h-0 flex-1 bg-[#08080b]">
      {screenshot ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={screenshot}
          alt="Live browser viewport"
          className="absolute inset-0 h-full w-full object-contain"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
          <Loader2 size={20} className="animate-spin text-emerald-300" />
          <p className="text-[13px] text-white/70">Starting the live browser…</p>
          <p className="max-w-[380px] text-[12px] leading-relaxed text-white/35">
            A real isolated Chromium is launching. The first page appears here
            as soon as the browser tool responds — nothing is pre-rendered.
          </p>
        </div>
      )}

      {/* Subtle, non-intrusive action indicator driven by real events */}
      {lastAction && !userControl ? (
        <div className="pointer-events-none absolute bottom-3 left-3 flex max-w-[70%] items-center gap-2 rounded-full border border-white/10 bg-black/70 py-1 pr-3 pl-1.5 backdrop-blur">
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full",
              status === "clicking" ? "bg-emerald-400/20 text-emerald-300" : "bg-white/10 text-white/70",
            )}
          >
            <MousePointerClick size={11} />
          </span>
          <span className="truncate text-[11.5px] text-white/75">{lastAction}</span>
        </div>
      ) : null}

      {userControl ? (
        <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full border border-amber-300/30 bg-black/75 px-3.5 py-1.5 text-[12px] text-amber-200 backdrop-blur">
          You have control — Verxa is paused
        </div>
      ) : null}

      {loading && screenshot ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden">
          <div className="h-full w-1/3 animate-[browserload_1.2s_ease-in-out_infinite] bg-emerald-400/80" />
        </div>
      ) : null}
      <style>{`@keyframes browserload{0%{margin-left:-33%}100%{margin-left:100%}}`}</style>
    </div>
  );
}
