"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { StitchBackground } from "@/components/stitch/stitch-background";
import { useAuth } from "@/providers/auth-provider";

const REASONS = [
  "Just signing out for now",
  "Not what I was looking for",
  "Too expensive right now",
  "Missing a feature I need",
  "Something was broken",
  "Privacy or trust concerns",
  "Other reason",
] as const;

export default function LogoutPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [reason, setReason] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const hasFeedback = Boolean(reason || comment.trim());

  /** Stores the answer (optional), then signs out and lands on the homepage. */
  async function finish(withFeedback: boolean) {
    if (busy) return;
    setBusy(true);

    if (withFeedback && hasFeedback) {
      try {
        await fetch("/api/feedback/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason ?? "", comment }),
        });
      } catch {
        /* feedback is optional — never block the sign-out */
      }
    }

    await signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-black text-white selection:bg-white/15">
      <StitchBackground />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-[19px] font-medium tracking-tight">Verxa AI</span>
          <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-semibold tracking-widest text-white/70">
            BETA
          </span>
        </Link>
        <Link
          href="/chat"
          className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.03] px-4 py-1.5 text-[13px] text-white/70 transition hover:border-white/35 hover:text-white"
        >
          <ArrowLeft size={14} />
          Stay signed in
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-start justify-center px-6 pb-16 sm:items-center">
        <div className="animate-rise w-full max-w-[480px] overflow-hidden rounded-[24px] border border-white/10 bg-[#12121a]/90 p-7 shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-8">
          <p className="eyebrow">Sign out</p>
          <h1 className="mt-3 text-[30px] font-medium tracking-[-0.03em]">
            Before you go
          </h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-white/55">
            One quick question, then you are signed out. You can sign back in
            any time.
          </p>

          <p className="mt-6 text-[13.5px] font-medium text-white/80">
            Why are you leaving?
          </p>
          <div className="mt-3 space-y-2">
            {REASONS.map((option) => {
              const active = reason === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setReason(active ? null : option)}
                  className={cn(
                    "focus-ring flex w-full items-center gap-3 rounded-[14px] border px-3.5 py-2.5 text-left text-[13.5px] transition",
                    active
                      ? "border-[#8ea4ff]/45 bg-[#8ea4ff]/10 text-white"
                      : "border-white/10 bg-white/[0.03] text-white/65 hover:border-white/25 hover:text-white",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                      active
                        ? "border-[#8ea4ff] bg-[#8ea4ff] text-[#0a0c12]"
                        : "border-white/25",
                    )}
                  >
                    {active ? <Check size={11} strokeWidth={3} /> : null}
                  </span>
                  {option}
                </button>
              );
            })}
          </div>

          <label className="mt-5 block">
            <span className="text-[13px] text-white/55">
              Anything we should know? (optional)
            </span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="What would have kept you here?"
              className="mt-2 w-full resize-none rounded-[14px] border border-white/10 bg-white/[0.04] px-4 py-3 text-[14.5px] text-white outline-none transition placeholder:text-white/30 focus:border-[#8ea4ff]/50"
            />
          </label>

          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void finish(true)}
              disabled={busy}
              className="btn-primary focus-ring flex h-11 items-center justify-center gap-2 rounded-[14px] text-[14.5px] font-semibold disabled:opacity-60"
            >
              {busy ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <LogOut size={15} />
              )}
              {busy ? "Signing out…" : "Sign out"}
            </button>
            <button
              type="button"
              onClick={() => void finish(false)}
              disabled={busy}
              className="btn-ghost focus-ring flex h-10 items-center justify-center rounded-[12px] text-[13.5px] disabled:opacity-60"
            >
              Skip — just sign me out
            </button>
          </div>

          <p className="mt-5 text-center text-[12px] text-white/35">
            {loading
              ? "Checking your session…"
              : user?.email
                ? `Signed in as ${user.email} — you will land on the Verxa home page.`
                : "You will land on the Verxa home page."}
          </p>
        </div>
      </main>
    </div>
  );
}
