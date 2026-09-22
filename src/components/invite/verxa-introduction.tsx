"use client";

import { VerxaMark } from "@/components/brand/verxa-mark";

export function VerxaIntroduction({ name }: { name: string }) {
  return (
    <div className="flex w-full flex-col items-center text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] shadow-[0_0_60px_rgba(110,231,183,0.10)]">
        <VerxaMark size={34} />
      </span>
      <h2 className="mt-6 text-[28px] font-medium tracking-tight text-white sm:text-[34px]">
        Welcome{ name ? `, ${name}` : ""}.
      </h2>
      <p className="mt-3 max-w-[440px] text-[15px] leading-relaxed text-white/65">
        Meet Verxa AI — an intelligent workspace built to help you think,
        create, research, browse and get things done.
      </p>
    </div>
  );
}
