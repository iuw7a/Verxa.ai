import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileCode2,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  WandSparkles,
} from "lucide-react";
import { VerxaMark } from "@/components/brand/verxa-mark";
import { StitchBackground } from "@/components/stitch/stitch-background";
import { isAdminEmail } from "@/lib/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Verxa Code — Coming Soon | Verxa AI",
  description:
    "Verxa Code turns a prompt into a running project: the agent writes the files, runs the commands and keeps a live preview in front of you. Private beta.",
};

/** Same promises as the dashboard capability cards, so the teaser matches the product. */
const capabilities = [
  { icon: WandSparkles, title: "Build from intent", body: "Describe the product. Pages, data, auth and styling get wired up without a template." },
  { icon: TerminalSquare, title: "Run the stack", body: "The agent edits files, runs commands and fixes what breaks until the build is green." },
  { icon: FileCode2, title: "Ship with confidence", body: "Live preview, a real diff for every change, one-click export and deploy." },
];

const agentSteps = [
  { tool: "list_files", detail: "scaffold", result: "14 files" },
  { tool: "write_file", detail: "app/page.tsx", result: "+148" },
  { tool: "write_file", detail: "components/pricing.tsx", result: "+96" },
  { tool: "run_command", detail: "npm run build", result: "pass 2.4s" },
];

const included = ["Full-stack agent", "Files & diffs", "Live preview", "One-click export"];

