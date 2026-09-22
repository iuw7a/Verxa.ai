"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Sparkles } from "lucide-react";
import { VerxaWordmark } from "@/components/brand/verxa-mark";

const links = [
  { href: "/studio", label: "Barada Studio", icon: Sparkles },
  { href: "/chat", label: "Chat" },
  { href: "/about", label: "About" },
  { href: "/support", label: "Support" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1080px] items-center justify-between px-6">
        <Link href="/" className="focus-ring inline-flex rounded-[10px]">
          <VerxaWordmark />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="focus-ring flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[14px] text-muted transition hover:bg-white/[0.04] hover:text-ink"
            >
              {l.icon ? <l.icon size={14} className="text-accent" /> : null}
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/chat"
            className="btn-primary focus-ring inline-flex h-9 items-center rounded-[10px] px-4 text-[13.5px] font-medium"
          >
            Start chatting
          </Link>
        </div>
        <button
          className="btn-ghost focus-ring rounded-[10px] p-2 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open ? (
        <nav className="border-t border-line bg-bg px-6 py-3 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-[10px] px-3 py-2.5 text-[14.5px] text-muted hover:bg-white/[0.04] hover:text-ink"
            >
              {l.icon ? <l.icon size={15} className="text-accent" /> : null}
              {l.label}
            </Link>
          ))}
          <Link
            href="/chat"
            onClick={() => setOpen(false)}
            className="btn-primary mt-2 flex h-10 items-center justify-center rounded-[10px] text-[14px] font-medium"
          >
            Start chatting
          </Link>
        </nav>
      ) : null}
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-[1080px] flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <p className="text-[13px] text-faint">
          © {new Date().getFullYear()} Verxa AI · Berlin
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-5">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="focus-ring rounded text-[13px] text-faint transition hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
