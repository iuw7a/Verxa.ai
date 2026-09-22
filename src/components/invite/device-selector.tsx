"use client";

import { Monitor, Smartphone } from "lucide-react";
import type { InviteDevice } from "@/lib/invite-onboarding";
import { cn } from "@/lib/utils";

export function DeviceSelector({
  value,
  onSelect,
}: {
  value: InviteDevice | null;
  onSelect: (device: InviteDevice) => void;
}) {
  const options: { id: InviteDevice; icon: React.ReactNode; title: string; sub: string }[] = [
    {
      id: "mobile",
      icon: <Smartphone size={26} strokeWidth={1.6} />,
      title: "Mobile",
      sub: "Use Verxa on your phone",
    },
    {
      id: "desktop",
      icon: <Monitor size={26} strokeWidth={1.6} />,
      title: "Desktop",
      sub: "Use Verxa on your computer",
    },
  ];
  return (
    <div role="radiogroup" aria-label="Choose your device" className="grid w-full gap-3 sm:grid-cols-2">
      {options.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(opt.id)}
            className={cn(
              "group flex items-center gap-4 rounded-2xl border p-5 text-left transition-all duration-200 outline-none",
              "focus-visible:ring-2 focus-visible:ring-emerald-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
              selected
                ? "border-emerald-200/40 bg-emerald-300/[0.07] shadow-[0_0_40px_rgba(110,231,183,0.12)]"
                : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]",
            )}
          >
            <span
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-colors",
                selected
                  ? "border-emerald-200/30 bg-emerald-300/10 text-emerald-100"
                  : "border-white/10 bg-white/[0.04] text-white/70 group-hover:text-white",
              )}
            >
              {opt.icon}
            </span>
            <span>
              <span className="block text-[16px] font-medium text-white">{opt.title}</span>
              <span className="mt-0.5 block text-[13.5px] text-white/55">{opt.sub}</span>
            </span>
            <span
              aria-hidden
              className={cn(
                "ml-auto h-4 w-4 shrink-0 rounded-full border transition-colors",
                selected ? "border-emerald-200 bg-emerald-300" : "border-white/25",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