export default async function CodeComingSoonPage() {
  const supabase = await createServerSupabase();
  const { data } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };
  const isAdmin = isAdminEmail(data.user?.email);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-black text-white selection:bg-white/15">
      <StitchBackground />
      {/* Keep the aurora behind the hero — the sections below sit on calm black. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.45)_36%,rgba(0,0,0,0.88)_56%,#000_72%)]"
      />

      <div className="relative z-10 flex min-h-dvh flex-col">
        {/* ---------------- header ---------------- */}
        <header className="flex h-16 items-center justify-between gap-3 border-b border-white/[0.07] bg-[#080a0e]/70 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="focus-ring flex items-center gap-2.5 rounded-[10px] transition-opacity hover:opacity-90"
            >
              <VerxaMark size={22} />
              <span className="text-[14px] font-semibold tracking-[-0.02em] whitespace-nowrap">
                Verxa <span className="font-normal text-white/45">Code</span>
              </span>
            </Link>
            <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] tracking-[0.14em] whitespace-nowrap text-white/50 uppercase sm:inline-flex">
              <span className="status-dot h-1.5 w-1.5 rounded-full bg-[#3ddc97]" />
              Private beta
            </span>
          </div>
          <Link
            href="/chat"
            className="btn-outline focus-ring inline-flex h-9 shrink-0 items-center gap-2 rounded-[10px] px-4 text-[13px] font-medium"
          >
            <MessageSquare size={14} className="text-accent" />
            Open chat
          </Link>
        </header>
        <main className="flex-1">
          {/* ---------------- hero ---------------- */}
          <section className="mx-auto grid w-full max-w-[1160px] items-center gap-12 px-5 pt-14 pb-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:pt-24">
            <div className="animate-rise">
              <p className="flex flex-wrap items-center gap-2 font-mono text-[11.5px] text-white/40">
                <span className="text-[#3ddc97]">$</span>
                <span>verxa code --status</span>
                <span aria-hidden className="animate-caret-blink text-white/70">
                  ▌
                </span>
              </p>

              <h1 className="mt-6 text-[42px] leading-[1.03] font-medium tracking-[-0.045em] sm:text-[58px]">
                Coming soon
                <span className="mt-2 block text-[22px] leading-tight font-normal tracking-[-0.03em] text-white/45 sm:text-[26px]">
                  Verxa Code is building itself.
                </span>
              </h1>

              <p className="mt-6 max-w-[540px] text-[16.5px] leading-relaxed text-white/60 sm:text-[17.5px]">
                Turn a prompt into a running project: the agent writes the files,
                runs the commands and keeps a live preview in front of you.
                Describe it, watch it get built, ship it.
              </p>
              <p className="mt-3 max-w-[540px] text-[14px] leading-relaxed text-white/35">
                Private beta — access stays with the Verxa team for now.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/chat"
                  className="btn-primary focus-ring inline-flex h-11 items-center gap-2 rounded-xl px-5 text-[14px] font-semibold"
                >
                  <MessageSquare size={15} />
                  Back to chat
                </Link>
                <Link
                  href="/studio"
                  className="btn-outline focus-ring inline-flex h-11 items-center gap-2 rounded-xl px-5 text-[14px] font-medium"
                >
                  <Sparkles size={15} className="text-accent" />
                  Open Barada Studio
                </Link>
              </div>

              <ul className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2">
                {included.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-1.5 text-[12.5px] text-white/40"
                  >
                    <Check size={13} className="text-[#3ddc97]" />
                    {item}
                  </li>
                ))}
              </ul>

              {isAdmin ? (
                <p className="mt-8 inline-flex flex-wrap items-center gap-2 rounded-xl border border-[#3ddc97]/25 bg-[#3ddc97]/[0.07] px-3.5 py-2.5 text-[12.5px] text-[#a9f2d5]">
                  <ShieldCheck size={14} />
                  You are signed in as an admin.
                  <Link
                    href="/code"
                    className="focus-ring inline-flex items-center gap-1 rounded font-semibold text-white underline decoration-white/30 underline-offset-4 transition hover:decoration-white"
                  >
                    Open Verxa Code
                    <ArrowRight size={12} />
                  </Link>
                </p>
              ) : null}
            </div>

            <div className="animate-rise" style={{ animationDelay: "90ms" }}>
              <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[#0b0d12]/85 shadow-[0_30px_100px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <span className="ml-2 truncate font-mono text-[11px] text-white/35">
                    verxa-code — agent session
                  </span>
                  <span className="ml-auto hidden shrink-0 items-center gap-1.5 text-[10px] tracking-[0.12em] text-white/35 uppercase sm:inline-flex">
                    <span className="status-dot h-1.5 w-1.5 rounded-full bg-[#3ddc97]" />
                    building
                  </span>
                </div>

                <div className="border-b border-white/[0.07] px-4 py-3.5">
                  <p className="font-mono text-[12.5px] leading-6 text-white/70">
                    <span className="mr-1.5 text-accent">›</span>
                    Add a pricing page with three tiers and a toggle
                  </p>
                </div>

                <ul className="divide-y divide-white/[0.05]">
                  {agentSteps.map((step, index) => (
                    <li
                      key={step.tool + step.detail}
                      className="animate-line-in flex items-center gap-3 px-4 py-2.5"
                      style={{ animationDelay: `${180 + index * 90}ms` }}
                    >
                      <Check
                        size={13}
                        className="animate-tool-done shrink-0 text-[#3ddc97]"
                        style={{ animationDelay: `${220 + index * 90}ms` }}
                      />
                      <span className="font-mono text-[12px] text-white/75">
                        {step.tool}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-white/35">
                        {step.detail}
                      </span>
                      <span className="shrink-0 font-mono text-[11.5px] text-white/45">
                        {step.result}
                      </span>
                    </li>
                  ))}
                  <li
                    className="animate-line-in flex items-center gap-3 px-4 py-2.5"
                    style={{ animationDelay: "560ms" }}
                  >
                    <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border border-white/15 border-t-white/60" />
                    <span className="font-mono text-[12px] text-white/75">
                      write_file
                    </span>
                    <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-white/35">
                      app/globals.css
                    </span>
                    <span className="status-dots shrink-0 font-mono text-[11.5px] text-white/45">
                      writing
                    </span>
                  </li>
                </ul>

                <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] bg-black/30 px-4 py-3">
                  <span className="font-mono text-[11.5px] text-white/40">
                    localhost:3001
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#3ddc97]/25 bg-[#3ddc97]/10 px-2.5 py-1 text-[10px] tracking-[0.12em] text-[#a9f2d5] uppercase">
                    <span className="status-dot h-1.5 w-1.5 rounded-full bg-[#3ddc97]" />
                    preview ready
                  </span>
                </div>
              </div>
              <p className="mt-3 text-center font-mono text-[11px] text-white/25">
                Tools, diffs and previews from a real Verxa Code session.
              </p>
            </div>
          </section>
        </main>
        {/* ---------------- what is coming ---------------- */}
        <section className="mx-auto w-full max-w-[1160px] px-5 pb-16 sm:px-8">
          <p className="eyebrow">What is coming</p>
          <h2 className="display-2 mt-3 text-[26px] sm:text-[32px]">
            From a sentence to a shipped project
          </h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {capabilities.map(({ icon: Icon, title, body }, index) => (
              <div
                key={title}
                className="bg-card hover-lift animate-item-rise relative overflow-hidden rounded-[18px] p-6"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <span className="pointer-events-none absolute top-5 right-5 font-mono text-[11px] text-white/15">
                  0{index + 1}
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-accent-soft text-accent">
                  <Icon size={18} />
                </span>
                <h3 className="mt-5 text-[15.5px] font-medium tracking-[-0.02em]">
                  {title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------- early access ---------------- */}
        <section className="mx-auto w-full max-w-[1160px] px-5 pb-20 sm:px-8">
          <div className="bg-card flex flex-col gap-5 rounded-[20px] p-7 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="max-w-[560px]">
              <h2 className="display-2 text-[20px] sm:text-[22px]">Want in early?</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">
                Verxa Code opens in waves. Tell us what you want to build and we
                will move you into the first group.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <Link
                href="/support"
                className="btn-primary focus-ring inline-flex h-10 items-center gap-2 rounded-[10px] px-5 text-[13.5px] font-semibold"
              >
                Request access
                <ArrowUpRight size={14} />
              </Link>
              <Link
                href="/changelog"
                className="btn-outline focus-ring inline-flex h-10 items-center rounded-[10px] px-5 text-[13.5px] font-medium"
              >
                Changelog
              </Link>
            </div>
          </div>
        </section>

        {/* ---------------- footer ---------------- */}
        <footer className="border-t border-white/[0.07] px-5 py-6 sm:px-8">
          <div className="mx-auto flex w-full max-w-[1160px] flex-col gap-3 text-[12px] text-white/30 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Verxa AI · {new Date().getFullYear()} · Verxa Code is in private beta
            </span>
            <div className="flex items-center gap-5">
              <Link href="/docs" className="focus-ring rounded transition hover:text-white/60">
                Docs
              </Link>
              <Link href="/studio" className="focus-ring rounded transition hover:text-white/60">
                Barada Studio
              </Link>
              <Link href="/chat" className="focus-ring rounded transition hover:text-white/60">
                Chat
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

