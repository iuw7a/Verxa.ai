"use client";

import { Hand, Pause, Play, RotateCcw, Square } from "lucide-react";

/** Pause / Stop / Continue — Stop aborts the SSE run immediately. */
export function ExecutionControls({
  paused,
  busy,
  onPause,
  onResume,
  onStop,
  onRetry,
}: {
  paused: boolean;
  busy: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {paused ? (
        <CtrlBtn onClick={onResume} label="Continue"><Play size={12} /> Continue</CtrlBtn>
      ) : (
        <CtrlBtn onClick={onPause} disabled={!busy} label="Pause"><Pause size={12} /> Pause</CtrlBtn>
      )}
      <CtrlBtn onClick={onStop} danger label="Stop"><Square size={12} /> Stop</CtrlBtn>
      {!busy ? (
        <CtrlBtn onClick={onRetry} label="Retry"><RotateCcw size={12} /> Retry</CtrlBtn>
      ) : null}
    </div>
  );
}

export function TakeControlButton({
  userControl,
  onTake,
  onGiveBack,
}: {
  userControl: boolean;
  onTake: () => void;
  onGiveBack: () => void;
}) {
  return userControl ? (
    <button
      type="button"
      onClick={onGiveBack}
      className="flex items-center gap-1.5 rounded-[9px] border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-[12.5px] font-medium text-emerald-200 transition hover:bg-emerald-400/20"
    >
      <Play size={12} /> Give control back
    </button>
  ) : (
    <button
      type="button"
      onClick={onTake}
      className="flex items-center gap-1.5 rounded-[9px] border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12.5px] text-white/70 transition hover:text-white"
    >
      <Hand size={12} /> Take control
    </button>
  );
}

function CtrlBtn({
  children,
  onClick,
  disabled,
  danger,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={
        danger
          ? "flex items-center gap-1.5 rounded-[9px] border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[12.5px] text-red-300 transition hover:bg-red-500/20 disabled:opacity-40"
          : "flex items-center gap-1.5 rounded-[9px] border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12.5px] text-white/70 transition hover:text-white disabled:opacity-40"
      }
    >
      {children}
    </button>
  );
}
