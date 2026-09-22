"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, GitCommit, Sparkles } from "lucide-react";
import { VerxaMark } from "@/components/brand/verxa-mark";

const releases = [
  {
    version: "v2.4.0",
    date: "September 2026",
    title: "Verxa Code Redesign & Cloud Engine v2",
    tag: "Major",
    items: [
      "Complete visual redesign inspired by modern developer platforms (obsidian dark palette & Verxa green).",
      "Unified multi-model code agent routing between Qwen3 Coder Plus, NVIDIA GPT-OSS 20B, and Codestral.",
      "Live preview sandbox with responsive device viewports (Desktop, Tablet, Mobile) and auto-reload.",
      "Integrated line-by-line diff viewer and terminal output for streaming agent file edits.",
      "Added direct push to GitHub and automated Vercel deployment pipelines.",
      "New German/English localized User Account Menu with live notification center and theme switcher.",
    ],
  },
  {
    version: "v2.3.0",
    date: "August 2026",
    title: "Agentic Tool Execution & File Explorer",
    tag: "Feature",
    items: [
      "Support for multi-file workspace manipulation with write_file, read_file, and list_files tools.",
      "Real-time token streaming with fallback recovery on gateway timeouts.",
      "Mini-chess companion while waiting for complex multi-step application builds.",
    ],
  },
  {
    version: "v2.1.0",
    date: "July 2026",
    title: "Initial Verxa Code Engine Preview",
    tag: "Release",
    items: [
      "Project workspaces with isolated database persistence and project prompt seeds.",
      "ZIP download export for local offline development.",
      "Basic web preview and markdown diff inspection.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-dvh bg-[#07080a] text-white selection:bg-[#8f96a3]/20 selection:text-white">
      {/* Header */}
      <header className="border-b border-white/[0.08] px-6 py-4 sm:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <VerxaMark size={24} />
            <span className="text-[15px] font-semibold text-white">
              Verxa <span className="text-[#8f96a3]">Code</span>
            </span>
          </Link>
          <Link
            href="/code"
            className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 py-1.5 text-[13px] text-white/80 transition hover:border-white/30 hover:text-white"
          >
            <ArrowLeft size={14} /> Back to Code
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#8f96a3]/30 bg-[#8f96a3]/10 px-3 py-0.5 text-[12px] font-medium text-[#8f96a3]">
            <Sparkles size={13} /> Product Updates
          </span>
          <h1 className="mt-4 text-[36px] font-medium tracking-tight sm:text-[46px]">
            Changelog
          </h1>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-white/60">
            Follow the latest features, engine upgrades, and improvements shipped to Verxa Code.
          </p>
        </div>

        <div className="mt-16 space-y-12">
          {releases.map((rel) => (
            <article
              key={rel.version}
              className="rounded-2xl border border-white/10 bg-[#0d0f14] p-6 sm:p-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-md border border-[#8f96a3]/40 bg-[#8f96a3]/15 px-2 py-0.5 font-mono text-[12px] font-semibold text-[#8f96a3]">
                    {rel.version}
                  </span>
                  <h2 className="text-[18px] font-semibold text-white">{rel.title}</h2>
                </div>
                <span className="text-[12.5px] text-white/40">{rel.date}</span>
              </div>

              <ul className="mt-6 space-y-3">
                {rel.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-[14px] leading-relaxed text-white/75">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#8f96a3]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
