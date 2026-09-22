"use client";

/** Liquid Glass switch used across mobile profile subpages. */
export function GlassToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[26px] w-[44px] shrink-0 rounded-full border transition-all duration-300 ${
        checked
          ? "border-white/25 bg-accent shadow-[0_0_14px_-2px_var(--glow),inset_0_1px_0_rgba(255,255,255,0.35)]"
          : "border-white/12 bg-white/[0.07]"
      }`}
    >
      <span
        className={`absolute top-[2.5px] left-[3px] h-5 w-5 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.35)] transition-transform duration-300 ${
          checked ? "translate-x-[18px]" : ""
        }`}
        style={{ transitionTimingFunction: "cubic-bezier(0.32, 1.45, 0.5, 1)" }}
      />
    </button>
  );
}
