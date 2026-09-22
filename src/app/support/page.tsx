"use client";

import { useState } from "react";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/shell";
import { Button, Input, Textarea } from "@/components/ui/primitives";

export default function SupportPage() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, message }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Failed to send");
      }
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <MarketingShell>
      <h1 className="text-[34px] font-light tracking-[-0.045em]">Support</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-muted">
        Questions, bugs, or feedback — we read everything.
      </p>

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {[
          {
            q: "How many free messages do I get?",
            a: "Three messages without an account. Signing in unlocks unlimited chats with cross-device sync.",
          },
          {
            q: "Which models can I use?",
            a: "Eight verified models including GPT-OSS, Gemma 4, Llama Vision and Nemotron — switch from the picker at the top of any chat.",
          },
          {
            q: "Does Verxa search the web?",
            a: "Yes — for current topics it searches Google live and cites sources. If nothing reliable is found, it says so instead of guessing.",
          },
          {
            q: "Where is my data stored?",
            a: "Guest chats stay in your browser. Signed-in chats sync to your account in our Supabase database, protected by row-level security.",
          },
        ].map((item) => (
          <div
            key={item.q}
            className="rounded-[14px] border border-line bg-bg-elevated/60 p-5"
          >
            <p className="text-[14.5px] font-medium text-ink">{item.q}</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
              {item.a}
            </p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-[22px] font-medium tracking-[-0.03em]">
        Contact us
      </h2>
      {sent ? (
        <div className="mt-4 rounded-[14px] border border-line bg-bg-elevated/60 p-6">
          <p className="text-[15px] text-ink">Thanks — message received.</p>
          <p className="mt-1 text-[13.5px] text-muted">
            We&apos;ll get back to you by email.{" "}
            <Link href="/chat" className="text-accent hover:underline">
              Back to chat
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <Input
            placeholder="Your email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Textarea
            placeholder="How can we help?"
            required
            className="min-h-[140px]"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          {error ? <p className="text-[13px] text-danger">{error}</p> : null}
          <Button type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send message"}
          </Button>
        </form>
      )}
    </MarketingShell>
  );
}
