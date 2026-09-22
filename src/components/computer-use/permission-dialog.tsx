"use client";

import { useState } from "react";
import {
  AppWindow,
  Eye,
  Keyboard,
  MonitorSmartphone,
  MousePointerClick,
  ShieldCheck,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/primitives";

const CAPABILITIES = [
  { icon: Eye, text: "Bildschirm der Web-Sitzung live hier sehen" },
  { icon: MousePointerClick, text: "Maus in der Cloud-Browser-Sitzung bewegen und klicken" },
  { icon: Keyboard, text: "Tippen und Tasten drücken" },
  { icon: AppWindow, text: "Mit Apps und Fenstern in der Web-Sitzung arbeiten" },
  { icon: Square, text: "Sofort stoppen — Stop-Button direkt hier" },
];

/**
 * First-time consent dialog. Shown once while the server has no enabled
 * consent record; "Allow Computer Use" writes it server-side. Purely
 * presentational — the caller owns the API call and error handling.
 */
export function PermissionDialog({
  open,
  busy,
  error,
  onAllow,
  onNotNow,
}: {
  open: boolean;
  busy: boolean;
  error: string | null;
  onAllow: () => void;
  onNotNow: () => void;
}) {
  const [shown] = useState(true);
  if (!open || !shown) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={busy ? undefined : onNotNow}
      />
      <div className="animate-rise relative w-full max-w-[460px] overflow-hidden rounded-[22px] border border-white/10 bg-[#101017] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.75)] sm:p-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(80%_120%_at_50%_0%,rgba(142,164,255,0.14),transparent_70%)]" />
        <div className="relative">
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.04] text-[#8ea4ff]">
            <MonitorSmartphone size={20} />
          </span>
          <h2 className="mt-4 text-[22px] font-medium tracking-[-0.02em] text-ink">
            Web-Sitzung für Computer Use erlauben?
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
            Verxa legt dafür eine sichere Cloud-Browser-Sitzung direkt hier auf
            der Website an — Maus, Tastatur und Apps werden nur dort gesteuert,
            wenn du es ausdrücklich wünschst. Keine Installation nötig.
          </p>

          <ul className="mt-4 space-y-2.5">
            {CAPABILITIES.map((c) => {
              const Icon = c.icon;
              return (
                <li key={c.text} className="flex items-center gap-3 text-[13.5px] text-ink/90">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-white/[0.05] text-white/60">
                    <Icon size={14} />
                  </span>
                  {c.text}
                </li>
              );
            })}
          </ul>

          <p className="mt-4 flex items-start gap-2 rounded-[12px] border border-line bg-white/[0.02] px-3 py-2.5 text-[12.5px] leading-relaxed text-faint">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-ok" />
            Safe Mode blockiert irreversible Aktionen. Du kannst Computer Use
            jederzeit in den Einstellungen → Sicherheit ausschalten.
          </p>

          {error ? (
            <p className="mt-3 text-[13px] text-danger">{error}</p>
          ) : null}

          <div className="mt-5 flex gap-3">
            <Button
              size="lg"
              className="flex-1"
              disabled={busy}
              onClick={onAllow}
            >
              {busy ? "Enabling…" : "Allow Computer Use"}
            </Button>
            <Button size="lg" variant="ghost" disabled={busy} onClick={onNotNow}>
              Not Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
