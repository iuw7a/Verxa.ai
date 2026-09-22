"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { StitchBackground } from "@/components/stitch/stitch-background";

type State =
  | { kind: "working" }
  | { kind: "missing" }
  | { kind: "done" }
  | { kind: "expired" }
  | { kind: "invalid" };

function VerifyBox() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>({ kind: "working" });
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!token) {
      setState({ kind: "missing" });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/email/verify/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const json = (await res.json().catch(() => null)) as {
          ok?: boolean;
          code?: string;
        } | null;
        if (cancelled) return;
        if (json?.ok) setState({ kind: "done" });
        else if (json?.code === "expired" || json?.code === "used")
          setState({ kind: "expired" });
        else setState({ kind: "invalid" });
      } catch {
        if (!cancelled) setState({ kind: "invalid" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function resend() {
    setResent(false);
    await fetch("/api/email/verify/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).catch(() => {});
    setResent(true);
  }

  const copy: Record<State["kind"], { title: string; text: string }> = {
    working: { title: "Verifying…", text: "One moment while we confirm your email." },
    missing: { title: "No token found", text: "This verification link is incomplete. Request a fresh one from your account." },
    done: { title: "Email verified ✓", text: "Your address is confirmed — welcome aboard. You can sign in now." },
    expired: { title: "Link expired", text: "This link expired or was already used. Get a fresh one below." },
    invalid: { title: "Invalid link", text: "This verification link isn't valid. Get a fresh one below." },
  };
  const c = copy[state.kind];

  return (
    <div className="w-full max-w-[420px] overflow-hidden rounded-[24px] border border-white/10 bg-[#12121a]/90 p-7 shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-8">
      <h1 className="text-[30px] font-medium tracking-[-0.03em]">{c.title}</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-white/55">{c.text}</p>
      {state.kind === "done" ? (
        <Link
          href="/login"
          className="mt-6 flex h-12 w-full items-center justify-center rounded-[14px] bg-white font-medium text-black transition hover:bg-white/85"
        >
          Sign in
        </Link>
      ) : state.kind === "expired" || state.kind === "invalid" ? (
        <div className="mt-6 space-y-3">
          <button
            onClick={resend}
            className="h-12 w-full rounded-[14px] bg-white font-medium text-black transition hover:bg-white/85"
          >
            Send a fresh link
          </button>
          {resent ? (
            <p className="text-center text-[13px] text-emerald-300">
              Fresh link sent — check your inbox.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-black text-white">
      <StitchBackground />
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-[19px] font-medium tracking-tight">Verxa AI</span>
        </Link>
        <Link
          href="/login"
          className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.03] px-4 py-1.5 text-[13px] text-white/70 transition hover:border-white/35 hover:text-white"
        >
          <ArrowLeft size={14} />
          Sign in
        </Link>
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-6 pb-16">
        <Suspense>
          <VerifyBox />
        </Suspense>
      </main>
    </div>
  );
}
