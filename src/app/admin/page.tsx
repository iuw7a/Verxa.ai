"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  CreditCard,
  Loader2,
  LifeBuoy,
  Mail,
  MessageSquare,
  Plug,
  RefreshCw,
  Search,
  Send,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { VerxaWordmark } from "@/components/brand/verxa-mark";
import { Button, Input, Textarea } from "@/components/ui/primitives";
import { useAuth } from "@/providers/auth-provider";

const ADMIN_EMAILS = ["admin@verxta.de"];

type Tab =
  | "overview"
  | "users"
  | "chats"
  | "emails"
  | "tickets"
  | "subscriptions"
  | "analytics"
  | "integrations";

type Totals = { users: number; chats: number; messages: number; memories: number };
type AdminUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastSignIn: string | null;
  confirmed: boolean;
};
type Profile = { id: string; plan?: string; banned?: boolean };
type AdminChat = {
  id: string;
  userId: string | null;
  title: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};
type AdminMessage = { id: string; chat_id: string; role: string; content: string; created_at: string };
type EmailLog = {
  id: string;
  to_email: string;
  from_email: string | null;
  subject: string | null;
  template: string;
  status: string;
  error: string | null;
  created_at: string;
};
type Ticket = {
  id: string;
  email: string;
  subject: string | null;
  message: string | null;
  status: string;
  priority: string;
  created_at: string;
  replies: { id: string; author: string; body: string; created_at: string }[];
};
type Analytics = {
  growth: { day: string; signups: number; activeUsers: number }[];
  activity: { day: string; chats: number; messages: number }[];
  emailDelivery: { sent: number; failed: number; rate: number | null };
  funnel: { visitors: number | null; signups: number; pro: number };
  summary: { totalUsers: number; newThisWeek: number; proSubscriptions: number };
  monitoring: {
    activeUsers7: number;
    activeUsers30: number;
    signupsToday: number;
    signupsYesterday: number;
    chatsToday: number;
    messagesToday: number;
    averageMessagesPerChat: number;
    topUsers: { id: string; name: string; messageCount: number }[];
    planDistribution: Record<string, number>;
    latencyMs: number | null;
    apiCostUsd: number | null;
    serverLoad: { cpu: number; ram: number; db: number } | null;
    errorRate: number | null;
    uptime: number | null;
    geography: Record<string, number> | null;
    deviceSplit: Record<string, number> | null;
  };
};
type Sub = {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  created_at: string;
};

const TEMPLATE_LABELS: Record<string, string> = {
  welcome: "Welcome",
  verify: "Verification",
  password_reset: "Password reset",
  password_changed: "Password changed",
  email_changed: "Email changed",
  profile_updated: "Profile updated",
  new_login: "New login alert",
  subscription_started: "Pro started",
  subscription_canceled: "Subscription canceled",
  subscription_renewed: "Subscription renewed",
  payment_failed: "Payment failed",
  ticket_created: "Ticket confirmation",
  ticket_replied: "Ticket reply",
  ceo_custom: "CEO custom",
};

