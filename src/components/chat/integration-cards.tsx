"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Calendar,
  FileText,
  Loader2,
  Mail,
  MailOpen,
  Plug,
  RefreshCw,
} from "lucide-react";
import type { IntegrationDataAttachment, ConnectPromptAttachment } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Provider branding                                                   */
/* ------------------------------------------------------------------ */

function GoogleMark({ size = 20 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src="/logos/google.svg"
      alt=""
      width={size}
      height={size}
      className="rounded-[4px]"
      draggable={false}
    />
  );
}

function ToolHeader({ tool, count }: { tool: string; count?: number }) {
  const meta: Record<string, { icon: React.ReactNode; label: string }> = {
    gmail_list: { icon: <Mail size={14} />, label: "Recent email" },
    gmail_search: { icon: <Mail size={14} />, label: "Email search" },
    gmail_read: { icon: <MailOpen size={14} />, label: "Email" },
    calendar_list: { icon: <Calendar size={14} />, label: "Calendar" },
    drive_search: { icon: <FileText size={14} />, label: "Drive" },
    gmail_draft: { icon: <FileText size={14} />, label: "Email draft" },
  };
  const m = meta[tool] ?? { icon: <Plug size={14} />, label: "Integration" };
  return (
    <div className="flex items-center gap-2.5">
      <GoogleMark size={18} />
      <span className="text-[11px] font-medium tracking-[0.12em] uppercase text-faint">
        {m.label}
        {typeof count === "number" ? ` · ${count}` : ""}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Email list rendering (gmail_list / gmail_search)                    */
/* ------------------------------------------------------------------ */

type GmailListItem = {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
};

function fmtEmailDate(raw: string): string {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  return isToday
    ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false })
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function EmailRow({
  email,
  onRead,
  glass,
}: {
  email: GmailListItem;
  onRead: (id: string) => void;
  glass?: boolean;
}) {
  const name = email.from.replace(/"?\s*<[^>]*>/, "").trim() || email.from;
  return (
    <button
      onClick={() => onRead(email.id)}
      className={cn(
        "w-full rounded-[14px] px-4 py-3 text-left transition-colors",
        glass ? "hover:bg-white/[0.05]" : "hover:bg-white/[0.04]",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">
          {name}
          {email.unread ? (
            <span className="ml-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent align-middle shadow-[0_0_6px_var(--accent)]" />
          ) : null}
        </span>
        <span className="shrink-0 text-[11px] text-faint">{fmtEmailDate(email.date)}</span>
      </div>
      <p className="mt-0.5 truncate text-[13px] text-muted">{email.subject}</p>
      <p className="mt-0.5 truncate text-[12px] text-faint">{email.snippet}</p>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Main attachment card                                                */
/* ------------------------------------------------------------------ */

export function IntegrationCard({
  attachment,
  glass,
}: {
  attachment: IntegrationDataAttachment;
  glass?: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [readEmail, setReadEmail] = useState<
    { subject: string; from: string; date: string; body: string } | null
  >(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  const emails: GmailListItem[] =
    attachment.tool === "gmail_list" || attachment.tool === "gmail_search"
      ? ((attachment.data as GmailListItem[] | undefined) ?? [])
      : [];

  async function openEmail(id: string) {
    if (openId === id) {
      setOpenId(null);
      setReadEmail(null);
      return;
    }
    setOpenId(id);
    setReadEmail(null);
    setReadError(null);
    setLoadingId(id);
    try {
      const res = await fetch("/api/integrations/google/tools/gmail_read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { subject: string; from: string; date: string; body: string };
        message?: string;
      };
      if (json.ok && json.data) {
        setReadEmail(json.data);
      } else {
        setReadError(json.message ?? "Could not open this email.");
      }
    } catch {
      setReadError("Could not open this email.");
    } finally {
      setLoadingId(null);
    }
  }

  const rows: unknown[] = Array.isArray(attachment.data)
    ? (attachment.data as unknown[])
    : [];
  const isEmailList = attachment.tool === "gmail_list" || attachment.tool === "gmail_search";

  return (
    <div
      className={cn(
        "mt-1 w-full overflow-hidden rounded-[18px]",
        glass ? "glass glass-btn" : "border border-line bg-bg-elevated/70",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 px-4 py-3",
          glass ? "" : "border-b border-line",
        )}
      >
        <ToolHeader
          tool={attachment.tool}
          count={isEmailList ? emails.length : rows.length}
        />
        <span className="flex items-center gap-1 text-[10.5px] text-faint">
          <RefreshCw size={10} />
          live
        </span>
      </div>

      {isEmailList ? (
        <div className="flex flex-col">
          {emails.map((email, i) => (
            <div key={email.id} className={cn(i > 0 && "border-t border-white/[0.05]")}>
              <EmailRow email={email} onRead={(id) => void openEmail(id)} glass={glass} />
              {openId === email.id ? (
                <div className="px-4 pb-4">
                  {loadingId === email.id ? (
                    <div className="flex items-center gap-2 py-2 text-[12.5px] text-faint">
                      <Loader2 size={13} className="animate-spin" /> Opening…
                    </div>
                  ) : readError ? (
                    <p className="py-2 text-[12.5px] text-[#e8c88a]">{readError}</p>
                  ) : readEmail ? (
                    <div className="rounded-[12px] bg-white/[0.03] px-4 py-3">
                      <p className="text-[13.5px] font-medium text-ink">{readEmail.subject}</p>
                      <p className="mt-0.5 text-[11.5px] text-faint">
                        {readEmail.from} · {readEmail.date}
                      </p>
                      <div className="mt-2 max-h-[320px] overflow-y-auto text-[13px] leading-relaxed whitespace-pre-wrap text-muted">
                        {readEmail.body}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : rows.length ? (
        <div className="space-y-1.5 px-4 pb-3">
          {rows.map((row, i) => (
            <pre
              key={i}
              className="max-h-[200px] overflow-auto rounded-[12px] bg-white/[0.03] p-3 text-[12px] leading-relaxed text-muted"
            >
              {JSON.stringify(row, null, 2)}
            </pre>
          ))}
        </div>
      ) : (
        <p className="px-4 pb-4 pt-1 text-[12.5px] text-faint">No results.</p>
      )}

      <p className="px-4 pb-3 text-[11px] text-faint">
        Fetched securely via your connected Google account — read-only.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Connect prompt card (integration not connected / needs re-auth)     */
/* ------------------------------------------------------------------ */

export function ConnectPromptCard({
  attachment,
  glass,
}: {
  attachment: ConnectPromptAttachment;
  glass?: boolean;
}) {
  const isGoogle = attachment.provider === "google";
  const providerName = isGoogle
    ? "Google"
    : attachment.provider.charAt(0).toUpperCase() + attachment.provider.slice(1);
  return (
    <div
      className={cn(
        "mt-1 flex w-full flex-col gap-3 rounded-[18px] p-4 sm:flex-row sm:items-center",
        glass ? "glass glass-btn" : "border border-line bg-bg-elevated/70",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3.5">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px]",
            glass ? "bg-white/[0.07]" : "border border-line bg-white/[0.03]",
          )}
        >
          {isGoogle ? <GoogleMark size={22} /> : <Plug size={20} className="text-muted" />}
        </div>
        <div className="min-w-0">
          <p className="text-[14.5px] font-medium text-ink">Connect {providerName}</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
            {attachment.message ?? "Connect to let Verxa use this service."}
          </p>
          <p className="mt-1 text-[11.5px] text-faint">
            Read-only access · encrypted tokens · revoke anytime
          </p>
        </div>
      </div>
      <a
        href={`/api/integrations/${attachment.provider}/connect`}
        className={cn(
          "tab-item flex shrink-0 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition",
          glass ? "glass-cta" : "bg-accent text-[#0b0b10] hover:bg-accent-strong",
        )}
      >
        <Plug size={13} />
        Connect
      </a>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inline error card                                                   */
/* ------------------------------------------------------------------ */

export function IntegrationErrorCard({ message, glass }: { message: string; glass?: boolean }) {
  return (
    <div
      className={cn(
        "mt-1 flex items-start gap-3 rounded-[18px] px-4 py-3.5",
        glass ? "glass" : "border border-[#5a2a2a] bg-[#2a1414]/60",
      )}
    >
      <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#e8c88a]" />
      <div className="min-w-0">
        <p className="text-[13.5px] text-[#f3d3a0]">{message}</p>
        <p className="mt-0.5 text-[11.5px] text-faint">
          Gmail access is currently unavailable. You can retry or reconnect from Plugins.
        </p>
      </div>
    </div>
  );
}
