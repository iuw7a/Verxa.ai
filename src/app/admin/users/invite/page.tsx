"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Loader2, RefreshCw, Smartphone, Monitor, UserRound } from "lucide-react";
import { VerxaMark } from "@/components/brand/verxa-mark";
import { useAuth } from "@/providers/auth-provider";

type Visit = {
  id: string;
  source: string;
  display_name: string | null;
  device: string | null;
  last_step: string;
  created_at: string;
};

/**
 * /admin/invite — who entered through the invite link.
 * Admin-only (API enforces it); shows the shareable link + visitor list.
 */
export default function AdminInvitePage() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/invite/from/admin`
      : "https://verxa.de/invite/from/admin";

  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/invite/visits", { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? "Not authorized.");
        setVisits([]);
        return;
      }
      setVisits(j.visits ?? []);
    } catch {
      setError("Could not load visits.");
      setVisits([]);
    }
  }

  useEffect(() => {
    if (user) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <div className="min-h-dvh bg-black text-white">
      <header className="border-b border-white/[0.08] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2.5">
            <VerxaMark size={22} />
            <span className="text-[14px] font-semibold">
              Verxa <span className="text-white/50">Admin · Invite</span>
            </span>
          </Link>
          <Link
            href="/admin"
            className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-[13px] text-white/80 hover:text-white"
          >
            <ArrowLeft size={14} /> Admin
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-[26px] font-medium tracking-tight">Invite link</h1>
        <p className="mt-1 text-[13.5px] text-white/55">
          Share this link. Everyone who enters through it shows up below.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <code className="min-w-0 flex-1 truncate px-2 font-mono text-[13px] text-emerald-100/90">
            {inviteUrl}
          </code>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(inviteUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                /* ignore */
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-[12.5px] font-semibold text-black hover:bg-white/85"
          >
            <Copy size={13} /> {copied ? "Copied" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-1.5 text-[12.5px] text-white/75 hover:text-white"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        <h2 className="mt-10 text-[17px] font-semibold">
          Visitors {visits ? <span className="text-white/40">({visits.length})</span> : null}
        </h2>

        {visits === null ? (
          <p className="mt-4 flex items-center gap-2 text-[13.5px] text-white/55">
            <Loader2 size={15} className="animate-spin" /> Loading…
          </p>
        ) : error ? (
          <p className="mt-4 rounded-xl border border-red-500/25 bg-red-500/[0.07] px-4 py-3 text-[13.5px] text-red-300">
            {error}
          </p>
        ) : visits.length === 0 ? (
          <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-[13.5px] text-white/50">
            Nobody entered through the invite link yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {visits.map((v) => (
              <li
                key={v.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70">
                  <UserRound size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">
                    {v.display_name || "Anonymous"}
                  </span>
                  <span className="block text-[12px] text-white/45">
                    via /invite/from/{v.source} · {v.last_step} ·{" "}
                    {new Date(v.created_at).toLocaleString()}
                  </span>
                </span>
                {v.device === "mobile" ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/12 px-2.5 py-1 text-[11.5px] text-white/65">
                    <Smartphone size={12} /> Mobile
                  </span>
                ) : v.device === "desktop" ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/12 px-2.5 py-1 text-[11.5px] text-white/65">
                    <Monitor size={12} /> Desktop
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
