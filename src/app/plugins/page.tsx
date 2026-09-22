"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronRight,
  FileText,
  Loader2,
  Mail,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button, Card } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

/* ------------------------------------------------------------------ */
/* Types mirroring GET /api/integrations                               */
/* ------------------------------------------------------------------ */

type IntegrationToolUi = {
  id: string;
  name: string;
  description: string;
  confirmationRequired?: boolean;
};

type IntegrationUi = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  category: string;
  authType: string;
  permissions: string[];
  tools: IntegrationToolUi[];
  enabled: boolean;
  configured: boolean;
  connection: null | {
    status: "active" | "needs_reauth" | "revoked" | "error";
    scopes: string[];
    accountLabel: string | null;
    connectedAt: string;
  };
};

const CATEGORIES: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "email", label: "Email" },
  { id: "calendar", label: "Calendar" },
  { id: "files", label: "Files" },
  { id: "communication", label: "Communication" },
  { id: "travel", label: "Travel" },
  { id: "dev", label: "Developer" },
];

const ERROR_MESSAGES: Record<string, string> = {
  denied: "You declined the permission request. Nothing was connected.",
  invalid_state: "The connection request expired or was tampered with. Please try again.",
  session_expired: "Your Verxa session expired during sign-in. Log in and try again.",
  invalid_code: "The authorization code was rejected by Google. Please try again.",
  exchange_failed: "Could not exchange the authorization with Google. Please try again.",
  storage_failed: "Connected, but storing the credentials failed. Please reconnect.",
  not_configured: "Google login isn't configured on this server yet. Add the OAuth credentials first.",
  unknown_integration: "That integration doesn't exist.",
  provider_error: "The provider reported a problem during sign-in. Please try again.",
};

function ProviderIcon({ icon, size = 22 }: { icon: string; size?: number }) {
  if (icon === "chrome") {
    // Official Google "G" mark.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/logos/google.svg" alt="" width={size} height={size} className="rounded-[3px]" draggable={false} />;
  }
  if (icon === "plane" || icon === "flyvia") {
    // Flyvia's own brand logo.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/logos/flyvia.png" alt="" width={size} height={size} className="rounded-[5px] object-contain" draggable={false} />;
  }
  return <Sparkles size={size} className="text-muted" />;
}

export default function PluginsPage() {
  return (
    <Suspense fallback={null}>
      <PluginsPageInner />
    </Suspense>
  );
}

