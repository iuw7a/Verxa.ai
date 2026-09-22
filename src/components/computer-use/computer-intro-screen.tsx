"use client";

import { MonitorSmartphone } from "lucide-react";
import { CrtBackground } from "@/shaders/crt/CrtBackground";

const EXAMPLES = ["open youtube", "open Barada.cloud", "open Google"];

/**
 * Intro-Screen für Computer Use (Web-Sitzung): CRT Blue-Screen als
 * Hintergrund, darüber in eigenen Worten, was Computer Use ist.
 * Keine Installation, keine Desktop-App — alles läuft hier im Web.
 */
export function ComputerIntroScreen({
  onSelect,
}: {
  onSelect: (text: string) => void;
}) {
  return (
    <div className="w-full">
      <div className="shader-frame relative w-full overflow-hidden rounded-[20px] border border-white/10">
        <div className="relative h-[300px] w-full sm:h-[340px]">
          <CrtBackground
            variant="blue-screen"
            speed={1.0}
            motion={1.0}
            hue={0}
            saturation={1.0}
            brightness={1.0}
            opacity={1.0}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
            <p className="flex flex-wrap items-center gap-2 text-[11px] font-medium tracking-[0.18em] text-teal-200/90 uppercase">
              <MonitorSmartphone size={13} />
              Computer Use · Web-Sitzung
              <span className="rounded-full border border-amber-200/30 bg-amber-300/15 px-2 py-0.5 text-[10px] tracking-[0.14em] text-amber-100">
                Coming soon
              </span>
            </p>
            <h2 className="mt-1.5 text-[24px] leading-tight font-medium tracking-[-0.02em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
              Computer Use kommt bald.
            </h2>
            <p className="mt-2 max-w-[560px] text-[13.5px] leading-relaxed text-white/85 drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]">
              Volle Web-Sitzungen direkt hier: Verxa öffnet Seiten, prüft sie
              live und zeigt dir jeden Schritt — ganz ohne Installation oder
              Desktop-App. Wir schalten es in Kürze frei.
            </p>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => onSelect(ex)}
            className="rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-[12.5px] text-white/70 transition hover:border-white/35 hover:text-white"
          >
            {ex}
          </button>
        ))}
        <span className="px-1 py-1.5 text-[12px] text-white/35">
          Zum Starten unten beschreiben + Enter.
        </span>
      </div>
    </div>
  );
}
