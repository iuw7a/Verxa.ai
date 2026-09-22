"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Pause,
  Play,
  ShieldAlert,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { ActivityTimeline } from "@/components/computer-use/timeline";
import {
  humanizeAction,
  isTerminal,
  timeAgo,
  type CuConfirmation,
  type CuEvent,
  type CuRun,
  type CuRunStatus,
} from "@/lib/computer-use-web";

export const RUN_STATUS_META: Record<
  CuRunStatus,
  { label: string; dot: string; text: string }
> = {
  queued: { label: "Connecting", dot: "bg-[#8ea4ff]", text: "text-[#8ea4ff]" },
  running: { label: "Computer Use Active", dot: "bg-[#8ea4ff]", text: "text-[#8ea4ff]" },
  awaiting_confirmation: {
    label: "Computer Use Active",
    dot: "bg-[#e8c47a]",
    text: "text-[#e8c47a]",
  },
  paused: { label: "Paused", dot: "bg-white/50", text: "text-muted" },
  stopped: { label: "Stopped", dot: "bg-white/30", text: "text-muted" },
  done: { label: "Completed", dot: "bg-ok", text: "text-ok" },
  error: { label: "Error", dot: "bg-danger", text: "text-danger" },
};

/** Small status chip used in the header and on session cards. */
export function StatusPill({
  status,
  className,
}: {
  status:
    | CuRunStatus
    | "permission"
    | "revoked"
    | "disconnected"
    | "reconnecting"
    | "connected";
  className?: string;
}) {
  const meta =
    status === "permission"
      ? { label: "Permission Required", dot: "bg-danger", text: "text-danger" }
      : status === "revoked"
        ? { label: "Permission Revoked", dot: "bg-danger", text: "text-danger" }
        : status === "disconnected"
          ? { label: "Disconnected", dot: "bg-white/35", text: "text-muted" }
          : status === "reconnecting"
            ? { label: "Reconnecting", dot: "bg-[#8ea4ff]", text: "text-[#8ea4ff]" }
            : status === "connected"
              ? { label: "Connected", dot: "bg-ok", text: "text-ok" }
              : RUN_STATUS_META[status];
  const pulse =
    status === "running" || status === "queued" || status === "reconnecting";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.03] px-3 py-1 text-[12.5px]",
        meta.text,
        className,
      )}
    >
      <span className="relative flex h-2 w-2">
        {pulse ? (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
              meta.dot,
            )}
          />
        ) : null}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", meta.dot)} />
      </span>
      {meta.label}
    </span>
  );
}

/**
 * Live session workspace: status, controls (stop/pause/resume), pending
 * confirmation, and the activity timeline. Pure presentation — every
 * action leaves through the caller's API handlers.
 */
export function SessionConsole({
  run,
  events,
  confirmation,
  deviceName,
  onControl,
  onDecide,
  busyAction,
}: {
  run: CuRun;
  events: CuEvent[];
  confirmation: CuConfirmation | null;
  deviceName: string | null;
  onControl: (action: "stop" | "pause" | "resume") => void;
  onDecide: (allow: boolean) => void;
  busyAction: boolean;
}) {
  const terminal = isTerminal(run.status);
  const live =
    run.status === "running" ||
    run.status === "awaiting_confirmation" ||
    run.status === "queued";
  const pendingConfirmation =
    confirmation?.status === "pending" && run.status === "awaiting_confirmation";

  return (
    <div className="space-y-4">
      <div className="rounded-[18px] border border-line bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusPill status={run.status} />
          <span className="text-[12px] text-faint">
            {run.status === "queued"
              ? "Starting your web session"
              : deviceName
                ? `On ${deviceName}`
                : "Authorized computer"}
            {" · "}
            {timeAgo(run.updated_at)}
          </span>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-ink">{run.goal}</p>
        {run.status === "running" || run.step > 0 ? (
          <p className="mt-1 text-[12.5px] text-faint">
            {run.step > 0
              ? `${run.step} action${run.step === 1 ? "" : "s"} performed`
              : "Starting…"}
          </p>
        ) : null}

        {run.status === "queued" ? (
          <p className="mt-3 flex items-start gap-2 rounded-[12px] border border-line bg-white/[0.02] px-3 py-2.5 text-[12.5px] leading-relaxed text-muted">
            <Loader2 size={14} className="mt-0.5 shrink-0 animate-spin" />
            Your web session has not started yet. It starts automatically —
            no install, no desktop app.
          </p>
        ) : null}

        {pendingConfirmation ? (
          <div className="mt-4 rounded-[14px] border border-[#e8c47a]/25 bg-[#e8c47a]/[0.06] p-4">
            <p className="flex items-center gap-2 text-[13px] font-medium text-[#e8c47a]">
              <ShieldAlert size={15} />
              Verxa wants to perform this action
            </p>
            <p className="mt-2 font-mono text-[13px] text-ink/90">
              {humanizeAction(confirmation?.action)}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
              {confirmation?.reason}
            </p>
            <div className="mt-3.5 flex gap-2.5">
              <Button size="sm" disabled={busyAction} onClick={() => onDecide(true)}>
                Allow once
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busyAction}
                onClick={() => onDecide(false)}
              >
                Deny
              </Button>
            </div>
          </div>
        ) : null}

        {run.status === "done" && run.summary ? (
          <p className="mt-3 flex items-start gap-2 rounded-[12px] border border-ok/20 bg-ok/[0.06] px-3 py-2.5 text-[13px] leading-relaxed text-ok">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
            {run.summary}
          </p>
        ) : null}
        {run.status === "error" ? (
          <p className="mt-3 flex items-start gap-2 rounded-[12px] border border-danger/25 bg-danger/[0.07] px-3 py-2.5 text-[13px] leading-relaxed text-danger">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            {run.error ?? "The session stopped with an error."}
          </p>
        ) : null}
        {run.status === "stopped" ? (
          <p className="mt-3 flex items-start gap-2 rounded-[12px] border border-line bg-white/[0.02] px-3 py-2.5 text-[13px] text-muted">
            <Square size={14} className="mt-0.5 shrink-0" />
            Stopped. Verxa is no longer controlling your computer.
          </p>
        ) : null}

        {!terminal ? (
          <div className="mt-4 flex items-center gap-2.5 border-t border-line pt-4">
            {run.status === "paused" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busyAction}
                onClick={() => onControl("resume")}
              >
                <Play size={13} /> Resume
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={busyAction || run.status !== "running"}
                onClick={() => onControl("pause")}
              >
                <Pause size={13} /> Pause
              </Button>
            )}
            <Button
              size="sm"
              variant="danger"
              disabled={busyAction}
              onClick={() => onControl("stop")}
            >
              <Square size={13} /> Stop
            </Button>
            <span className="hidden text-[12px] text-faint sm:inline">
              Stop halts the session immediately on your computer.
            </span>
          </div>
        ) : null}
      </div>

      <div className="rounded-[18px] border border-line bg-card p-4">
        <p className="mb-2 px-1 text-[11px] font-medium tracking-[0.14em] text-faint uppercase">
          Activity
        </p>
        <div className="max-h-[420px] overflow-y-auto">
          <ActivityTimeline events={events} live={live} />
        </div>
      </div>
    </div>
  );
}
