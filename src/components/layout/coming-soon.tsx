"use client";

import { AppShell } from "@/components/layout/app-shell";
import { VerxaMark } from "@/components/brand/verxa-mark";

export function ComingSoonPage({
  title,
  kicker,
  copy,
}: {
  title: string;
  kicker: string;
  copy: string;
}) {
  return (
    <AppShell>
      <div className="relative flex h-full items-center justify-center overflow-hidden px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--glow),transparent_68%)] opacity-70"
        />
        <div className="relative max-w-[460px] text-center">
          <VerxaMark size={44} className="mx-auto mb-6 opacity-80" />
          <p className="text-[12px] tracking-[0.16em] text-faint uppercase">
            {kicker}
          </p>
          <h1 className="mt-3 text-[36px] font-light tracking-[-0.05em]">
            {title}
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-muted">{copy}</p>
          <span className="mt-8 inline-flex rounded-full border border-line px-3 py-1 text-[11px] tracking-wide text-faint uppercase">
            Coming soon
          </span>
        </div>
      </div>
    </AppShell>
  );
}
