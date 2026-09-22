"use client";

import { useState } from "react";
import { MobileHeader, MobileShell } from "@/components/mobile/mobile-shell";
import { useAuth } from "@/providers/auth-provider";

const faqs = [
  {
    q: "How many free messages do I get?",
    a: "Three messages without an account. Signing in unlocks unlimited chats with cross-device sync.",
  },
  {
    q: "Which models can I use?",
    a: "Eight verified models including GPT-OSS, Gemma 4, Llama Vision and Nemotron — switch from the model button at the top of any chat.",
  },
  {
    q: "Does Verxa search the web?",
    a: "Yes — for current topics it searches Google live and cites sources. If nothing reliable is found, it says so instead of guessing.",
  },
  {
    q: "Where is my data stored?",
    a: "Guest chats stay in your browser. Signed-in chats sync to your account, protected by row-level security.",
  },
];

export default function MobileSupportPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, message, subject: "Mobile support request" }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
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
    <MobileShell>
      <MobileHeader title="Help & support" backHref="/mobile/profile" />
      <div className="mobile-scroll glass-fade-y min-h-0 flex-1">
        <div className="mx-auto w-full max-w-[560px] px-4 py-4">
          <p className="mb-2 px-1 text-[11px] font-medium tracking-[0.14em] text-faint uppercase">
            Frequently asked
          </p>
          <div className="glass glass-spec overflow-hidden rounded-[20px]">
            {faqs.map((f, i) => (
              <div key={f.q} className="border-b border-white/[0.07] last:border-b-0">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="tab-item flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                >
                  <span className="text-[14.5px] text-ink">{f.q}</span>
                  <span className="shrink-0 text-[16px] text-faint">
                    {openFaq === i ? "−" : "+"}
                  </span>
                </button>
                {openFaq === i ? (
                  <p className="animate-fade-in px-4 pb-3.5 text-[13.5px] leading-relaxed text-muted">
                    {f.a}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          <p className="mt-6 mb-2 px-1 text-[11px] font-medium tracking-[0.14em] text-faint uppercase">
            Contact us
          </p>
          {sent ? (
            <div className="glass glass-spec animate-lx-rise rounded-[20px] p-5">
              <p className="text-[14.5px] text-ink">Thanks — message received.</p>
              <p className="mt-1 text-[13px] text-muted">
                We&apos;ll get back to you by email. Your ticket appears in the
                support inbox.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                autoComplete="email"
                inputMode="email"
                className="glass h-12 w-full rounded-[16px] px-4 text-[16px] text-ink outline-none placeholder:text-faint focus:border-white/25"
              />
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help?"
                className="glass min-h-[120px] w-full resize-none rounded-[20px] px-4 py-3 text-[16px] leading-6 text-ink outline-none placeholder:text-faint focus:border-white/25"
              />
              {error ? <p className="text-[13px] text-danger">{error}</p> : null}
              <button
                onClick={() => void submit()}
                disabled={busy || !email.trim() || !message.trim()}
                className="glass-cta tab-item w-full rounded-[16px] py-3.5 text-[15px] font-medium disabled:opacity-40"
              >
                {busy ? "Sending…" : "Send message"}
              </button>
            </div>
          )}
        </div>
      </div>
    </MobileShell>
  );
}
