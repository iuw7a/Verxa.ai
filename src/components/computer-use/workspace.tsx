"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Monitor,
  Pause,
  Play,
  ShieldAlert,
  Square,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { ActivityTimeline } from "@/components/computer-use/timeline";
import {
  getFrame,
  humanizeAction,
  isTerminal,
  timeAgo,
  type CuConfirmation,
  type CuEvent,
  type CuRun,
  type CuRunStatus,
} from "@/lib/computer-use-web";

/**
 * Web-only Computer Use control strip: live status dot, current
 * action, pause/resume, stop, and the screen preview entry point. Renders
 * only while a session exists (idle, running, paused or confirming).
 * The session is a cloud browser session inside the Verxa website —
 * no install, no desktop app.
 */
export function ComputerBar({
  run,
  currentAction,
  onControl,
  onViewScreen,
  busy,
}: {
  run: CuRun;
  currentAction: string | null;
  onControl: (action: "stop" | "pause" | "resume") => void;
  onViewScreen: () => void;
  busy: boolean;
}) {
  const awaiting = run.status === "awaiting_confirmation";
  return (
    <div className="rounded-[14px] border border-line bg-[#12121a] px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8ea4ff] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#8ea4ff]" />
        </span>
        <span className="text-[13px] font-medium text-ink">
          Computer Use · Active
        </span>
      </div>
      {currentAction ? (
        <p className="mt-1.5 truncate text-[12.5px] text-muted">
          Current action: {currentAction}
        </p>
      ) : null}
      {awaiting ? (
        <p className="mt-1.5 text-[12.5px] text-[#e8c47a]">
          Waiting for confirmation…
        </p>
      ) : null}
      <div className="mt-2.5 flex items-center gap-2">
        {run.status === "paused" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onControl("resume")}
            className="flex items-center gap-1 rounded-[8px] border border-line px-2.5 py-1 text-[12px] text-muted transition hover:text-ink disabled:opacity-40"
          >
            <Play size={12} /> Resume
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || run.status !== "running"}
            onClick={() => onControl("pause")}
            className="flex items-center gap-1 rounded-[8px] border border-line px-2.5 py-1 text-[12px] text-muted transition hover:text-ink disabled:opacity-40"
          >
            <Pause size={12} /> Pause
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => onControl("stop")}
          className="flex items-center gap-1 rounded-[8px] border border-danger/40 bg-danger/10 px-2.5 py-1 text-[12px] text-danger transition hover:bg-danger/20 disabled:opacity-40"
        >
          <Square size={12} /> Stop
        </button>
        <button
          type="button"
          onClick={onViewScreen}
          className="flex items-center gap-1 rounded-[8px] border border-line px-2.5 py-1 text-[12px] text-muted transition hover:text-ink"
        >
          <Monitor size={12} /> View Screen
        </button>
      </div>
    </div>
  );
}

/**
 * "View Screen" modal — shows the frame the web session captured, or
 * an honest placeholder when no frame exists yet.
 */
