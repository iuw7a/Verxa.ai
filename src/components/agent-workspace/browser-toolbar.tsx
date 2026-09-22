"use client";

import {
  ArrowLeft,
  ArrowRight,
  Globe,
  Loader2,
  Lock,
  Maximize2,
  Minimize2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

function hostOf(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Real-browser toolbar: back / forward / refresh / address / security. */
export function BrowserToolbar({
  url,
  title,
  loading,
  canBack,
  canForward,
  onBack,
  onForward,
  onRefresh,
  onFullscreen,
  fullscreen,
}: {
  url: string | null;
  title: string | null;
  loading: boolean;
  canBack: boolean;
  canForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onRefresh: () => void;
  onFullscreen: () => void;
  fullscreen: boolean;
}) {
  return (
    <div className="border-b border-white/10 bg-[#0c0c10]">
      <div className="flex items-center gap-1.5 px-3 pt-2.5">
        <span className="flex gap-1.5 pr-1" aria-hidden>
          <i className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <i className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <i className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </span>
        <div className="flex items-center gap-1">
          <ToolBtn label="Back" onClick={onBack} disabled={!canBack}><ArrowLeft size={13} /></ToolBtn>
          <ToolBtn label="Forward" onClick={onForward} disabled={!canForward}><ArrowRight size={13} /></ToolBtn>
          <ToolBtn label="Refresh" onClick={onRefresh}><RefreshCw size={12} className={cn(loading && "animate-spin")} /></ToolBtn>
        </div>
        <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-[9px] border border-white/10 bg-black/50 px-3">
          {loading ? (
            <Loader2 size={12} className="shrink-0 animate-spin text-emerald-300" />
          ) : (
            <Lock size={11} className="shrink-0 text-emerald-300/80" />
          )}
          <span className="truncate font-mono text-[12px] text-white/80">
            {url ?? "Starting browser…"}
          </span>
        </div>
        <ToolBtn label={fullscreen ? "Exit fullscreen" : "Fullscreen browser"} onClick={onFullscreen}>
          {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </ToolBtn>
      </div>
      <div className="flex items-center gap-2 px-4 py-1.5">
        <Globe size={11} className="shrink-0 text-white/30" />
        <p className="truncate text-[11.5px] text-white/45">
          {title || hostOf(url) || "Live browser session · isolated per user"}
        </p>
      </div>
    </div>
  );
}

function ToolBtn({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-white/55 transition hover:bg-white/10 hover:text-white disabled:opacity-25 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
