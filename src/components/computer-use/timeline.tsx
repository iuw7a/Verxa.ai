"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Eye,
  Info,
  MousePointerClick,
  Pause,
  Play,
  ShieldAlert,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CuEvent } from "@/lib/computer-use-web";

const ICONS: Record<string, React.ComponentType<{ size?: number | string; className?: string }>> = {
  step: ChevronRight,
  action: MousePointerClick,
  observation: Eye,
  confirmation: ShieldAlert,
  done: CheckCircle2,
  error: AlertTriangle,
  stopped: Square,
  paused: Pause,
  resumed: Play,
  info: Info,
};

const TONES: Record<string, string> = {
  done: "text-ok",
  error: "text-danger",
  stopped: "text-muted",
  confirmation: "text-[#e8c47a]",
  action: "text-ink/80",
  step: "text-faint",
  info: "text-faint",
};

/** Live activity feed of a Computer Use session. */
export function ActivityTimeline({
  events,
  live = false,
}: {
  events: CuEvent[];
  live?: boolean;
}) {
  if (!events.length) {
    return (
      <p className="px-1 py-6 text-center text-[13px] text-faint">
        No activity yet.
      </p>
    );
  }
  return (
    <ol className="relative space-y-0.5">
      {events.map((e, i) => {
        const Icon = ICONS[e.kind] ?? Info;
        const isLast = i === events.length - 1;
        return (
          <li
            key={e.id}
            className={cn(
              "flex items-start gap-3 rounded-[10px] px-2.5 py-2",
              isLast && live && "bg-white/[0.03]",
            )}
          >
            <span className={cn("mt-0.5 shrink-0", TONES[e.kind] ?? "text-faint")}>
              <Icon size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn("block text-[13.5px] leading-snug", TONES[e.kind] ?? "text-ink/85")}>
                {e.label}
              </span>
              {e.detail ? (
                <span className="mt-0.5 block text-[12px] leading-snug text-faint">
                  {e.detail}
                </span>
              ) : null}
            </span>
            {isLast && live ? (
              <span className="relative mt-1.5 flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8ea4ff] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#8ea4ff]" />
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
