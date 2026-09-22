"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowUp,
  Check,
  Command,
  Cpu,
  FileCode2,
  Loader2,
  TerminalSquare,
  WandSparkles,
  Zap,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import type { CodeProject } from "@/lib/code-types";
import { CodeSidebar } from "@/components/code/code-sidebar";
import { AccountMenu } from "@/components/code/account-menu";
import { VerxaMark } from "@/components/brand/verxa-mark";
import { StitchBackground } from "@/components/stitch/stitch-background";

const EXAMPLE_PROMPTS = [
  "A conversion-focused landing page for a brutalist coffee brand",
  "A project tracker with kanban, comments, and keyboard shortcuts",
  "A polished analytics dashboard for a climate-tech startup",
  "A booking flow with availability, payments, and email confirmation",
] as const;

const capabilityCards = [
  { icon: WandSparkles, title: "Build from intent", body: "Turn a rough idea into a working product." },
  { icon: TerminalSquare, title: "Run the stack", body: "APIs, data, auth, and commands in one loop." },
  { icon: FileCode2, title: "Ship with confidence", body: "Preview, inspect, and deploy every change." },
];

export default function CodeDashboardPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(text: string) {
    const value = text.trim();
    if (!value || creating) return;
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/code?prompt=${encodeURIComponent(value)}`)}`);
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/code/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: value }),
      });
      const json = (await res.json()) as { project?: CodeProject; error?: string; hint?: string | null };
      if (!res.ok || !json.project) {
        setError(json.hint ?? json.error ?? "Could not create the project. Please try again.");
        return;
      }
      setPrompt("");
      router.push(`/code/${json.project.id}`);
    } catch {
      setError("Could not create the project. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  const name = profile.displayName || user?.email?.split("@")[0] || "builder";
  return (
    <div className="relative min-h-dvh overflow-hidden bg-black text-white selection:bg-[#10141a]/25 selection:text-white">
      <StitchBackground />
      <div className="relative z-10 flex min-h-dvh">
        <CodeSidebar className="hidden md:flex" onNewProject={() => document.getElementById("verxa-code-prompt")?.focus()} activeTab="new" />

        <main className="min-w-0 flex-1">
          <header className="flex h-16 items-center justify-between border-b border-white/[0.08] bg-[#080a0e]/80 px-5 backdrop-blur-xl sm:px-8">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 md:hidden">
                <VerxaMark size={22} />
                <span className="text-[14px] font-semibold">Verxa <span className="text-[#10141a]">Code</span></span>
              </Link>
              <div className="hidden items-center gap-2 text-[12px] text-white/40 md:flex">
                <span>Workspace</span><span className="text-white/20">/</span><span className="text-white/75">New project</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[11px] text-white/50 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10141a] shadow-[0_0_10px_#10141a]" /> Agent online
              </div>
              <AccountMenu placement="top-right" className="w-auto" />
            </div>
          </header>

          <div className="mx-auto max-w-[1360px] px-5 py-8 sm:px-8 sm:py-12 lg:px-12">
            <section className="grid items-end gap-8 lg:grid-cols-[1fr_360px]">
              <div>
                <div className="mb-5 flex items-center gap-2 text-[11px] font-medium tracking-[0.16em] text-[#10141a] uppercase">
                  <span className="h-px w-8 bg-[#10141a]/70" /> Autonomous build workspace
                </div>
                <h1 className="max-w-[760px] text-[clamp(2.5rem,6vw,5.8rem)] font-medium leading-[0.94] tracking-[-0.065em] text-white">
                  Make the idea<br /><span className="text-white/35">real, fast.</span>
                </h1>
                <p className="mt-6 max-w-[570px] text-[15px] leading-7 text-white/55 sm:text-[16px]">
                  {user ? `Good to see you, ${name}. ` : "Describe what you want to ship. "}
                  Your agent plans the work, writes the code, and gives you a live product to iterate on.
                </p>
              </div>

              <div className="hidden rounded-2xl border border-white/10 bg-white/[0.035] p-4 lg:block">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-white/70"><Activity size={14} className="text-[#10141a]" /> Agent loop</div>
                  <span className="font-mono text-[10px] text-white/35">READY</span>
                </div>
                <div className="space-y-3 pt-4 text-[12px]">
                  {["Understand intent", "Plan architecture", "Write + verify"].map((step, index) => (
                    <div key={step} className="flex items-center gap-3 text-white/55">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${index === 0 ? "border-[#10141a]/60 bg-[#10141a]/10 text-[#10141a]" : "border-white/15 text-white/35"}`}>{index === 0 ? <Check size={11} /> : index + 1}</span>
                      {step}
                      {index === 0 ? <span className="ml-auto text-[10px] text-[#10141a]">listening</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-10 max-w-[900px]">
              <div className="group overflow-hidden rounded-[22px] border border-white/15 bg-[#10141a]/90 shadow-[0_30px_100px_rgba(0,0,0,0.45)] transition focus-within:border-[#10141a]/55 focus-within:shadow-[0_24px_90px_rgba(143,150,163,0.1)]">
                <div className="flex items-center gap-2 border-b border-white/[0.07] px-5 py-3 text-[11px] font-mono text-white/35">
                  <Command size={13} className="text-[#10141a]" /> NEW PROJECT <span className="text-white/15">—</span> tell the agent what to build
                </div>
                <textarea
                  id="verxa-code-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(prompt); } }}
                  rows={4}
                  placeholder="Build me a beautiful…"
                  className="min-h-[128px] w-full resize-none bg-transparent px-5 py-5 text-[17px] leading-relaxed text-white outline-none placeholder:text-white/25 sm:text-[18px]"
                />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] bg-black/20 px-4 py-3">
                  <div className="flex items-center gap-2 text-[11px] text-white/35"><Cpu size={13} className="text-[#10141a]" /> Qwen 3 Coder Plus <span className="text-white/15">•</span> Full-stack agent</div>
                  <button type="button" onClick={() => void submit(prompt)} disabled={!prompt.trim() || creating} className="flex h-9 items-center gap-2 rounded-xl bg-[#10141a] px-4 text-[12px] font-semibold text-white transition hover:bg-[#171b22] disabled:cursor-not-allowed disabled:opacity-30">
                    {creating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} fill="currentColor" />} {creating ? "Starting…" : "Start building"} <ArrowUp size={14} />
                  </button>
                </div>
              </div>
              {error ? <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-[13px] text-red-300">{error}</p> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((example) => <button key={example} type="button" onClick={() => { setPrompt(example); void submit(example); }} className="rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2 text-left text-[11.5px] text-white/50 transition hover:border-[#10141a]/35 hover:bg-[#10141a]/[0.06] hover:text-white">{example}</button>)}
              </div>
            </section>

            <section className="mt-14 grid gap-3 md:grid-cols-3">
              {capabilityCards.map(({ icon: Icon, title, body }) => <div key={title} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition hover:border-white/15 hover:bg-white/[0.045]"><Icon size={17} className="text-[#10141a]" /><h2 className="mt-4 text-[13px] font-medium text-white">{title}</h2><p className="mt-1.5 text-[12px] leading-5 text-white/40">{body}</p></div>)}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
