"use client";

import {
  MarketingHeader,
  MarketingFooter,
} from "@/components/marketing/chrome";

export function MarketingShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-[760px] flex-1 px-6 py-14">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
