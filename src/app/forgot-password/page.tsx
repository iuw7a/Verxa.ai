"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StitchBackground } from "@/components/stitch/stitch-background";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/email/password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.status === 429) {
        setError("Too many requests. Please wait an hour and try again.");
      } else {
        setDone(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  }

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
        <div className="w-full max-w-[420px] overflow-hidden rounded-[24px] border border-white/10 bg-[#12121a]/90 p-7 shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-8">
          <h1 className="text-[30px] font-medium tracking-[-0.03em]">
            Forgot password?
          </h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-white/55">
            {done
              ? "If an account exists for this address, a reset link is on its way. It expires in 60 minutes."
              : "Enter your account email and we'll send you a secure reset link."}
          </p>
          {done ? (
            <Link
              href="/login"
              className="mt-6 flex h-12 w-full items-center justify-center rounded-[14px] bg-white font-medium text-black transition hover:bg-white/85"
            >
              Back to sign in
            </Link>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-3">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-12 w-full rounded-[14px] border border-white/10 bg-white/[0.04] px-4 text-[15px] text-white outline-none transition placeholder:text-white/35 focus:border-[#8ea4ff]/50"
              />
              {error ? <p className="text-[13px] text-red-300">{error}</p> : null}
              <button
                type="submit"
                disabled={busy}
                className="h-12 w-full rounded-[14px] bg-white font-medium text-black transition hover:bg-white/85 disabled:opacity-40"
              >
                {busy ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
