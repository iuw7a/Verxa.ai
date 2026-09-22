"use client";

import { Loader2, MonitorSmartphone } from "lucide-react";

/**
 * Web-only session state — no install, no download, no desktop app.
 * The user stays inside the Verxa website: starting a session provisions
 * a secure cloud browser session on the backend. Nothing is simulated —
 * the session view streams the real remote screen.
 */
export function PairingPanel({
  watching,
}: {
  watching: boolean;
  reconnect?: boolean;
}) {

  return (
    <div className="rounded-[18px] border border-line bg-card p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-line bg-white/[0.03] text-[#8ea4ff]">
          <MonitorSmartphone size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[17px] font-medium text-ink">
            Web-Sitzung bereit
          </h2>
          <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
            Computer Use läuft als Web-Sitzung direkt hier in Verxa — keine
            Installation, kein Download, keine Desktop-App. Nichts wird simuliert.
          </p>
        </div>
      </div>

      <ol className="mt-5 space-y-3">
        {[
          <>
            Beschreibung eingeben und <span className="text-ink">Session starten</span>{" "}
            — Verxa legt eine sichere Cloud-Browser-Sitzung für dich an.
          </>,
          <>
            Du siehst den Bildschirm und die Aktionen der KI live hier auf der Website.
          </>,
          <>
            Sensible Aktionen bestätigst du direkt im Web-UI. Danach geht es im
            normalen Chat weiter.
          </>,
        ].map((text, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-white/[0.03] text-[11.5px] text-muted">
              {i + 1}
            </span>
            <span className="text-[13.5px] leading-relaxed text-ink/85">
              {text}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[12px] border border-line bg-white/[0.02] px-3.5 py-3">
        {watching ? (
          <Loader2 size={14} className="animate-spin text-[#8ea4ff]" />
        ) : null}
        <span className="text-[12.5px] text-muted">
          {watching
            ? "Web-Sitzung wird vorbereitet… diese Seite aktualisiert sich von selbst."
            : "Bereit — direkt hier starten, ohne etwas zu installieren."}
        </span>
      </div>
    </div>
  );
}
