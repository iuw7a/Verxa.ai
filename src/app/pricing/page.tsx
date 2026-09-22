"use client";

import Link from "next/link";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { VerxaMark } from "@/components/brand/verxa-mark";
import { useAuth } from "@/providers/auth-provider";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For developers starting their journey or prototyping ideas.",
    features: [
      "Core code generation & chat",
      "Qwen 3 Coder & Flash models",
      "Live preview & device emulator",
      "Local file diff & syntax viewer",
      "Community support",
    ],
    cta: "Start Free",
    href: "/code",
    popular: false,
  },
  {
    name: "Plus",
    price: "$20",
    period: "per month",
    description: "For active builders requiring higher speed, priority models, and cloud execution.",
    features: [
      "Everything in Free",
      "Priority agent routing (GPT-OSS, Codestral)",
      "Continuous terminal sandbox execution",
      "One-click Vercel deployment",
      "GitHub repo direct push",
      "Expanded context token limits",
    ],
    cta: "Upgrade to Plus",
    href: "/account/subscription",
    popular: true,
  },
  {
    name: "Pro",
    price: "$100",
    period: "per month",
    description: "For teams and power developers shipping production applications daily.",
    features: [
      "Everything in Plus",
      "Dedicated multi-turn agent reasoning",
      "Nemotron 3 Super 120B access",
      "Team collaboration workspaces",
      "Custom system prompts & rules",
      "Priority SLA & dedicated support",
    ],
    cta: "Get Pro Access",
    href: "/account/subscription",
    popular: false,
  },
];

export default function PricingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-dvh bg-[#07080a] text-white selection:bg-[#8f96a3]/20 selection:text-white">
      {/* Navigation Header */}
      <header className="border-b border-white/[0.08] px-6 py-4 sm:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <VerxaMark size={24} />
            <span className="text-[15px] font-semibold text-white">
              Verxa <span className="text-[#8f96a3]">Code</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/code"
              className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 py-1.5 text-[13px] text-white/80 transition hover:border-white/30 hover:text-white"
            >
              <ArrowLeft size={14} /> Back to Code
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#8f96a3]/30 bg-[#8f96a3]/10 px-3.5 py-1 text-[12px] font-medium text-[#8f96a3]">
            <Sparkles size={13} /> Transparent, developer-first pricing
          </span>
          <h1 className="mt-5 text-[36px] font-medium tracking-tight sm:text-[48px]">
            Simple plans for every developer.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-white/60">
            Start building with Verxa Code for free today. Upgrade anytime for higher quotas, faster inference, and cloud deployment pipelines.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-200 ${
                p.popular
                  ? "border-[#8f96a3]/40 bg-[#101416] shadow-[0_12px_40px_rgba(143,150,163,0.08)]"
                  : "border-white/10 bg-[#0d0f14] hover:border-white/20"
              }`}
            >
              {p.popular ? (
                <span className="absolute -top-3 right-6 rounded-full bg-[#8f96a3] px-3 py-0.5 text-[11px] font-semibold text-black">
                  Most Popular
                </span>
              ) : null}

              <div className="mb-4">
                <h3 className="text-[18px] font-medium text-white">{p.name}</h3>
                <p className="mt-1 text-[13px] text-white/55">{p.description}</p>
              </div>

              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-[38px] font-semibold tracking-tight text-white">{p.price}</span>
                <span className="text-[13px] text-white/40">/{p.period}</span>
              </div>

              <Link
                href={user ? p.href : `/login?next=${encodeURIComponent(p.href)}`}
                className={`flex h-10 w-full items-center justify-center rounded-xl text-[13.5px] font-medium transition ${
                  p.popular
                    ? "bg-[#8f96a3] text-black hover:bg-[#b8bec8]"
                    : "border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                }`}
              >
                {p.cta}
              </Link>

              <div className="mt-8 border-t border-white/[0.08] pt-6">
                <p className="text-[12px] font-medium tracking-wide text-white/40 uppercase">Included features</p>
                <ul className="mt-3 space-y-2.5 text-[13px] text-white/75">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <Check size={14} className="shrink-0 text-[#8f96a3]" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
