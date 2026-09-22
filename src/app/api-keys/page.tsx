"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/client";

type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

type Plan = "free" | "pro";

const PLAN_MAX: Record<Plan, string> = { free: "1 key", pro: "unlimited keys" };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function relative(iso: string | null) {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[] | null>(null);
  const [plan, setPlan] = useState<Plan>("free");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [freshSecret, setFreshSecret] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    try {
      const res = await fetch("/api/keys");
      if (!res.ok) return;
      const json = (await res.json()) as { keys: ApiKeyRow[]; plan: Plan };
      setKeys(json.keys ?? []);
      setPlan(json.plan ?? "free");
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createKey() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || "Untitled key" }),
      });
      const json = (await res.json()) as {
        secret?: string;
        error?: string;
        maxKeys?: number;
      };
      if (!res.ok) {
        setError(json.error ?? "Could not create the key.");
        return;
      }
      setFreshSecret(json.secret ?? null);
      setName("");
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function removeKey(id: string, mode: "revoke" | "delete") {
    await fetch(`/api/keys?id=${id}&mode=${mode}`, { method: "DELETE" });
    setConfirmDelete(null);
    setFreshSecret(null);
    await load();
  }

  function copy(text: string, tag: string) {
    void navigator.clipboard.writeText(text);
    setCopied(tag);
    setTimeout(() => setCopied(null), 1400);
  }

  function toggleReveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const activeCount = keys?.filter((k) => !k.revoked_at).length ?? 0;
  const limitReached = plan === "free" && activeCount >= 1;

  return (
    <AppShell
      topBar={
        <Link
          href="/docs/api"
          className="rounded-full border border-line px-4 py-1.5 text-[13px] text-muted transition hover:text-ink"
        >
          API Documentation
        </Link>
      }
    >
      <div className="mx-auto w-full max-w-[760px] py-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-line bg-white/[0.04]">
            <KeyRound size={19} className="text-accent" />
          </span>
          <div>
            <h1 className="text-[22px] font-medium tracking-[-0.02em] text-ink">
              API Keys
            </h1>
            <p className="text-[13.5px] text-muted">
              Authenticate with the Verxa API —{" "}
              <Link href="/docs/api" className="text-accent hover:underline">
                read the docs
              </Link>
            </p>
          </div>
        </div>

        {/* Secret warning */}
        <div className="mt-6 flex items-start gap-3 rounded-[16px] border border-[rgba(240,113,120,0.25)] bg-[rgba(240,113,120,0.06)] px-4 py-3.5">
          <AlertTriangle size={17} className="mt-0.5 shrink-0 text-danger" />
          <p className="text-[13.5px] leading-6 text-muted">
            <span className="font-medium text-ink">
              Keep your key secret. Do not share it.
            </span>{" "}
            The full key is shown only once at creation. Anyone with the key can
            use your quota.
          </p>
        </div>

        {/* Create */}
        <section className="mt-6 rounded-[20px] border border-line bg-bg-elevated/60 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-medium text-ink">Create API key</h2>
            <span className="rounded-full border border-line px-3 py-1 text-[11.5px] text-muted capitalize">
              {plan} plan · {PLAN_MAX[plan]}
            </span>
          </div>
          {limitReached ? (
            <p className="mt-3 text-[13px] text-muted">
              You&apos;ve used your 1 free key.{" "}
              <Link href="/account/subscription" className="text-accent hover:underline">
                Upgrade to Pro
              </Link>{" "}
              for unlimited keys and higher rate limits.
            </p>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Key name, e.g. Production server"
                maxLength={60}
                className="h-11 min-w-0 flex-1 rounded-[12px] border border-line bg-white/[0.03] px-3.5 text-[14px] text-ink outline-none placeholder:text-faint focus:border-accent/40"
              />
              <button
                onClick={() => void createKey()}
                disabled={creating}
                className="flex h-11 shrink-0 items-center gap-2 rounded-[12px] bg-accent px-4 text-[13.5px] font-medium text-[#0b0b10] transition hover:bg-accent-strong disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Plus size={15} />
                )}
                Create API Key
              </button>
            </div>
          )}
          {error ? <p className="mt-2.5 text-[13px] text-danger">{error}</p> : null}

          {/* Fresh secret reveal */}
          {freshSecret ? (
            <div className="animate-rise mt-4 rounded-[14px] border border-accent/30 bg-accent-soft px-4 py-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-medium text-ink">
                  Copy your key now — it won&apos;t be shown again.
                </p>
                <button
                  onClick={() => setFreshSecret(null)}
                  aria-label="Dismiss"
                  className="text-faint hover:text-ink"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-[10px] bg-black/40 px-3 py-2.5 font-mono text-[13px] text-accent-strong">
                  {freshSecret}
                </code>
                <button
                  onClick={() => copy(freshSecret, "fresh")}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-line text-muted hover:text-ink"
                  aria-label="Copy key"
                >
                  {copied === "fresh" ? (
                    <Check size={15} className="text-ok" />
                  ) : (
                    <Copy size={15} />
                  )}
                </button>
              </div>
            </div>
          ) : null}
        </section>

        {/* Key list */}
        <section className="mt-4">
          <div className="mb-2.5 flex items-center justify-between px-1">
            <h2 className="text-[15px] font-medium text-ink">
              Your keys{" "}
              <span className="text-[12.5px] font-normal text-faint">
                ({activeCount} active)
              </span>
            </h2>
            <button
              onClick={() => void load()}
              className="flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink"
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {keys === null ? (
            <p className="px-1 text-[13.5px] text-faint">Loading…</p>
          ) : keys.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-line px-6 py-10 text-center text-[13.5px] text-faint">
              No API keys yet — create your first key above.
            </div>
          ) : (
            <div className="space-y-2.5">
              {keys.map((k) => {
                const revoked = Boolean(k.revoked_at);
                const isRevealed = revealed.has(k.id);
                return (
                  <div
                    key={k.id}
                    className={`rounded-[16px] border border-line bg-bg-elevated/60 px-4 py-4 ${
                      revoked ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="text-[14.5px] font-medium text-ink">{k.name}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wide ${
                          revoked
                            ? "bg-[rgba(240,113,120,0.12)] text-danger"
                            : "bg-accent-soft text-accent"
                        }`}
                      >
                        {revoked ? "Revoked" : "Active"}
                      </span>
                      <span className="ml-auto text-[11.5px] text-faint">
                        Created {formatDate(k.created_at)}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2">
                      <code className="min-w-0 flex-1 truncate rounded-[10px] bg-black/30 px-3 py-2 font-mono text-[12.5px] text-muted">
                        {isRevealed
                          ? `${k.key_prefix}${"k".repeat(8)}… (revealed prefix — full value was shown once)`
                          : `${k.key_prefix}${"•".repeat(16)}`}
                      </code>
                      <button
                        onClick={() => toggleReveal(k.id)}
                        aria-label={isRevealed ? "Hide key" : "Reveal key"}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-line text-muted hover:text-ink"
                      >
                        {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={() => copy(k.key_prefix, k.id)}
                        aria-label="Copy prefix"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-line text-muted hover:text-ink"
                      >
                        {copied === k.id ? (
                          <Check size={14} className="text-ok" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                      {!revoked ? (
                        confirmDelete === k.id ? (
                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              onClick={() => void removeKey(k.id, "revoke")}
                              className="rounded-[9px] bg-[rgba(240,113,120,0.14)] px-3 py-2 text-[12px] font-medium text-danger"
                            >
                              Revoke
                            </button>
                            <button
                              onClick={() => void removeKey(k.id, "delete")}
                              className="rounded-[9px] border border-line px-3 py-2 text-[12px] text-muted"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-1 text-[12px] text-faint"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(k.id)}
                            aria-label="Revoke key"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-line text-muted hover:border-danger/40 hover:text-danger"
                          >
                            <Trash2 size={14} />
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => void removeKey(k.id, "delete")}
                          aria-label="Delete revoked key"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-line text-muted hover:text-ink"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <p className="mt-2 text-[11.5px] text-faint">
                      Last used: {relative(k.last_used_at)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <p className="mt-6 text-[12px] text-faint">
          Keys are hashed with SHA-256 before storage — Verxa can never recover a
          lost key. Usage is tracked per key and visible in{" "}
          <Link href="/docs/api" className="text-accent hover:underline">
            GET /v1/usage
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}
