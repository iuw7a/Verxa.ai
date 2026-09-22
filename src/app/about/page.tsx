import Link from "next/link";
import { MarketingShell } from "@/components/marketing/shell";

export const metadata = { title: "About · Verxa AI" };

export default function AboutPage() {
  return (
    <MarketingShell>
      <h1 className="text-[34px] font-light tracking-[-0.045em]">About Verxa</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-muted">
        Verxa is a calm, precise AI assistant built in Berlin. We believe AI
        tools should feel quiet and trustworthy — fast answers when you need
        them, honest uncertainty when we don&apos;t know, and your data staying
        yours.
      </p>

      <h2 className="mt-10 text-[22px] font-medium tracking-[-0.03em]">
        What makes Verxa different
      </h2>
      <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-muted">
        <li>
          <strong className="text-ink">Model choice by default.</strong>{" "}
          Eight curated models — from fast small talk to deep reasoning, vision
          and code — switchable per conversation.
        </li>
        <li>
          <strong className="text-ink">Search you can trust.</strong> When a
          question needs current information, Verxa searches the live web and
          shows its sources. When search finds nothing reliable, Verxa says so
          instead of inventing an answer.
        </li>
        <li>
          <strong className="text-ink">Honest by design.</strong> No fake
          confidence, no fabricated citations. If we couldn&apos;t verify it,
          we tell you.
        </li>
        <li>
          <strong className="text-ink">Free to start.</strong> Try three
          messages without an account. Sign in to sync your history across
          devices.
        </li>
      </ul>

      <h2 className="mt-10 text-[22px] font-medium tracking-[-0.03em]">
        The stack
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        Next.js, Supabase auth and storage, and open models served through the
        NVIDIA API catalog — combined with live Google search results.
      </p>

      <Link
        href="/chat"
        className="mt-10 inline-block rounded-[12px] bg-accent px-6 py-2.5 text-[14.5px] font-medium text-[#0b0b10] transition hover:bg-accent-strong"
      >
        Try Verxa now
      </Link>
    </MarketingShell>
  );
}
