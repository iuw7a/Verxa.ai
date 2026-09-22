"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, LogIn, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { StitchBackground } from "@/components/stitch/stitch-background";
import { useAuth } from "@/providers/auth-provider";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading, signIn, signUp } = useAuth();
  const next = params.get("next") || "/";

  const [mode, setMode] = useState<"in" | "up">(
    params.get("mode") === "up" ? "up" : "in",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  // Already signed in → back to where they came from (avatar shows on landing).
  useEffect(() => {
    if (!loading && user) {
      router.replace(next);
    }
  }, [loading, user, next, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(null);
    const err =
      mode === "in"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, name.trim());
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    if (mode === "up") {
      setDone("Account created — check your inbox to confirm your email, then sign in.");
      setMode("in");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-black text-white">
      <StitchBackground />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-[19px] font-medium tracking-tight">Verxa AI</span>
          <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-semibold tracking-widest text-white/70">
            BETA
          </span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.03] px-4 py-1.5 text-[13px] text-white/70 transition hover:border-white/35 hover:text-white"
        >
          <ArrowLeft size={14} />
          Back
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-[420px] overflow-hidden rounded-[24px] border border-white/10 bg-[#12121a]/90 p-7 shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-8">
          <h1 className="text-[30px] font-medium tracking-[-0.03em]">
            {mode === "in" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-white/55">
            {mode === "in"
              ? "Sign in — your chats, profile picture and settings follow you to every page."
              : "One account for everything — your avatar shows up on the landing page right away."}
          </p>

          {/* Tabs */}
          <div className="mt-6 flex rounded-full border border-white/10 bg-black/40 p-1">
            {(
              [
                { key: "in", label: "Sign in", icon: LogIn },
                { key: "up", label: "Sign up", icon: UserPlus },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setMode(t.key);
                  setError(null);
                  setDone(null);
                }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[13.5px] transition",
                  mode === t.key
                    ? "bg-white/[0.12] text-white"
                    : "text-white/50 hover:text-white/85",
                )}
              >
                <t.icon size={14} />
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-5 space-y-3">
            {mode === "up" ? (
              <input
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="h-12 w-full rounded-[14px] border border-white/10 bg-white/[0.04] px-4 text-[15px] text-white outline-none transition placeholder:text-white/35 focus:border-[#8ea4ff]/50"
              />
            ) : null}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-12 w-full rounded-[14px] border border-white/10 bg-white/[0.04] px-4 text-[15px] text-white outline-none transition placeholder:text-white/35 focus:border-[#8ea4ff]/50"
            />
            <input
              type="password"
              placeholder="Password (min. 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              className="h-12 w-full rounded-[14px] border border-white/10 bg-white/[0.04] px-4 text-[15px] text-white outline-none transition placeholder:text-white/35 focus:border-[#8ea4ff]/50"
            />

            {error ? <p className="text-[13px] text-red-300">{error}</p> : null}
            {done ? <p className="text-[13px] text-emerald-300">{done}</p> : null}

            {mode === "in" ? (
              <p className="text-right text-[13px]">
                <Link
                  href="/forgot-password"
                  className="text-white/55 underline-offset-4 hover:text-white/85 hover:underline"
                >
                  Forgot password?
                </Link>
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy || loading}
              className="h-12 w-full rounded-[14px] bg-white font-medium text-black transition hover:bg-white/85 disabled:opacity-40"
            >
              {busy ? "Working…" : mode === "in" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-center text-[13px] text-white/40">
            Continue without account?{" "}
            <Link href="/chat" className="text-white/75 underline-offset-4 hover:underline">
              Open the app →
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
