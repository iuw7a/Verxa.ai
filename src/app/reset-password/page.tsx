"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { StitchBackground } from "@/components/stitch/stitch-background";

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/email/password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        code?: string;
      } | null;
      if (json?.ok) {
        setDone(true);
      } else if (json?.code === "expired" || json?.code === "used") {
        setError("This link has expired or was already used. Request a fresh one below.");
      } else {
        setError("This link is invalid. Request a fresh one below.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  return (
    <div className="w-full max-w-[420px] overflow-hidden rounded-[24px] border border-white/10 bg-[#12121a]/90 p-7 shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-8">
      <h1 className="text-[30px] font-medium tracking-[-0.03em]">
        {done ? "Password changed ✓" : "Choose a new password"}
      </h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-white/55">
        {done
          ? "Your password was updated. A confirmation email is on its way — you can sign in now."
          : !token
            ? "This reset link is missing or invalid."
            : "Pick a strong password you don't use anywhere else."}
      </p>
      {done ? (
        <Link
          href="/login"
          className="mt-6 flex h-12 w-full items-center justify-center rounded-[14px] bg-white font-medium text-black transition hover:bg-white/85"
        >
          Sign in
        </Link>
      ) : token ? (
        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            type="password"
            placeholder="New password (min. 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="h-12 w-full rounded-[14px] border border-white/10 bg-white/[0.04] px-4 text-[15px] text-white outline-none transition placeholder:text-white/35 focus:border-[#8ea4ff]/50"
          />
          <input
            type="password"
            placeholder="Repeat new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            className="h-12 w-full rounded-[14px] border border-white/10 bg-white/[0.04] px-4 text-[15px] text-white outline-none transition placeholder:text-white/35 focus:border-[#8ea4ff]/50"
          />
          {error ? <p className="text-[13px] text-red-300">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="h-12 w-full rounded-[14px] bg-white font-medium text-black transition hover:bg-white/85 disabled:opacity-40"
          >
            {busy ? "Saving…" : "Set new password"}
          </button>
          {error ? (
            <Link
              href="/forgot-password"
              className="block text-center text-[13px] text-white/60 underline-offset-4 hover:underline"
            >
              Request a fresh link →
            </Link>
          ) : null}
        </form>
      ) : (
        <Link
          href="/forgot-password"
          className="mt-6 flex h-12 w-full items-center justify-center rounded-[14px] bg-white font-medium text-black transition hover:bg-white/85"
        >
          Request a reset link
        </Link>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
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
          <ResetForm />
        </Suspense>
      </main>
    </div>
  );
}
