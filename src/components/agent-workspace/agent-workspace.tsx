"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Monitor, MessageSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentMessage, AgentExecutionTimeline, AgentStatus } from "@/components/agent-workspace/agent-panel";
import { BrowserToolbar } from "@/components/agent-workspace/browser-toolbar";
import { BrowserViewport } from "@/components/agent-workspace/browser-viewport";
import { ExecutionControls, TakeControlButton } from "@/components/agent-workspace/browser-controls";
import type { BrowserAgentApi } from "@/components/agent-workspace/use-browser-agent";

/**
 * AgentWorkspace — two-panel Live Browser Agent layout.
 * LEFT: Verxa agent/chat. RIGHT: live browser driven by real tool events.
 * Auto-opened only when a browser task starts; otherwise chat stays normal.
 */
export function AgentWorkspace({
  agent,
  userRequest,
  onClose,
  leftExtra,
}: {
  agent: BrowserAgentApi;
  userRequest: string;
  onClose: () => void;
  /** Normal chat scroll content can render above the agent feed. */
  leftExtra?: React.ReactNode;
}) {
  const { state } = agent;
  const [split, setSplit] = useState(44); // left width %
  const [mobileTab, setMobileTab] = useState<"chat" | "browser">("browser");
  const [fullscreen, setFullscreen] = useState(false);
  const dragRef = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("verxa-agent-split");
      if (raw) setSplit(Math.min(70, Math.max(25, Number(raw) || 44)));
    } catch { /* ignore */ }
  }, []);

  const onDrag = useCallback((clientX: number) => {
    const el = wrapRef.current;
    if (!el || !dragRef.current) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    const clamped = Math.min(70, Math.max(25, pct));
    setSplit(clamped);
    try {
      sessionStorage.setItem("verxa-agent-split", String(Math.round(clamped)));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const up = () => { dragRef.current = false; };
    const move = (e: MouseEvent) => onDrag(e.clientX);
    window.addEventListener("mouseup", up);
    window.addEventListener("mousemove", move);
    return () => {
      window.removeEventListener("mouseup", up);
      window.removeEventListener("mousemove", move);
    };
  }, [onDrag]);

  const live = state.loading || (!["completed", "error", "stopped"].includes(state.status) && state.active);
  const lastEvent = state.events.at(-1) ?? null;

  const agentPane = (
    <div className="flex min-h-0 flex-1 flex-col bg-black">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
        <AgentStatus status={state.status} live={live} />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close agent workspace"
          className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {leftExtra}
        <AgentMessage role="user">{userRequest}</AgentMessage>
        <AgentMessage role="agent">
          {state.error
            ? "Browser interaction failed."
            : state.answer
              ? state.answer
              : state.status === "completed"
                ? "Done."
                : narrate(state.status, state.finalUrl)}
        </AgentMessage>
        {state.error ? (
          <div className="rounded-[12px] border border-red-500/25 bg-red-500/[0.07] px-3 py-2.5 text-[13px] leading-relaxed text-red-300">
            <p className="flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {state.error}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <MiniBtn onClick={agent.retry}>Retry</MiniBtn>
              <MiniBtn onClick={agent.takeControl}>Take control</MiniBtn>
            </div>
          </div>
        ) : null}
        <AgentExecutionTimeline events={state.events} />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-4 py-2.5">
        <ExecutionControls
          paused={state.paused}
          busy={live}
          onPause={agent.pause}
          onResume={agent.resume}
          onStop={agent.stop}
          onRetry={agent.retry}
        />
        <TakeControlButton
          userControl={state.userControl}
          onTake={agent.takeControl}
          onGiveBack={agent.giveBack}
        />
      </div>
    </div>
  );

  const browserPane = (
    <div className="flex min-h-0 flex-1 flex-col border-white/10 bg-[#0c0c10] max-md:border-t md:border-l">
      <BrowserToolbar
        url={state.finalUrl}
        title={state.pageTitle}
        loading={state.loading}
        canBack={state.historyIndex > 0}
        canForward={state.historyIndex < state.history.length - 1}
        onBack={() => agent.go(-1)}
        onForward={() => agent.go(1)}
        onRefresh={agent.retry}
        onFullscreen={() => setFullscreen((v) => !v)}
        fullscreen={fullscreen}
      />
      <BrowserViewport
        screenshot={state.screenshot}
        loading={state.loading}
        status={state.status}
        lastAction={lastEvent?.label ?? null}
        userControl={state.userControl}
      />
    </div>
  );

  return (
    <div ref={wrapRef} className={cn("flex min-h-0 flex-1", fullscreen ? "flex-col" : "flex-col md:flex-row")}>
      {/* Mobile toggle: Chat | Browser (session stays alive when switching) */}
      <div className="flex gap-1 border-b border-white/10 p-2 md:hidden">
        {(["chat", "browser"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setMobileTab(t)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-[9px] px-3 py-2 text-[13px] font-medium transition",
              mobileTab === t ? "bg-white text-black" : "text-white/60 hover:text-white",
            )}
          >
            {t === "chat" ? <MessageSquare size={13} /> : <Monitor size={13} />}
            {t === "chat" ? "Chat" : "Browser"}
          </button>
        ))}
      </div>

      {fullscreen ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-white/10 bg-black px-4 py-2">
            <AgentStatus status={state.status} live={live} />
            <span className="truncate text-[12px] text-white/40">{lastEvent?.label}</span>
          </div>
          {browserPane}
        </div>
      ) : (
        <>
          <div
            className={cn("min-h-0 flex-col md:flex", mobileTab === "chat" ? "flex flex-1" : "hidden md:flex")}
            style={{ width: `${split}%` }}
          >
            {agentPane}
          </div>
          {/* Resizable divider (desktop) */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panels"
            onMouseDown={() => { dragRef.current = true; }}
            className="hidden w-1.5 cursor-col-resize bg-transparent transition hover:bg-emerald-400/30 md:block"
          />
          <div
            className={cn("min-h-0 flex-1 flex-col md:flex", mobileTab === "browser" ? "flex flex-1" : "hidden md:flex")}
          >
            {browserPane}
          </div>
        </>
      )}
    </div>
  );
}

function narrate(status: string, url: string | null): string {
  switch (status) {
    case "thinking":
      return "I'll open the browser and work through this for you.";
    case "opening":
      return `Opening ${url ?? "the website"}…`;
    case "navigating":
      return "Navigating to the page…";
    case "clicking":
      return "Clicking through to the right section…";
    case "typing":
      return "Typing into the page…";
    case "reading":
      return "Reading the page…";
    case "scrolling":
      return "Scrolling to see more…";
    case "waiting":
      return "Waiting for the page to respond…";
    case "paused":
      return "Paused — take a look, then continue when you're ready.";
    case "stopped":
      return "Stopped. The browser session is closed for this task.";
    default:
      return "Working in the browser…";
  }
}

function MiniBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[8px] border border-white/15 px-2.5 py-1 text-[12px] text-white/75 transition hover:text-white"
    >
      {children}
    </button>
  );
}
