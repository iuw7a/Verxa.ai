"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export function VerxaMark({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <Image
      src="/verxa-logo.png"
      alt="Verxa"
      width={size}
      height={size}
      className={cn("select-none object-contain", className)}
      priority
    />
  );
}

export function VerxaWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <VerxaMark size={compact ? 22 : 26} />
      <span className="text-[15px] font-medium tracking-[-0.03em] text-ink">
        Verxa
        <span className="ml-1 font-normal text-muted">AI</span>
      </span>
    </span>
  );
}
