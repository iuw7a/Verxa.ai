"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Button, Input } from "@/components/ui/primitives";
import { VerxaWordmark } from "@/components/brand/verxa-mark";

export function AuthModal() {
  const { authOpen, setAuthOpen, signIn, signUp, pendingMessage } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (authOpen) setError(null);
  }, [authOpen]);

  if (!authOpen) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err =
      mode === "in"
        ? await signIn(email, password)
        : await signUp(email, password, name);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-[400px] rounded-[20px] border border-line bg-[#101012] p-6 shadow-[var(--shadow)]"
      >
        <VerxaWordmark />
        <h2 className="mt-5 text-[22px] font-medium tracking-[-0.04em]">
          {mode === "in" ? "Welcome back" : "Create your account"}
        </h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
          {pendingMessage
            ? "Your conversation is saved. Continue after you sign in."
            : "Guests can chat freely. Sign in to keep everything across devices."}
        </p>

        <div className="mt-5 space-y-3">
          {mode === "up" ? (
            <Input
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          ) : null}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        {error ? (
          <p className="mt-3 text-[13px] text-danger">{error}</p>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            className="text-[13px] text-muted hover:text-ink"
            onClick={() => setAuthOpen(false)}
          >
            Continue as guest
          </button>
          <Button type="submit" disabled={busy}>
            {busy ? "Working…" : mode === "in" ? "Sign in" : "Create account"}
          </Button>
        </div>

        <button
          type="button"
          className="mt-4 text-[13px] text-accent"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
        >
          {mode === "in"
            ? "Need an account? Create one"
            : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