function PluginsPageInner() {
  const { user, loading: authLoading, setAuthOpen } = useAuth();
  const params = useSearchParams();
  const [integrations, setIntegrations] = useState<IntegrationUi[] | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [detail, setDetail] = useState<IntegrationUi | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Surface OAuth callback status as a toast banner.
  const connectedOk = params.get("connected");
  const errorKey = params.get("error");
  const [banner, setBanner] = useState<string | null>(
    errorKey
      ? (ERROR_MESSAGES[errorKey] ?? "Something went wrong while connecting. Please try again.")
      : connectedOk
        ? `${connectedOk[0].toUpperCase()}${connectedOk.slice(1)} connected successfully.`
        : null,
  );

  async function load() {
    const res = await fetch("/api/integrations", { cache: "no-store" });
    const json = (await res.json()) as { integrations: IntegrationUi[] };
    setIntegrations(json.integrations);
  }

  useEffect(() => {
    void load();
  }, []);

  function connect(id: string) {
    if (!user && !authLoading) {
      setAuthOpen(true);
      return;
    }
    setBusy(id);
    // Full-page navigation → provider consent screen.
    window.location.href = `/api/integrations/${id}/connect`;
  }

  async function disconnect(id: string) {
    setBusy(id);
    try {
      await fetch(`/api/integrations/${id}/disconnect`, { method: "POST" });
      await load();
    } finally {
      setBusy(null);
      setDetail(null);
    }
  }

  const visible = useMemo(() => {
    if (!integrations) return [];
    const q = query.trim().toLowerCase();
    return integrations.filter(
      (i) =>
        (category === "all" || i.category === category) &&
        (!q || `${i.name} ${i.tagline} ${i.description}`.toLowerCase().includes(q)),
    );
  }, [integrations, query, category]);

  return (
    <AppShell topBar={<span className="text-[13px] text-muted">Plugins</span>}>
      <div className="mx-auto w-full max-w-[900px] px-1 py-8 sm:px-4">
        <header className="mb-8">
          <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-faint">Extend Verxa</p>
          <h1 className="mt-2 text-[32px] font-light tracking-[-0.03em]">Plugins &amp; Integrations</h1>
          <p className="mt-2 max-w-[560px] text-[14.5px] leading-relaxed text-muted">
            Connect the services you use. Verxa accesses them only through secure,
            read-first backend tools — your credentials never touch the browser.
          </p>
        </header>

        {banner ? (
          <div
            className={cn(
              "mb-6 flex items-start gap-3 rounded-[14px] border px-4 py-3 text-[13.5px]",
              errorKey
                ? "border-[#5a2a2a] bg-[#2a1414] text-[#f3b8b8]"
                : "border-[#2a4a33] bg-[#12201a] text-[#b8e3c6]",
            )}
            role="status"
          >
            {errorKey ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <Check size={16} className="mt-0.5 shrink-0" />}
            <p className="flex-1">{banner}</p>
            <button onClick={() => setBanner(null)} aria-label="Dismiss" className="text-faint hover:text-ink">
              <X size={15} />
            </button>
          </div>
        ) : null}

        {/* Search + categories */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex h-10 flex-1 items-center gap-2 rounded-[10px] border border-line bg-bg-elevated/60 px-3">
            <Search size={15} className="shrink-0 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search integrations…"
              className="h-full w-full bg-transparent text-[14px] outline-none placeholder:text-faint"
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12.5px] transition-colors",
                  category === c.id
                    ? "border-accent/40 bg-accent/10 text-ink"
                    : "border-line text-muted hover:text-ink",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-4">
          {integrations === null ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-[14px]">Loading integrations…</span>
            </div>
          ) : visible.length === 0 ? (
            <Card className="py-14 text-center text-muted">
              <p className="text-[14px]">No integrations match your search.</p>
            </Card>
          ) : (
            visible.map((i) => {
              const conn = i.connection;
              const active = conn?.status === "active";
              return (
                <Card key={i.id} className="transition-colors hover:border-white/15">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-line bg-white/[0.03]">
                        <ProviderIcon icon={i.icon} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[16px] font-medium">{i.name}</p>
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[11px]",
                              active
                                ? "border-[#2a4a33] bg-[#12201a] text-[#8fe0aa]"
                                : conn
                                  ? "border-[#5a4a2a] bg-[#241d10] text-[#e8c88a]"
                                  : "border-line text-faint",
                            )}
                          >
                            {active ? "Connected" : conn === null ? "Not connected" : conn.status === "needs_reauth" ? "Reconnect needed" : conn.status}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[12.5px] text-faint">{i.tagline}</p>
                        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{i.description}</p>
                        {conn?.accountLabel ? (
                          <p className="mt-2 text-[12px] text-faint">Account: {conn.accountLabel}</p>
                        ) : null}
                        {!i.configured && !conn ? (
                          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[#e8c88a]">
                            <AlertTriangle size={13} /> Server credentials missing — ask the admin to enable this integration.
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {active ? (
                        <>
                          <Button variant="ghost" onClick={() => setDetail(i)}>
                            Manage
                          </Button>
                          <Button variant="subtle" disabled={busy === i.id} onClick={() => void disconnect(i.id)}>
                            {busy === i.id ? <Loader2 size={14} className="animate-spin" /> : "Disconnect"}
                          </Button>
                        </>
                      ) : (
                        <Button variant="primary" disabled={!i.enabled} onClick={() => connect(i.id)}>
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        <p className="mt-8 flex items-center gap-2 text-[12px] text-faint">
          <ShieldCheck size={14} />
          Access tokens are encrypted at rest and never exposed to the browser. You can revoke any connection at any time.
        </p>
      </div>

      {/* Detail modal */}
      {detail ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
          onClick={() => setDetail(null)}
        >
          <div
            className="max-h-[86vh] w-full max-w-[560px] overflow-y-auto rounded-t-[20px] border border-line bg-bg-elevated p-6 sm:rounded-[20px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-line bg-white/[0.03]">
                  <ProviderIcon icon={detail.icon} size={20} />
                </div>
                <div>
                  <p className="text-[17px] font-medium">{detail.name}</p>
                  <p className="text-[12.5px] text-faint">{detail.tagline}</p>
                </div>
              </div>
              <button onClick={() => setDetail(null)} aria-label="Close" className="text-faint hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <section className="mt-6">
              <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-faint">What Verxa can do</p>
              <ul className="mt-3 flex flex-col gap-2">
                {detail.tools.map((t) => (
                  <li key={t.id} className="flex items-start gap-2.5 text-[13.5px] text-muted">
                    {t.id.startsWith("gmail") ? <Mail size={15} className="mt-0.5 shrink-0" /> : t.id.startsWith("calendar") ? <Calendar size={15} className="mt-0.5 shrink-0" /> : <FileText size={15} className="mt-0.5 shrink-0" />}
                    <span>
                      <span className="text-ink">{t.name}</span> — {t.description}
                      {t.confirmationRequired ? (
                        <span className="ml-1.5 text-[11.5px] text-[#e8c88a]">(asks before sending)</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-6">
              <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-faint">Permissions requested</p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {detail.permissions.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-[13px] text-muted">
                    <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#8fe0aa]" />
                    {p}
                  </li>
                ))}
              </ul>
            </section>

            {detail.connection?.accountLabel ? (
              <section className="mt-6">
                <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-faint">Connected account</p>
                <p className="mt-2 text-[13.5px]">{detail.connection.accountLabel}</p>
              </section>
            ) : null}

            <div className="mt-7 flex items-center justify-between gap-3">
              <Link href="/account/connected-apps" className="text-[13px] text-muted underline-offset-4 hover:text-ink hover:underline">
                Connection policy
              </Link>
              {detail.connection?.status === "active" ? (
                <Button variant="danger" onClick={() => void disconnect(detail.id)}>
                  Disconnect {detail.name}
                </Button>
              ) : (
                <Button variant="primary" onClick={() => connect(detail.id)}>
                  Connect {detail.name}
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