export function ViewScreenModal({
  runId,
  onClose,
}: {
  runId: string | null;
  onClose: () => void;
}) {
  const [frame, setFrame] = useState<string | null>(null);
  const [frameAt, setFrameAt] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) return;
    let dead = false;
    const tick = async () => {
      const res = await getFrame(runId);
      if (dead || !res.ok) return;
      if (res.data.frame) {
        setFrame(res.data.frame);
        setFrameAt(res.data.at);
      }
    };
    void tick();
    const t = setInterval(tick, 2500);
    return () => {
      dead = true;
      clearInterval(t);
    };
  }, [runId]);

  if (!runId) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="animate-rise relative w-full max-w-[860px] overflow-hidden rounded-[20px] border border-white/10 bg-[#101017] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.8)]">
        <div className="flex items-center justify-between px-1 pb-3">
          <p className="text-[13px] text-muted">
            Web-Sitzung{" "}
            {frameAt ? <span className="text-faint">· {timeAgo(frameAt)}</span> : null}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
        {frame ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={frame}
            alt="Web-Sitzung Bildschirm"
            className="w-full rounded-[12px] border border-white/10"
          />
        ) : (
          <div className="flex h-[240px] items-center justify-center rounded-[12px] border border-dashed border-white/15">
            <p className="flex items-center gap-2 px-6 text-center text-[13px] text-muted">
              <Loader2 size={14} className="animate-spin" />
              No preview yet — the web session sends it, live.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


function currentActionLabel(events: CuEvent[]): string | null {
  const pick = [...events]
    .reverse()
    .find((e) => e.kind === "action" || e.kind === "step");
  return pick?.label ?? null;
}

/**
 * Desktop-style session workspace: control strip, confirmation dialog,
 * activity feed as a conversation, and the terminal/result state.
 */
export function SessionWorkspace({
  run,
  events,
  confirmation,
  deviceName,
  onControl,
  onDecide,
  onViewScreen,
  busyAction,
}: {
  run: CuRun;
  events: CuEvent[];
  confirmation: CuConfirmation | null;
  deviceName: string | null;
  onControl: (action: "stop" | "pause" | "resume") => void;
  onDecide: (allow: boolean) => void;
  onViewScreen: () => void;
  busyAction: boolean;
}) {
  const terminal = isTerminal(run.status);
  const live =
    run.status === "running" ||
    run.status === "awaiting_confirmation" ||
    run.status === "queued";
  const awaiting =
    run.status === "awaiting_confirmation" &&
    confirmation?.status === "pending";

  return (
    <div className="overflow-hidden rounded-[18px] border border-line bg-card">
      {live ? (
        <div className="p-4 pb-0">
          <ComputerBar
            run={run}
            currentAction={currentActionLabel(events)}
            onControl={onControl}
            onViewScreen={onViewScreen}
            busy={busyAction}
          />
        </div>
      ) : null}

      <div className="max-h-[480px] space-y-0.5 overflow-y-auto p-3">
        <div className="flex justify-end px-1 py-1.5">
          <p className="max-w-[85%] rounded-[16px] rounded-br-[6px] bg-accent px-3.5 py-2 text-[13.5px] leading-relaxed text-[#0a0c12]">
            {run.goal}
          </p>
        </div>

        {run.status === "queued" ? (
          <p className="flex items-center gap-2 px-2 py-2 text-[13px] text-muted">
            <Loader2 size={13} className="animate-spin text-[#8ea4ff]" />
            Connecting — starting your web session…
          </p>
        ) : null}

        <ActivityTimeline events={events} live={live} />

        {awaiting ? (
          <div className="mx-1 mt-2 rounded-[14px] border border-[#e8c47a]/25 bg-[#e8c47a]/[0.06] p-4">
            <p className="flex items-center gap-2 text-[13px] font-medium text-[#e8c47a]">
              <ShieldAlert size={15} />
              Verxa wants to perform this action
            </p>
            <div className="mt-2 rounded-[10px] border border-white/10 bg-black/30 p-3">
              <code className="text-[12.5px] break-words text-ink/90">
                {humanizeAction(confirmation?.action)}
              </code>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              {confirmation?.reason}
            </p>
            <div className="mt-3 flex gap-2.5">
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
          <p className="mx-1 mt-2 flex items-start gap-2 rounded-[12px] border border-ok/20 bg-ok/[0.06] px-3 py-2.5 text-[13px] leading-relaxed text-ok">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0" />✓ {run.summary}
          </p>
        ) : null}
        {run.status === "error" ? (
          <p className="mx-1 mt-2 flex items-start gap-2 rounded-[12px] border border-danger/25 bg-danger/[0.07] px-3 py-2.5 text-[13px] leading-relaxed text-danger">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />✕{" "}
            {run.error ?? "The session stopped with an error."}
          </p>
        ) : null}
        {run.status === "stopped" ? (
          <p className="mx-1 mt-2 flex items-start gap-2 rounded-[12px] border border-line bg-white/[0.02] px-3 py-2.5 text-[13px] text-muted">
            <Square size={14} className="mt-0.5 shrink-0" />· Stopped. Verxa is
            no longer controlling your computer.
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
        <span className="truncate text-[12px] text-faint">
          {deviceName ? `On ${deviceName}` : "Authorized computer"}
          {" · "}
          {timeAgo(run.updated_at)}
          {run.step > 0 ? ` · ${run.step} action${run.step === 1 ? "" : "s"}` : ""}
        </span>
        {run.status === "paused" ? (
          <span className="text-[12px] text-muted">Paused</span>
        ) : null}
        {terminal && run.status === "done" ? (
          <span className="text-[12px] text-ok">Done</span>
        ) : null}
      </div>
    </div>
  );
}