export default function AdminPage() {
  const router = useRouter();
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [tab, setTab] = useState<Tab>("overview");
  const [dataLoading, setDataLoading] = useState(false);

  const [totals, setTotals] = useState<Totals | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [userQuery, setUserQuery] = useState("");
  const [chats, setChats] = useState<AdminChat[]>([]);
  const [openChat, setOpenChat] = useState<AdminChat | null>(null);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [emailFilter, setEmailFilter] = useState("");
  const [emailConfig, setEmailConfig] = useState<{
    resendKeyConfigured?: boolean;
    webhookSecretConfigured?: boolean;
    domain?: string;
    senders?: { key: string; name: string; email: string }[];
  } | null>(null);
  const [emailStats, setEmailStats] = useState<{
    byStatus?: Record<string, number>;
    byKind?: Record<string, number>;
    marketingOptedIn?: number;
    preferencesRows?: number;
  } | null>(null);
  const [emailLibrary, setEmailLibrary] = useState<
    { id: string; name: string; category: string; kind: string; sender: string }[]
  >([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [openTicket, setOpenTicket] = useState<Ticket | null>(null);
  const [ticketReply, setTicketReply] = useState("");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [subs, setSubs] = useState<Sub[]>([]);

  // Composer state
  const [composeTo, setComposeTo] = useState("");
  const [composeName, setComposeName] = useState("");
  const [composeTemplate, setComposeTemplate] = useState("welcome");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [composeFrom, setComposeFrom] = useState("ceo@verxa.de");
  const [composeResult, setComposeResult] = useState<string | null>(null);

  const isAdmin = Boolean(
    user && ADMIN_EMAILS.includes((user.email ?? "").toLowerCase()),
  );

  const load = useCallback(
    async (which: Tab) => {
      setDataLoading(true);
      try {
        if (which === "overview" || which === "users") {
          const res = await fetch("/api/admin/overview");
          if (res.ok) {
            const json = await res.json();
            setTotals(json.totals);
            setUsers(json.users);
          }
          if (which === "overview") {
            const stats = await fetch("/api/admin/analytics");
            if (stats.ok) setAnalytics(await stats.json());
          }
          if (which === "users") {
            const pres = await fetch("/api/admin/profiles");
            if (pres.ok) {
              const pjson = await pres.json();
              setProfiles(
                Object.fromEntries((pjson.profiles ?? []).map((p: Profile) => [p.id, p])),
              );
            }
          }
        }
        if (which === "chats") {
          const res = await fetch("/api/admin/chats");
          if (res.ok) setChats((await res.json()).chats ?? []);
        }
        if (which === "emails") {
          const res = await fetch("/api/admin/emails");
          if (res.ok) setEmailLogs((await res.json()).logs ?? []);
          const [cfg, stats, lib] = await Promise.all([
            fetch("/api/admin/emails?view=config").then((r) => (r.ok ? r.json() : null)).catch(() => null),
            fetch("/api/admin/emails?view=stats").then((r) => (r.ok ? r.json() : null)).catch(() => null),
            fetch("/api/admin/emails?view=templates").then((r) => (r.ok ? r.json() : null)).catch(() => null),
          ]);
          if (cfg?.config) setEmailConfig(cfg.config);
          if (stats) setEmailStats(stats);
          if (lib?.templates) setEmailLibrary(lib.templates);
        }
        if (which === "tickets") {
          const res = await fetch("/api/admin/tickets");
          if (res.ok) setTickets((await res.json()).tickets ?? []);
        }
        if (which === "subscriptions") {
          const res = await fetch("/api/admin/subscriptions");
          if (res.ok) setSubs((await res.json()).subscriptions ?? []);
        }
        if (which === "analytics") {
          const res = await fetch("/api/admin/analytics");
          if (res.ok) setAnalytics(await res.json());
        }
      } finally {
        setDataLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (isAdmin) void load(tab);
  }, [tab, isAdmin, load]);

  async function openMessages(chat: AdminChat) {
    setOpenChat(chat);
    setMessages([]);
    setEditId(null);
    const res = await fetch(`/api/admin/messages?chatId=${encodeURIComponent(chat.id)}`);
    if (res.ok) setMessages((await res.json()).messages ?? []);
  }

  async function deleteChat(id: string) {
    if (!confirm("Delete this chat and all its messages?")) return;
    await fetch(`/api/admin/chats?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (openChat?.id === id) setOpenChat(null);
  }

  async function deleteMessage(id: string) {
    if (!confirm("Delete this message?")) return;
    await fetch(`/api/admin/messages?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  async function saveMessage() {
    if (!editId) return;
    await fetch("/api/admin/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editId, content: editValue }),
    });
    setMessages((prev) => prev.map((m) => (m.id === editId ? { ...m, content: editValue } : m)));
    setEditId(null);
  }

  async function deleteUser(id: string) {
    if (!confirm("Delete this user and ALL their data? Irreversible.")) return;
    const res = await fetch(`/api/admin/overview?userId=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
      void load("overview");
    } else {
      const json = await res.json().catch(() => null);
      alert(json?.error ?? "Failed to delete user.");
    }
  }

  async function patchUser(userId: string, patch: { banned?: boolean; plan?: string }) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...patch }),
    });
    if (res.ok) {
      setProfiles((prev) => ({
        ...prev,
        [userId]: { ...prev[userId], ...patch },
      }));
    } else {
      const json = await res.json().catch(() => null);
      alert(json?.error ?? "Failed.");
    }
  }

  async function sendComposed() {
    setComposeResult(null);
    const res = await fetch("/api/admin/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: composeTo,
        template: composeTemplate,
        name: composeName || undefined,
        subject: composeSubject || undefined,
        message: composeMessage || undefined,
        fromOverride:
          composeTemplate === "ceo_custom" ? `CEO Verxa <${composeFrom}>` : undefined,
      }),
    });
    const json = await res.json().catch(() => null);
    setComposeResult(
      json?.ok
        ? "Sent ✓ (logged)"
        : `Failed: ${json?.error ?? "provider issue"} — logged in email history.`,
    );
    void load("emails");
  }

  async function resendEmail(logId: string) {
    const res = await fetch("/api/admin/emails", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logId }),
    });
    const json = await res.json().catch(() => null);
    alert(json?.ok ? "Resent ✓" : `Failed: ${json?.error}`);
    void load("emails");
  }

  async function replyTicket() {
    if (!openTicket || !ticketReply.trim()) return;
    const res = await fetch("/api/admin/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId: openTicket.id,
        reply: ticketReply,
        status: "pending",
      }),
    });
    if (res.ok) {
      setTicketReply("");
      void load("tickets");
      const refreshed = tickets.find((t) => t.id === openTicket.id);
      if (refreshed) setOpenTicket(refreshed);
    }
  }

  async function setTicketStatus(ticketId: string, status: string) {
    await fetch("/api/admin/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId, status }),
    });
    void load("tickets");
  }

  function sparkline(data: number[], color: string) {
    if (!data.length) return null;
    const max = Math.max(...data, 1);
    const points = data
      .map((v, i) => `${(i / (data.length - 1 || 1)) * 100},${28 - (v / max) * 26}`)
      .join(" ");
    return (
      <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-8 w-full">
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.6" />
      </svg>
    );
  }

  // ---------- gate screens ----------
  if (!loading && !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg p-6 text-ink">
        <form
          className="w-full max-w-[380px] rounded-[20px] border border-line bg-[#101012] p-6 shadow-[var(--shadow)]"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            const err = await signIn(email, password);
            setBusy(false);
            if (err) setError(err);
          }}
        >
          <VerxaWordmark />
          <h1 className="mt-5 flex items-center gap-2 text-[20px] font-medium tracking-[-0.03em]">
            <Shield size={18} className="text-accent" /> Admin sign-in
          </h1>
          <div className="mt-4 space-y-3">
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error ? <p className="mt-3 text-[13px] text-danger">{error}</p> : null}
          <Button type="submit" disabled={busy} className="mt-4 w-full">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-ink">
        <Loader2 className="animate-spin text-faint" size={22} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg p-6 text-ink">
        <Shield size={28} className="text-danger" />
        <p className="text-[16px]">This area is restricted to administrators.</p>
        <p className="text-[13.5px] text-muted">Signed in as {user?.email ?? "unknown"}</p>
        <Button variant="subtle" onClick={() => router.push("/logout")}>Sign out</Button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users },
    { id: "chats", label: "Chats", icon: MessageSquare },
    { id: "emails", label: "Emails", icon: Mail },
    { id: "tickets", label: "Tickets", icon: LifeBuoy },
    { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
    { id: "analytics", label: "Analytics", icon: Activity },
    { id: "integrations", label: "Integrations", icon: Plug },
  ];

  const filteredUsers = users.filter(
    (u) =>
      !userQuery ||
      u.email.toLowerCase().includes(userQuery.toLowerCase()) ||
      u.name.toLowerCase().includes(userQuery.toLowerCase()),
  );

  const filteredLogs = emailLogs.filter(
    (l) => !emailFilter || l.template === emailFilter,
  );

  // ---------- dashboard ----------
  return (
    <div className="admin-console min-h-dvh bg-[#07080a] text-[#f2f2f4]">
      <div className="flex min-h-dvh">
        <aside className="hidden w-[252px] shrink-0 flex-col border-r border-white/[0.08] bg-[#090a0d] lg:flex">
          <div className="border-b border-white/[0.08] px-5 py-5">
            <div className="flex items-center gap-3">
              <VerxaWordmark />
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium tracking-[0.14em] text-white/45 uppercase">Admin</span>
            </div>
            <p className="mt-5 text-[10px] font-medium tracking-[0.18em] text-white/30 uppercase">Command center</p>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Admin navigation">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex h-10 w-full items-center gap-3 rounded-[11px] px-3 text-left text-[13.5px] transition ${
                    tab === t.id ? "bg-white/[0.09] text-white shadow-[inset_2px_0_0_#f2f2f4]" : "text-white/50 hover:bg-white/[0.045] hover:text-white"
                  }`}
                >
                  <Icon size={16} strokeWidth={1.8} />
                  <span>{t.label}</span>
                  {tab === t.id ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/70" /> : null}
                </button>
              );
            })}
          </nav>
          <div className="border-t border-white/[0.08] p-3">
            <div className="rounded-[12px] border border-white/[0.08] bg-white/[0.025] p-3">
              <p className="text-[11px] tracking-[0.12em] text-white/30 uppercase">Signed in</p>
              <p className="mt-1 truncate text-[12.5px] text-white/70">{user?.email}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push("/logout")} className="mt-2 w-full justify-start text-white/50 hover:text-white">
              Sign out
            </Button>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#07080a]/88 backdrop-blur-xl">
            <div className="flex h-[72px] items-center justify-between px-5 sm:px-8">
              <div>
                <p className="text-[11px] font-medium tracking-[0.16em] text-white/35 uppercase">Platform administration</p>
                <h1 className="mt-1 text-[19px] font-medium tracking-[-0.03em] text-white">
                  {tabs.find((t) => t.id === tab)?.label ?? "Overview"}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] text-white/45 sm:inline-flex">All systems</span>
                <button type="button" onClick={() => void load(tab)} className="flex h-9 items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.035] px-3 text-[12px] text-white/55 transition hover:bg-white/[0.07] hover:text-white">
                  <RefreshCw size={13} className={dataLoading ? "animate-spin" : ""} /> Refresh
                </button>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1480px] px-5 py-6 sm:px-8 sm:py-8">
            <div className="mb-5 flex gap-1 overflow-x-auto border-b border-white/[0.08] pb-3 lg:hidden">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 rounded-[10px] px-4 py-2 text-[14px] transition ${
                  tab === t.id ? "bg-white/[0.06] text-ink" : "text-muted hover:text-ink"
                }`}
              >
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
          <span className="flex-1" />
          <button
            onClick={() => void load(tab)}
            className="flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[13px] text-muted hover:text-ink"
          >
            <RefreshCw size={13} className={dataLoading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* OVERVIEW */}
        {tab === "overview" ? (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: "Users", value: totals?.users },
                { label: "Chats", value: totals?.chats },
                { label: "Messages", value: totals?.messages },
                { label: "Memories", value: totals?.memories },
              ].map((s) => (
                <div key={s.label} className="rounded-[14px] border border-line bg-bg-elevated/60 p-5">
                  <p className="text-[12px] tracking-[0.1em] text-faint uppercase">{s.label}</p>
                  <p className="mt-1 text-[28px] font-light tracking-[-0.03em]">{s.value ?? "—"}</p>
                </div>
              ))}
            </div>

            {analytics ? (
              <section className="mt-8" aria-labelledby="monitoring-heading">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-medium tracking-[0.16em] text-white/35 uppercase">Live signals</p>
                    <h2 id="monitoring-heading" className="mt-1 text-[19px] font-medium tracking-[-0.03em]">Overview &amp; monitoring</h2>
                  </div>
                  <span className="text-[11px] text-white/35">Real data only · UTC</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
                  {[
                    { label: "Active · 7 days", value: analytics.monitoring.activeUsers7.toLocaleString(), hint: `${analytics.monitoring.activeUsers30.toLocaleString()} active in 30d` },
                    { label: "New today", value: analytics.monitoring.signupsToday.toLocaleString(), hint: `${analytics.monitoring.signupsYesterday.toLocaleString()} yesterday` },
                    { label: "Chats today", value: analytics.monitoring.chatsToday.toLocaleString(), hint: `${analytics.monitoring.messagesToday.toLocaleString()} messages` },
                    { label: "Avg messages/chat", value: analytics.monitoring.averageMessagesPerChat.toString(), hint: "Last 30 days" },
                    { label: "Free → Pro", value: analytics.summary.totalUsers ? `${Math.round((analytics.summary.proSubscriptions / analytics.summary.totalUsers) * 100)}%` : "0%", hint: `${analytics.summary.proSubscriptions} Pro users` },
                    { label: "API cost", value: analytics.monitoring.apiCostUsd === null ? "Not connected" : `$${analytics.monitoring.apiCostUsd.toFixed(2)}`, hint: "Usage billing source" },
                    { label: "AI latency", value: analytics.monitoring.latencyMs === null ? "Not connected" : `${analytics.monitoring.latencyMs} ms`, hint: "Model telemetry" },
                    { label: "Error rate", value: analytics.monitoring.errorRate === null ? "Not connected" : `${analytics.monitoring.errorRate}%`, hint: "Last 24 hours" },
                    { label: "Uptime", value: analytics.monitoring.uptime === null ? "Not connected" : `${analytics.monitoring.uptime}%`, hint: "Last 90 days" },
                    { label: "Server load", value: analytics.monitoring.serverLoad === null ? "Not connected" : `${analytics.monitoring.serverLoad.cpu}% CPU`, hint: "CPU / RAM / DB" },
                    { label: "Geography", value: analytics.monitoring.geography === null ? "Not connected" : "Available", hint: "Locale telemetry" },
                    { label: "Devices", value: analytics.monitoring.deviceSplit === null ? "Not connected" : "Available", hint: "Mobile / desktop" },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-[13px] border border-white/[0.08] bg-white/[0.025] p-4">
                      <p className="truncate text-[10px] font-medium tracking-[0.12em] text-white/35 uppercase">{metric.label}</p>
                      <p className={`mt-2 truncate text-[19px] font-medium tracking-[-0.03em] ${metric.value === "Not connected" ? "text-white/35 text-[13px]" : "text-white"}`}>{metric.value}</p>
                      <p className="mt-1 truncate text-[11px] text-white/35">{metric.hint}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-[13px] border border-white/[0.08] bg-white/[0.025] p-4">
                    <div className="flex items-center justify-between">
                      <div><p className="text-[13.5px] font-medium">Top active users</p><p className="mt-0.5 text-[11px] text-white/35">Messages in the last 30 days</p></div>
                      <Users size={15} className="text-white/40" />
                    </div>
                    <div className="mt-3 space-y-2">
                      {analytics.monitoring.topUsers.length ? analytics.monitoring.topUsers.map((top, index) => (
                        <div key={top.id} className="flex items-center gap-3 text-[12.5px]">
                          <span className="w-4 text-white/30">{index + 1}</span><span className="min-w-0 flex-1 truncate text-white/75">{top.name}</span><span className="text-white/40">{top.messageCount} msgs</span>
                        </div>
                      )) : <p className="text-[12px] text-white/35">No activity data yet.</p>}
                    </div>
                  </div>
                  <div className="rounded-[13px] border border-white/[0.08] bg-white/[0.025] p-4">
                    <p className="text-[13.5px] font-medium">Plan distribution</p>
                    <div className="mt-3 space-y-2.5">
                      {Object.entries(analytics.monitoring.planDistribution).map(([plan, count]) => (
                        <div key={plan} className="flex items-center gap-3 text-[12.5px]"><span className="w-16 capitalize text-white/55">{plan}</span><div className="h-1.5 flex-1 rounded-full bg-white/[0.07]"><div className="h-1.5 rounded-full bg-white/60" style={{ width: `${Math.min(100, (count / Math.max(analytics.summary.totalUsers, 1)) * 100)}%` }} /></div><span className="w-8 text-right text-white/45">{count}</span></div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            <h2 className="mt-8 flex items-center gap-2 text-[17px] font-medium">
              <Users size={16} /> Users
            </h2>
            <div className="mt-3 overflow-x-auto rounded-[14px] border border-line">
              <table className="w-full text-left text-[13.5px]">
                <thead className="bg-white/[0.03] text-[12px] text-faint uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Email</th>
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">Joined</th>
                    <th className="px-4 py-2.5">Last sign-in</th>
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 8).map((u) => (
                    <tr key={u.id} className="border-t border-line">
                      <td className="px-4 py-2.5"><Link href={`/admin/user/${encodeURIComponent(u.id)}`} className="text-white/80 underline-offset-4 hover:text-white hover:underline">{u.email}</Link></td>
                      <td className="px-4 py-2.5 text-muted">{u.name || "—"}</td>
                      <td className="px-4 py-2.5 text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5 text-muted">
                        {u.lastSignIn ? new Date(u.lastSignIn).toLocaleString() : "never"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[12.5px] text-faint">
              Full management in the Users tab · chat moderation in previous view (Chats &amp; messages is part of Overview data).
            </p>
          </>
        ) : null}

        {/* USERS */}
        {tab === "users" ? (
          <>
            <div className="mt-6 flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
                <Input
                  placeholder="Search users by email or name…"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="mt-4 overflow-x-auto rounded-[14px] border border-line">
              <table className="w-full text-left text-[13.5px]">
                <thead className="bg-white/[0.03] text-[12px] text-faint uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Email</th>
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">Plan</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Last active</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const p = profiles[u.id];
                    return (
                      <tr key={u.id} className="border-t border-line">
                        <td className="px-4 py-2.5"><Link href={`/admin/user/${encodeURIComponent(u.id)}`} className="text-white/80 underline-offset-4 hover:text-white hover:underline">{u.email}</Link></td>
                        <td className="px-4 py-2.5 text-muted">{u.name || "—"}</td>
                        <td className="px-4 py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] uppercase ${p?.plan === "pro" ? "bg-accent-soft text-accent" : "bg-white/[0.05] text-muted"}`}>
                            {p?.plan ?? "free"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={p?.banned ? "text-danger" : "text-ok"}>
                            {p?.banned ? "banned" : "active"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted">
                          {u.lastSignIn ? new Date(u.lastSignIn).toLocaleDateString() : "never"}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => void patchUser(u.id, { plan: p?.plan === "pro" ? "free" : "pro" })}
                              className="rounded-md px-2 py-1 text-[12px] text-muted hover:text-accent"
                            >
                              {p?.plan === "pro" ? "Revoke Pro" : "Grant Pro"}
                            </button>
                            <button
                              onClick={() => void patchUser(u.id, { banned: !p?.banned })}
                              className="rounded-md px-2 py-1 text-[12px] text-muted hover:text-danger"
                            >
                              {p?.banned ? "Unban" : "Ban"}
                            </button>
                            <button
                              onClick={() => void deleteUser(u.id)}
                              className="rounded-lg p-1.5 text-faint hover:bg-white/5 hover:text-danger"
                              title="Delete user"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {/* CHATS & MESSAGE INSPECTOR */}
        {tab === "chats" ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_420px]">
            <div className="overflow-hidden rounded-[14px] border border-line">
              <table className="w-full text-left text-[13.5px]">
                <thead className="bg-white/[0.03] text-[12px] text-faint uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Title</th>
                    <th className="px-4 py-2.5">Owner</th>
                    <th className="px-4 py-2.5">Msgs</th>
                    <th className="px-4 py-2.5">Updated</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {chats.map((c) => (
                    <tr
                      key={c.id}
                      className={`cursor-pointer border-t border-line transition hover:bg-white/[0.03] ${
                        openChat?.id === c.id ? "bg-white/[0.05]" : ""
                      }`}
                      onClick={() => void openMessages(c)}
                    >
                      <td className="max-w-[220px] truncate px-4 py-2.5">{c.title || "Untitled"}</td>
                      <td className="px-4 py-2.5 font-mono text-[11.5px] text-muted">
                        {c.userId ? `${c.userId.slice(0, 8)}…` : "guest"}
                      </td>
                      <td className="px-4 py-2.5 text-muted">{c.messageCount}</td>
                      <td className="px-4 py-2.5 text-muted">{new Date(c.updatedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void deleteChat(c.id);
                          }}
                          className="rounded-lg p-1.5 text-faint hover:bg-white/5 hover:text-danger"
                          title="Delete chat"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {chats.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-muted">No synced chats yet.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="rounded-[14px] border border-line bg-bg-elevated/60">
              <div className="border-b border-line px-4 py-3">
                <p className="text-[13.5px] font-medium">
                  {openChat ? openChat.title || "Untitled chat" : "Message inspector"}
                </p>
                {openChat ? (
                  <p className="mt-0.5 font-mono text-[11px] text-faint">chat: {openChat.id}</p>
                ) : null}
              </div>
              <div className="max-h-[60vh] space-y-3 overflow-y-auto p-4">
                {!openChat ? (
                  <p className="py-8 text-center text-[13.5px] text-muted">
                    Click a chat to inspect and edit its messages.
                  </p>
                ) : null}
                {messages.map((m) => (
                  <div key={m.id} className="rounded-[12px] border border-line bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] tracking-wide uppercase ${
                          m.role === "user" ? "bg-user text-ink" : "bg-accent-soft text-accent"
                        }`}
                      >
                        {m.role}
                      </span>
                      <span className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditId(m.id);
                            setEditValue(m.content);
                          }}
                          className="rounded-md px-2 py-1 text-[11.5px] text-muted hover:text-ink"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => void deleteMessage(m.id)}
                          className="rounded-md p-1 text-faint hover:text-danger"
                          title="Delete message"
                        >
                          <Trash2 size={13} />
                        </button>
                      </span>
                    </div>
                    {editId === m.id ? (
                      <div className="mt-2 space-y-2">
                        <Textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="min-h-[120px]"
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditId(null)}>
                            Cancel
                          </Button>
                          <Button size="sm" onClick={() => void saveMessage()}>
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-[13px] leading-relaxed text-muted">
                        {m.content || "(empty)"}
                      </p>
                    )}
                  </div>
                ))}
                {openChat && messages.length === 0 ? (
                  <p className="py-6 text-center text-[13.5px] text-muted">No messages in this chat.</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* EMAILS */}
        {tab === "emails" ? (
          <div className="mt-6 space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-[14px] border border-line bg-bg-elevated/60 p-4">
                <p className="text-[11.5px] uppercase tracking-wider text-faint">Resend</p>
                <p className={`mt-1 text-[15px] font-medium ${emailConfig?.resendKeyConfigured ? "text-ok" : "text-danger"}`}>
                  {emailConfig ? (emailConfig.resendKeyConfigured ? "Connected" : "Key missing") : "…"}
                </p>
                <p className="mt-0.5 text-[12px] text-muted">{emailConfig?.domain ?? ""}</p>
              </div>
              <div className="rounded-[14px] border border-line bg-bg-elevated/60 p-4">
                <p className="text-[11.5px] uppercase tracking-wider text-faint">Webhooks</p>
                <p className={`mt-1 text-[15px] font-medium ${emailConfig?.webhookSecretConfigured ? "text-ok" : "text-muted"}`}>
                  {emailConfig ? (emailConfig.webhookSecretConfigured ? "Verified" : "Not configured") : "…"}
                </p>
                <p className="mt-0.5 text-[12px] text-muted">delivery tracking</p>
              </div>
              <div className="rounded-[14px] border border-line bg-bg-elevated/60 p-4">
                <p className="text-[11.5px] uppercase tracking-wider text-faint">Templates</p>
                <p className="mt-1 text-[15px] font-medium">{emailLibrary.length || "…"}</p>
                <p className="mt-0.5 text-[12px] text-muted">
                  senders: {(emailConfig?.senders ?? []).length || "…"}
                </p>
              </div>
              <div className="rounded-[14px] border border-line bg-bg-elevated/60 p-4">
                <p className="text-[11.5px] uppercase tracking-wider text-faint">Marketing opted in</p>
                <p className="mt-1 text-[15px] font-medium">{emailStats?.marketingOptedIn ?? "…"}</p>
                <p className="mt-0.5 text-[12px] text-muted">
                  sent: {emailStats?.byStatus?.sent ?? "…"} · failed: {emailStats?.byStatus?.failed ?? "…"} · skipped: {emailStats?.byStatus?.skipped_no_consent ?? 0}
                </p>
              </div>
            </div>
          <div className="grid gap-5 lg:grid-cols-[400px_1fr]">
            <div className="rounded-[14px] border border-line bg-bg-elevated/60 p-5">
              <h3 className="flex items-center gap-2 text-[15px] font-medium">
                <Send size={14} className="text-accent" /> Send email
              </h3>
              <div className="mt-4 space-y-3">
                <select
                  value={composeTemplate}
                  onChange={(e) => setComposeTemplate(e.target.value)}
                  className="h-11 w-full rounded-[12px] border border-line bg-white/[0.03] px-3 text-[14px] text-ink outline-none"
                >
                  <optgroup label="New library (Resend)">
                    {emailLibrary.map((t) => (
                      <option key={t.id} value={t.id} className="bg-[#141416]">
                        {t.name} · {t.kind}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Legacy">
                    {Object.entries(TEMPLATE_LABELS).map(([k, v]) => (
                      <option key={k} value={k} className="bg-[#141416]">
                        {v}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <Input placeholder="To (email)" value={composeTo} onChange={(e) => setComposeTo(e.target.value)} />
                <Input placeholder="Recipient name (optional)" value={composeName} onChange={(e) => setComposeName(e.target.value)} />
                {composeTemplate === "ceo_custom" ? (
                  <>
                    <select
                      value={composeFrom}
                      onChange={(e) => setComposeFrom(e.target.value)}
                      className="h-11 w-full rounded-[12px] border border-line bg-white/[0.03] px-3 text-[14px] text-ink outline-none"
                    >
                      <option value="ceo@verxa.de" className="bg-[#141416]">ceo@verxa.de</option>
                      <option value="info@verxa.de" className="bg-[#141416]">info@verxa.de</option>
                      <option value="support@verxa.de" className="bg-[#141416]">support@verxa.de</option>
                    </select>
                    <Input placeholder="Subject" value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} />
                  </>
                ) : null}
                <Textarea
                  placeholder="Custom message (used by CEO custom, ticket reply, notes…)"
                  value={composeMessage}
                  onChange={(e) => setComposeMessage(e.target.value)}
                  className="min-h-[100px]"
                />
                <Button className="w-full" onClick={() => void sendComposed()}>
                  Send email
                </Button>
                {composeResult ? (
                  <p className={`text-[12.5px] ${composeResult.startsWith("Sent") ? "text-ok" : "text-danger"}`}>
                    {composeResult}
                  </p>
                ) : null}
                <p className="text-[11.5px] leading-relaxed text-faint">
                  New-library templates send via Resend with consent checks and delivery logging. Legacy templates use the old chain (InboxMail → Resend → Gmail SMTP). Use “Resend” to retry any email after fixing a provider.
                </p>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setEmailFilter("")}
                  className={`rounded-full px-3 py-1.5 text-[12px] ${!emailFilter ? "bg-white/[0.07] text-ink" : "text-muted hover:text-ink"}`}
                >
                  All
                </button>
                {Object.entries(TEMPLATE_LABELS).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => setEmailFilter(k)}
                    className={`rounded-full px-3 py-1.5 text-[12px] ${emailFilter === k ? "bg-white/[0.07] text-ink" : "text-muted hover:text-ink"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <div className="mt-3 overflow-x-auto rounded-[14px] border border-line">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-white/[0.03] text-[11.5px] text-faint uppercase">
                    <tr>
                      <th className="px-3.5 py-2.5">To</th>
                      <th className="px-3.5 py-2.5">Template</th>
                      <th className="px-3.5 py-2.5">Status</th>
                      <th className="px-3.5 py-2.5">When</th>
                      <th className="px-3.5 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((l) => (
                      <tr key={l.id} className="border-t border-line">
                        <td className="max-w-[180px] truncate px-3.5 py-2.5">{l.to_email}</td>
                        <td className="px-3.5 py-2.5 text-muted">{TEMPLATE_LABELS[l.template] ?? emailLibrary.find((t) => t.id === l.template)?.name ?? l.template}</td>
                        <td className="px-3.5 py-2.5">
                          <span className={l.status === "sent" ? "text-ok" : "text-danger"} title={l.error ?? ""}>
                            {l.status}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-muted">{new Date(l.created_at).toLocaleString()}</td>
                        <td className="px-3.5 py-2.5 text-right">
                          <button
                            onClick={() => void resendEmail(l.id)}
                            className="rounded-md px-2 py-1 text-[12px] text-muted hover:text-accent"
                          >
                            Resend
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-muted">No emails logged yet.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          </div>
        ) : null}

        {/* TICKETS */}
        {tab === "tickets" ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-[380px_1fr]">
            <div className="overflow-hidden rounded-[14px] border border-line">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setOpenTicket(t)}
                  className={`block w-full border-b border-line px-4 py-3 text-left transition hover:bg-white/[0.03] ${
                    openTicket?.id === t.id ? "bg-white/[0.05]" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13.5px] font-medium">{t.subject || "(no subject)"}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10.5px] uppercase ${
                        t.status === "open" ? "bg-accent-soft text-accent" : t.status === "pending" ? "bg-white/[0.06] text-muted" : "bg-white/[0.04] text-faint"
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[12px] text-faint">{t.email} · {new Date(t.created_at).toLocaleDateString()}</p>
                </button>
              ))}
              {tickets.length === 0 ? (
                <p className="px-4 py-8 text-center text-[13.5px] text-muted">No tickets yet.</p>
              ) : null}
            </div>

            <div className="rounded-[14px] border border-line bg-bg-elevated/60">
              {!openTicket ? (
                <p className="p-8 text-center text-[13.5px] text-muted">Select a ticket to view and reply.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium">{openTicket.subject || "(no subject)"}</p>
                      <p className="text-[12px] text-faint">{openTicket.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {["open", "pending", "closed"].map((s) => (
                        <button
                          key={s}
                          onClick={() => void setTicketStatus(openTicket.id, s)}
                          className={`rounded-full px-2.5 py-1 text-[11px] uppercase ${openTicket.status === s ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="max-h-[46vh] space-y-3 overflow-y-auto p-4">
                    <div className="rounded-[12px] border border-line bg-white/[0.02] p-3">
                      <p className="text-[11px] tracking-wide text-faint uppercase">User</p>
                      <p className="mt-1.5 text-[13.5px] whitespace-pre-wrap text-ink/90">{openTicket.message}</p>
                    </div>
                    {openTicket.replies.map((r) => (
                      <div key={r.id} className="rounded-[12px] border border-accent/25 bg-accent/[0.06] p-3">
                        <p className="text-[11px] tracking-wide text-accent uppercase">Support</p>
                        <p className="mt-1.5 text-[13.5px] whitespace-pre-wrap text-ink/90">{r.body}</p>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-line p-4">
                    <Textarea
                      placeholder="Write a reply (sends email to the user)…"
                      value={ticketReply}
                      onChange={(e) => setTicketReply(e.target.value)}
                      className="min-h-[90px]"
                    />
                    <div className="mt-2 flex justify-end">
                      <Button size="sm" onClick={() => void replyTicket()}>
                        <Send size={13} /> Reply
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}

        {/* SUBSCRIPTIONS */}
        {tab === "subscriptions" ? (
          <>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-[14px] border border-line bg-bg-elevated/60 p-5">
                <p className="text-[12px] tracking-[0.1em] text-faint uppercase">Pro users</p>
                <p className="mt-1 text-[26px] font-light">
                  {Object.values(profiles).filter((p) => p.plan === "pro").length}
                </p>
              </div>
              <div className="rounded-[14px] border border-line bg-bg-elevated/60 p-5">
                <p className="text-[12px] tracking-[0.1em] text-faint uppercase">Subscription records</p>
                <p className="mt-1 text-[26px] font-light">{subs.length}</p>
              </div>
              <div className="rounded-[14px] border border-line bg-bg-elevated/60 p-5">
                <p className="text-[12px] tracking-[0.1em] text-faint uppercase">MRR (est.)</p>
                <p className="mt-1 text-[26px] font-light">
                  €{Object.values(profiles).filter((p) => p.plan === "pro").length * 20}
                </p>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto rounded-[14px] border border-line">
              <table className="w-full text-left text-[13.5px]">
                <thead className="bg-white/[0.03] text-[12px] text-faint uppercase">
                  <tr>
                    <th className="px-4 py-2.5">User ID</th>
                    <th className="px-4 py-2.5">Plan</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Since</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((s) => (
                    <tr key={s.id} className="border-t border-line">
                      <td className="px-4 py-2.5 font-mono text-[12px]">{s.user_id?.slice(0, 8)}…</td>
                      <td className="px-4 py-2.5 uppercase">{s.plan}</td>
                      <td className="px-4 py-2.5">{s.status}</td>
                      <td className="px-4 py-2.5 text-muted">{new Date(s.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {subs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-muted">
                        No subscription records yet — grant Pro from the Users tab.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {/* ANALYTICS */}
        {tab === "analytics" ? (
          analytics ? (
            <div className="mt-6 space-y-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-[14px] border border-line bg-bg-elevated/60 p-5">
                  <p className="text-[12px] tracking-[0.1em] text-faint uppercase">Total users</p>
                  <p className="mt-1 text-[26px] font-light">{analytics.summary.totalUsers}</p>
                </div>
                <div className="rounded-[14px] border border-line bg-bg-elevated/60 p-5">
                  <p className="text-[12px] tracking-[0.1em] text-faint uppercase">New this week</p>
                  <p className="mt-1 text-[26px] font-light">{analytics.summary.newThisWeek}</p>
                </div>
                <div className="rounded-[14px] border border-line bg-bg-elevated/60 p-5">
                  <p className="text-[12px] tracking-[0.1em] text-faint uppercase">Pro subs</p>
                  <p className="mt-1 text-[26px] font-light">{analytics.summary.proSubscriptions}</p>
                </div>
                <div className="rounded-[14px] border border-line bg-bg-elevated/60 p-5">
                  <p className="text-[12px] tracking-[0.1em] text-faint uppercase">Email success</p>
                  <p className="mt-1 text-[26px] font-light">
                    {analytics.emailDelivery.rate !== null
                      ? `${Math.round(analytics.emailDelivery.rate * 100)}%`
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[14px] border border-line bg-bg-elevated/60 p-5">
                  <p className="text-[13.5px] font-medium">Signups — last 30 days</p>
                  {sparkline(analytics.growth.map((g) => g.signups), "#8ea4ff")}
                  <p className="text-[11.5px] text-faint">Daily new registrations</p>
                </div>
                <div className="rounded-[14px] border border-line bg-bg-elevated/60 p-5">
                  <p className="text-[13.5px] font-medium">Active users — last 30 days</p>
                  {sparkline(analytics.growth.map((g) => g.activeUsers), "#9298a5")}
                  <p className="text-[11.5px] text-faint">Daily sign-ins</p>
                </div>
                <div className="rounded-[14px] border border-line bg-bg-elevated/60 p-5">
                  <p className="text-[13.5px] font-medium">Messages — last 30 days</p>
                  {sparkline(analytics.activity.map((a) => a.messages), "#b4c2ff")}
                  <p className="text-[11.5px] text-faint">AI replies generated</p>
                </div>
                <div className="rounded-[14px] border border-line bg-bg-elevated/60 p-5">
                  <p className="text-[13.5px] font-medium">Conversion funnel</p>
                  <div className="mt-3 space-y-2">
                    {[
                      { label: "Visitors", v: analytics.funnel.visitors, w: 100 },
                      { label: "Signups", v: analytics.funnel.signups, w: Math.max(8, (analytics.funnel.visitors === null ? 0 : analytics.funnel.signups / Math.max(analytics.funnel.visitors, 1)) * 100) },
                      { label: "Pro", v: analytics.funnel.pro, w: Math.max(4, (analytics.funnel.pro / Math.max(analytics.funnel.signups, 1)) * 100) },
                    ].map((f) => (
                      <div key={f.label}>
                        <div className="flex justify-between text-[12px] text-muted">
                          <span>{f.label}</span>
                          <span>{f.v}</span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-white/[0.05]">
                          <div className="h-2 rounded-full bg-accent" style={{ width: `${f.w}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-8 text-center text-muted">Loading analytics…</p>
          )
        ) : null}

        {/* Keep chat inspector reachable under Overview */}
        {tab === "overview" ? null : null}

        {tab === "integrations" ? <IntegrationsTab /> : null}
          </main>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Integrations admin tab: health, counts, audit trail.                 */
/* SECURITY BY DESIGN: the endpoint never selects token columns, so no  */
/* access/refresh token can ever appear in this view.                   */
/* ------------------------------------------------------------------ */

type IntegrationsHealth = { encryptionKey: string };
type ProviderRow = {
  id: string;
  name: string;
  enabled: boolean;
  configured: boolean;
  providerConfig: string;
  totalConnections: number;
  active: number;
  needsReauth: number;
  revoked: number;
  errors: number;
};
type IntegrationEvent = {
  provider: string;
  event: string;
  detail: string | null;
  created_at: string;
};

function IntegrationsTab() {
  const [health, setHealth] = useState<IntegrationsHealth | null>(null);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/integrations", { cache: "no-store" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const j = (await res.json()) as {
        health: IntegrationsHealth;
        providers: ProviderRow[];
        recentEvents: IntegrationEvent[];
      };
      setHealth(j.health);
      setProviders(j.providers);
      setEvents(j.recentEvents);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <p className="mt-8 flex items-center justify-center gap-2 text-muted">
        <Loader2 size={16} className="animate-spin" /> Loading integrations…
      </p>
    );
  }
  if (error) {
    return (
      <div className="mt-8 rounded-[14px] border border-[#5a2a2a] bg-[#2a1414] px-4 py-3 text-[13.5px] text-[#f3b8b8]">
        {error}
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full border px-3 py-1 text-[12px] ${
            health?.encryptionKey === "configured"
              ? "border-[#2a4a33] bg-[#12201a] text-[#8fe0aa]"
              : "border-[#5a2a2a] bg-[#2a1414] text-[#f3b8b8]"
          }`}
        >
          Token encryption: {health?.encryptionKey ?? "unknown"}
        </span>
        <span className="text-[12px] text-faint">
          Admins can never view user tokens — only counts, statuses, and audit events.
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {providers.map((p) => (
          <div key={p.id} className="rounded-[14px] border border-line bg-bg-elevated/60 p-5">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-medium">{p.name}</p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] ${
                  p.enabled && p.configured
                    ? "border-[#2a4a33] bg-[#12201a] text-[#8fe0aa]"
                    : "border-line text-faint"
                }`}
              >
                {p.enabled ? (p.configured ? "enabled" : "no credentials") : "disabled"}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[12.5px] text-muted">
              <span>Connected users: <b className="text-ink">{p.totalConnections}</b></span>
              <span>Active: <b className="text-ink">{p.active}</b></span>
              <span>Reconnect needed: <b className="text-ink">{p.needsReauth}</b></span>
              <span>Revoked: <b className="text-ink">{p.revoked}</b></span>
              <span>Errors: <b className="text-ink">{p.errors}</b></span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[14px] border border-line bg-bg-elevated/60 p-5">
        <p className="text-[13.5px] font-medium">Recent OAuth events (audit)</p>
        {events.length === 0 ? (
          <p className="mt-3 text-[13px] text-faint">No events yet.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-1.5">
            {events.slice(0, 20).map((e, idx) => (
              <div key={idx} className="flex items-center justify-between gap-4 text-[12.5px]">
                <span className="text-muted">
                  <b className="text-ink">{e.provider}</b> · {e.event}
                  {e.detail ? <span className="text-faint"> — {e.detail}</span> : null}
                </span>
                <span className="shrink-0 text-faint">
                  {new Date(e.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
