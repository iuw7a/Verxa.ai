"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, Code2, RotateCcw, Sparkles } from "lucide-react";
import { StitchBackground } from "@/components/stitch/stitch-background";
import { ModelChangeButton } from "@/components/chat/model-change-button";
import { AddMenuButton, type AddMenuAction } from "@/components/chat/add-menu";
import { useWorkspace } from "@/providers/workspace-provider";
import { useAuth } from "@/providers/auth-provider";

const SUGGESTIONS = [
  "Write a product launch post…",
  "Explain quantum computing simply…",
  "Create a cinematic image of…",
];

/**
 * Verxa AI landing in a Stitch-inspired look (own branding + own copy,
 * only the dark dotted + aurora visual language is borrowed).
 * Enter or the send button jumps straight into /chat.
 */
export default function LandingPage() {
  const router = useRouter();
  const { sendMessage, selectedModelId, setDefaultModel } = useWorkspace();
  const { user, profile, loading: authLoading } = useAuth();
  const [value, setValue] = useState("");
  const [computerOpen, setComputerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  function handleAddAction(action: AddMenuAction) {
    setAddOpen(false);
    if (action.kind === "link") router.push(action.href);
  }

  /** Members jump straight into /chat — guests are pointed at the sign-in form. */
  function goToChat(text: string) {
    const t = text.trim();
    if (!t) return;
    if (!user) {
      setValue("");
      router.push(`/login?next=${encodeURIComponent("/chat")}`);
      return;
    }
    setValue("");
    // sendMessage(null, …) creates the chat and router.push-es to /chat/[id]
    void sendMessage(null, t);
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-black text-white">
      <StitchBackground />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-[19px] font-medium tracking-tight">Verxa AI</span>
          <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-semibold tracking-widest text-white/70">
            BETA
          </span>
        </Link>
        <div className="flex items-center gap-3">
          {authLoading ? (
            <span className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
          ) : user ? (
            <>
              <Link
                href="/chat"
                className="rounded-full border border-white/20 bg-white/[0.03] px-5 py-1.5 text-[13.5px] text-white/85 backdrop-blur transition hover:border-white/40 hover:text-white"
              >
                Dashboard
              </Link>
              <Link
                href="/account/profile"
                title={profile.displayName || user.email || "Profile"}
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#c2185b] text-[13px] font-semibold ring-1 ring-white/20 transition hover:ring-white/50"
              >
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  (profile.displayName?.[0] || user.email?.[0] || "V").toUpperCase()
                )}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-white/20 bg-white/[0.03] px-5 py-1.5 text-[13.5px] text-white/85 backdrop-blur transition hover:border-white/40 hover:text-white"
              >
                Log in
              </Link>
              <Link
                href="/chat"
                className="rounded-full border border-white/20 bg-white/[0.03] px-5 py-1.5 text-[13.5px] text-white/85 backdrop-blur transition hover:border-white/40 hover:text-white"
              >
                Dashboard
              </Link>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#c2185b] text-[13px] font-semibold">
                V
              </span>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pt-6 pb-16 text-center">
        {/* Logo über der Headline — schwebt + Glow-Puls */}
        <div className="hero-logo-wrap mb-7 flex flex-col items-center">
          <div className="hero-logo-glow" aria-hidden="true" />
          <Image
            src="/verxa-logo.png"
            alt="Verxa Logo"
            width={92}
            height={92}
            priority
            className="hero-logo h-[72px] w-[72px] rounded-[22px] object-cover shadow-[0_12px_50px_rgba(0,0,0,0.55)] ring-1 ring-white/20 sm:h-[92px] sm:w-[92px]"
          />
          <span className="mt-3 flex items-center gap-2 text-[11px] font-semibold tracking-[0.32em] text-white/45 uppercase">
            <span className="h-px w-6 bg-gradient-to-r from-transparent to-white/40" />
            Verxa AI
            <span className="h-px w-6 bg-gradient-to-l from-transparent to-white/40" />
          </span>
        </div>

        <h1 className="hero-title max-w-[920px] text-[46px] leading-[1.0] font-semibold tracking-[-0.045em] text-balance sm:text-[82px]">
          <span className="hero-line">Chat at the</span>
          <br />
          <span className="hero-line hero-shine">speed of AI</span>
        </h1>
        <p className="hero-sub mt-5 max-w-[620px] text-[16px] leading-relaxed text-white/70 sm:text-[18px]">
          Transform ideas into answers, images and videos with Verxa AI
        </p>

        {/* Prompt box / Computer Use — stays on the landing page */}
        <div className="mt-10 w-full max-w-[680px]">
          {computerOpen ? (
            <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[#12121a]/90 text-left shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl">
              <div className="p-6 sm:p-7">
                <p className="flex flex-wrap items-center gap-2 text-[11px] font-medium tracking-[0.16em] text-white/40 uppercase">
                  Computer Use
                  <span className="rounded-full border border-amber-200/30 bg-amber-300/10 px-2 py-0.5 text-[10px] tracking-[0.14em] text-amber-100">
                    Coming soon
                  </span>
                </p>
                <p className="mt-2 text-[20px] font-medium tracking-[-0.02em] text-white">
                  Computer Use kommt bald.
                </p>
                <p className="mt-2 max-w-[520px] text-[13.5px] leading-relaxed text-white/60">
                  Volle Web-Sitzungen direkt hier — Verxa öffnet Seiten, prüft
                  sie live und zeigt dir jeden Schritt. Ganz ohne Installation
                  oder Desktop-App. Wir schalten es in Kürze frei.
                </p>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setComputerOpen(false)}
                  className="rounded-full px-4 py-1.5 text-[13px] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                >
                  ← Back to chat input
                </button>
                <Link href="/chat" className="rounded-full bg-white/[0.12] px-4 py-1.5 text-[13px] text-white transition hover:bg-white/[0.2]">
                  Open in Chat →
                </Link>
              </div>
            </div>
          ) : (
          <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[#12121a]/90 text-left shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl">
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  goToChat(value);
                }
              }}
              rows={3}
              placeholder="What shall Verxa do for you?"
              className="max-h-40 min-h-[84px] w-full resize-none bg-transparent px-5 pt-4 text-[15.5px] leading-relaxed text-white outline-none placeholder:text-white/40"
            />
            <div className="flex items-center justify-between gap-2 px-3 pb-3">
              <div className="flex items-center gap-2">
                <AddMenuButton open={addOpen} onOpenChange={setAddOpen} onAction={handleAddAction} />
                <div className="flex items-center rounded-full border border-white/10 bg-black/40 p-1">
                  <button
                    type="button"
                    onClick={() => setComputerOpen(false)}
                    aria-pressed={!computerOpen}
                    className={`rounded-full px-4 py-1.5 text-[13px] transition ${computerOpen ? "text-white/70 hover:bg-white/[0.08] hover:text-white" : "bg-white/[0.12] text-white"}`}
                  >
                    App
                  </button>
                  <button
                    type="button"
                    onClick={() => setComputerOpen(true)}
                    aria-pressed={computerOpen}
                    className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] transition ${computerOpen ? "bg-white/[0.12] text-white" : "text-white/70 hover:bg-white/[0.08] hover:text-white"}`}
                  >
                    Computer Use
                    <span className="rounded-full border border-amber-200/30 bg-amber-300/10 px-1.5 py-px text-[9.5px] font-medium tracking-wide text-amber-100/90">
                      Soon
                    </span>
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Barada AI — eigenes Produkt, öffnet extern */}
                <a
                  href="https://barada.cloud"
                  target="_blank"
                  rel="noreferrer"
                  title="Barada AI öffnen"
                  className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1.5 text-[13px] text-white/75 transition hover:border-white/25 hover:text-white sm:flex"
                >
                  <Sparkles size={14} />
                  Try Barada AI
                </a>
                <button
                  type="button"
                  aria-label="Regenerate"
                  className="hidden h-9 w-9 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white sm:flex"
                >
                  <RotateCcw size={15} />
                </button>
                <button
                  type="button"
                  aria-label="Send"
                  onClick={() => goToChat(value)}
                  disabled={!value.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-white/60 transition hover:bg-white/20 hover:text-white disabled:opacity-30"
                >
                  <ArrowUp size={17} strokeWidth={2.2} />
                </button>
              </div>
            </div>
          </div>
          )}

          {/* Suggestion pills */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => goToChat(s.replace("…", "a neon city at night"))}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[12.5px] text-white/65 backdrop-blur transition hover:border-white/25 hover:text-white"
              >
                <Sparkles size={12} className="text-white/40" />
                <span className="max-w-[220px] truncate">{s}</span>
              </button>
            ))}
          </div>

          <p className="mt-4 text-[13px] text-white/40">
            {user ? (
              <>Signed in — unlimited chats, synced everywhere.</>
            ) : (
              <>Verxa is members-only — create an account to start.</>
            )}{" "}
            <Link
              href={user ? "/chat" : "/login?next=%2Fchat"}
              className="text-white/70 underline-offset-4 hover:underline"
            >
              {user ? "Open the app →" : "Sign in →"}
            </Link>
          </p>
        </div>

        {/* Model switcher & Verxa Code launcher at the very bottom of the landing page */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <ModelChangeButton selectedId={selectedModelId} onSelect={setDefaultModel} />
          <Link
            href="/code"
            className="flex items-center gap-2 rounded-full border border-[#10141a]/40 bg-[#10141a]/10 px-4 py-2 text-[13px] font-medium text-[#10141a] shadow-[0_0_24px_rgba(143,150,163,0.15)] transition hover:bg-[#10141a] hover:text-black"
          >
            <Code2 size={15} />
            <span>Verxa Code</span>
          </Link>
        </div>
      </main>

      <footer className="relative z-10 flex items-center justify-center pb-6 text-[12px] text-white/30">
        Verxa AI · {new Date().getFullYear()} · Built for fast thinking
      </footer>
    </div>
  );
}
