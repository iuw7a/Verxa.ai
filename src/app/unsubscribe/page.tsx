"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { StitchBackground } from "@/components/stitch/stitch-background";

type Load =
  | { kind: "working" }
  | { kind: "bad" }
  | { kind: "ready"; email: string; already: boolean }
  | { kind: "done"; email: string };

function UnsubBox() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<Load>({ kind: "working" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setState({ kind: "bad" });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/email/unsubscribe?token=${encodeURIComponent(token)}`,
        );
        const json = (await res.json().catch(() => null)) as {
          ok?: boolean;
          email?: string;
          alreadyUnsubscribed?: boolean;
        } | null;
        if (cancelled) return;
        if (json?.ok)
          setState({
            kind: "ready",
            email: json.email ?? "",
            already: Boolean(json.alreadyUnsubscribed),
          });
        else setState({ kind: "bad" });
      } catch {
        if (!cancelled) setState({ kind: "bad" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function confirm() {
    setBusy(true);
    try {
      const res = await fetch("/api/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        email?: string;
      } | null;
      if (json?.ok) setState({ kind: "done", email: json.email ?? "" });
    } catch {
      /* keep the form */
    }
    setBusy(false);
  }

  return (
    <div className="w-full max-w-[420px] overflow-hidden rounded-[24px] border border-white/10 bg-[#12121a]/90 p-7 shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-8">
      {state.kind === "working" ? (
        <>
          <h1 className="text-[30px] font-medium tracking-[-0.03em]">Checking…</h1>
          <p className="mt-2 text-[14.5px] text-white/55">Validating your link.</p>
        </>
      ) : state.kind === "bad" ? (
        <>
          <h1 className="text-[30px] font-medium tracking-[-0.03em]">Invalid link</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-white/55">
            This unsubscribe link is invalid or expired. You can manage email
            preferences anytime in your account settings.
          </p>
          <Link
            href="/account/settings"
            className="mt-6 flex h-12 w-full items-center justify-center rounded-[14px] bg-white font-medium text-black transition hover:bg-white/85"
          >
            Open email settings
          </Link>
        </>
      ) : state.kind === "done" ? (
        <>
          <h1 className="text-[30px] font-medium tracking-[-0.03em]">Unsubscribed ✓</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-white/55">
            {state.email} will no longer receive marketing emails. Security and
            account emails continue normally. You can re-subscribe anytime in
            your settings.
          </p>
          <Link
            href="/account/settings"
            className="mt-6 flex h-12 w-full items-center justify-center rounded-[14px] bg-white font-medium text-black transition hover:bg-white/85"
          >
            Manage preferences
          </Link>
        </>
      ) : (
        <>
          <h1 className="text-[30px] font-medium tracking-[-0.03em]">
            Unsubscribe?
          </h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-white/55">
            Stop marketing emails to {state.email}? Security, billing and
            account emails will continue — those can&apos;t be turned off.
          </p>
          {state.already ? (
            <p className="mt-4 text-[13px] text-emerald-300">
              You&apos;re already unsubscribed from marketing emails.
            </p>
          ) : (
            <button
              onClick={confirm}
              disabled={busy}
              className="mt-6 h-12 w-full rounded-[14px] bg-white font-medium text-black transition hover:bg-white/85 disabled:opacity-40"
            >
              {busy ? "Working…" : "Yes, unsubscribe me"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-black text-white">
      <StitchBackground />
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-[19px] font-medium tracking-tight">Verxa AI</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.03] px-4 py-1.5 text-[13px] text-white/70 transition hover:border-white/35 hover:text-white"
        >
          <ArrowLeft size={14} />
          Home
        </Link>
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-6 pb-16">
        <Suspense>
          <UnsubBox />
        </Suspense>
      </main>
    </div>
  );
}
