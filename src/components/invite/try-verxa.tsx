"use client";

import { ArrowRight } from "lucide-react";
import type { InviteDevice } from "@/lib/invite-onboarding";
import { sandboxRoute } from "@/lib/invite-onboarding";

export function TryVerxa({ name, device }: { name: string; device: InviteDevice }) {
  function recordCompleted() {
    try {
      const raw = localStorage.getItem("verxa-invite-onboarding");
      const visitId = raw ? (JSON.parse(raw).visitId as string | undefined) : undefined;
      fetch("/api/invite/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({ source: "admin", step: "completed", name, device, visitId }),
      }).catch(() => {});
    } catch {
      /* tracking is best-effort */
    }
  }

  return (
    <div className="flex w-full flex-col items-center text-center">
      <h2 className="text-[26px] font-medium tracking-tight text-white sm:text-[32px]">
        Ready to try Verxa{name ? `, ${name}` : ""}?
      </h2>
      <p className="mt-2 max-w-[400px] text-[14px] text-white/55">
        Your {device === "mobile" ? "mobile" : "desktop"} workspace is ready.
        Step inside and start with anything on your mind.
      </p>
      <a
        href={sandboxRoute(device)}
        onClick={recordCompleted}
        className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-[15px] font-semibold text-black transition hover:bg-white/85 focus-visible:ring-2 focus-visible:ring-emerald-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none"
      >
        Try Verxa now <ArrowRight size={17} />
      </a>
      <p className="mt-3 text-[12px] text-white/35">
        Opens your {device === "mobile" ? "mobile" : "desktop"} chat
      </p>
    </div>
  );
}
