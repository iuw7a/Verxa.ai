"use client";

import { cn } from "@/lib/utils";

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "subtle" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-[10px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
        size === "sm" ? "h-8 px-3 text-[13px]" : size === "lg" ? "h-11 px-5 text-[15px]" : "h-10 px-4 text-[14px]",
        variant === "primary" && "btn-primary",
        variant === "ghost" && "btn-ghost",
        variant === "outline" && "btn-outline",
        variant === "subtle" && "btn-outline",
        variant === "danger" &&
          "bg-[#3a1518] text-danger transition hover:bg-[#4a1b1f]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-medium text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-[12px] text-faint">{hint}</span> : null}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "input-base h-10 w-full rounded-[10px] px-3.5 text-[14px]",
        props.className,
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "input-base min-h-[110px] w-full resize-y rounded-[12px] px-3.5 py-3 text-[14px] leading-relaxed",
        props.className,
      )}
    />
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "focus-ring relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-150",
        checked ? "bg-accent" : "bg-white/10",
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] left-[2px] h-[18px] w-[18px] rounded-full bg-white transition-transform duration-150",
          checked && "translate-x-[16px]",
        )}
      />
    </button>
  );
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-card rounded-[16px] p-5", className)}>
      {children}
    </div>
  );
}

/** Small pill label for statuses and metadata. */
export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "danger" | "ok";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tone === "neutral" && "border-line bg-white/[0.04] text-muted",
        tone === "accent" && "border-accent/25 bg-accent-soft text-accent-strong",
        tone === "danger" && "border-red-500/25 bg-red-500/[0.08] text-danger",
        tone === "ok" && "border-emerald-500/25 bg-emerald-500/[0.08] text-ok",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Compact segmented control for small option sets (aspect ratio, mode…). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: React.ReactNode; title?: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn("flex gap-0.5 rounded-[10px] border border-line bg-white/[0.03] p-0.5", className)}
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            "focus-ring h-7 flex-1 rounded-[8px] px-2 text-[12.5px] font-medium transition",
            value === o.value
              ? "bg-accent-soft text-accent-strong"
              : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Minimal spinner sized via font-size. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-white/15 border-t-[var(--accent)]",
        className,
      )}
    />
  );
}
