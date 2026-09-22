/**
 * Centralized email service — the ONLY place that talks to Resend.
 *
 * Pipeline: event/policy -> template -> variables -> sender -> consent gate
 * -> Resend -> logging. All other code must use `sendTemplateEmail`,
 * `sendTransactional` or `sendMarketing` — never call Resend directly.
 */

import { Resend } from "resend";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  APP_URL,
  DEFAULT_REPLY_TO,
  assertServerOnly,
  isResendConfigured,
  senderAddress,
  type SenderKey,
} from "./config";
import { getTemplate, renderTemplate } from "./registry";
import type { TemplateVars } from "./templates/types";
import { canSendMarketing, getPreferences } from "./preferences";
import { signUnsubscribe } from "./tokens";

export type SendResult = { ok: boolean; id?: string; error?: string };

/** Indicates a consent refusal (not a provider failure). */
export type SendOutcome = SendResult & { skipped?: "no-consent" | "no-address" };

function serviceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return null;
  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

let resendClient: Resend | null = null;
function resend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  if (!resendClient) resendClient = new Resend(key);
  return resendClient;
}

/** Low-level Resend dispatch. Only called from this module. */
export async function sendRawEmail(opts: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  tags?: { name: string; value: string }[];
  idempotencyKey?: string;
}): Promise<SendResult> {
  assertServerOnly("sendRawEmail");
  const client = resend();
  if (!client) return { ok: false, error: "RESEND_API_KEY is not configured." };
  try {
    const { data, error } = await client.emails.send(
      {
        from: opts.from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        replyTo: opts.replyTo ?? DEFAULT_REPLY_TO,
        headers: opts.headers,
        tags: opts.tags,
      },
      { idempotencyKey: opts.idempotencyKey },
    );
    if (error) {
      return {
        ok: false,
        error: `Resend ${error.name ?? "error"}: ${(error as { message?: string }).message ?? "unknown"}`,
      };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    return {
      ok: false,
      error: `Resend request failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function logEmail(row: {
  to_email: string;
  from_email: string;
  subject: string;
  template: string;
  event?: string | null;
  kind?: string | null;
  locale?: string | null;
  status: string;
  provider_id?: string | null;
  resend_id?: string | null;
  idempotency_key?: string | null;
  error?: string | null;
}) {
  try {
    const db = serviceSupabase();
    if (!db) return;
    // Never store secrets or raw tokens — payload is intentionally omitted.
    await db.from("verxa_email_logs").insert({
      to_email: row.to_email,
      from_email: row.from_email,
      subject: row.subject,
      template: row.template,
      event: row.event ?? null,
      kind: row.kind ?? null,
      locale: row.locale ?? null,
      status: row.status,
      provider_id: row.provider_id ?? null,
      resend_id: row.resend_id ?? null,
      idempotency_key: row.idempotency_key ?? null,
      error: row.error ?? null,
    });
  } catch {
    /* logging must never break sending */
  }
}

export type TemplateSendOpts = {
  templateId: string;
  to: string;
  vars?: TemplateVars;
  /** Authenticated user id (for consent lookup + log linkage). */
  userId?: string | null;
  locale?: string | null;
  event?: string | null;
  senderOverride?: SenderKey;
  replyTo?: string;
  /** Extra variables injected by the system (unsubscribe URL etc.). */
  systemVars?: TemplateVars;
  idempotencyKey?: string;
};

/**
 * Render + send a template. Marketing templates are consent-gated here, so
 * no caller can accidentally mail unsubscribed users.
 */
export async function sendTemplateEmail(
  opts: TemplateSendOpts,
): Promise<SendOutcome> {
  assertServerOnly("sendTemplateEmail");
  const to = opts.to.trim().toLowerCase();
  if (!to || !to.includes("@")) return { ok: false, skipped: "no-address", error: "Invalid recipient." };

  const def = getTemplate(opts.templateId);
  if (!def) return { ok: false, error: `Unknown template: ${opts.templateId}` };

  const senderKey = opts.senderOverride ?? def.sender;
  const from = senderAddress(senderKey);

  // Marketing gate: consent is checked BEFORE every marketing send.
  let unsubscribeUrl: string | undefined;
  if (def.kind === "marketing") {
    const allowed = await canSendMarketing({ userId: opts.userId, email: to });
    if (!allowed) {
      await logEmail({
        to_email: to,
        from_email: from,
        subject: `(skipped) ${def.id}`,
        template: def.id,
        event: opts.event,
        kind: def.kind,
        status: "skipped_no_consent",
      });
      return { ok: false, skipped: "no-consent", error: "No marketing consent." };
    }
    unsubscribeUrl = `${APP_URL}/unsubscribe`;
    try {
      const token = signUnsubscribe(to, opts.userId ?? null);
      if (token)
        unsubscribeUrl = `${APP_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
    } catch {
      /* generic URL fallback */
    }
  }

  const vars: TemplateVars = { ...(opts.vars ?? {}), ...(opts.systemVars ?? {}) };
  const name = typeof vars.name === "string" ? vars.name : undefined;
  if (!name) {
    const fromProfile = await lookupDisplayName(opts.userId);
    if (fromProfile) vars.name = fromProfile;
    else vars.name = to.split("@")[0];
  }

  const { subject, html, text, locale } = renderTemplate(def, vars, opts.locale, {
    unsubscribeUrl,
    security: def.category === "security",
  });

  const day = new Date().toISOString().slice(0, 10);
  const idempotencyKey =
    opts.idempotencyKey ?? `verxa:${def.id}:${to}:${day}`;

  const headers: Record<string, string> = {};
  if (unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  const result = await sendRawEmail({
    from,
    to,
    subject,
    html,
    text,
    replyTo: opts.replyTo,
    headers,
    tags: [
      { name: "template", value: def.id },
      { name: "kind", value: def.kind },
    ],
    idempotencyKey,
  });

  await logEmail({
    to_email: to,
    from_email: from,
    subject,
    template: def.id,
    event: opts.event,
    kind: def.kind,
    locale,
    status: result.ok ? "sent" : "failed",
    provider_id: result.id ? `resend:${result.id}` : "resend",
    resend_id: result.id ?? null,
    idempotency_key: idempotencyKey,
    error: result.error ?? null,
  });

  return result;
}

/** Transactional wrapper (verification, security, billing, support…). */
export async function sendTransactional(
  opts: Omit<TemplateSendOpts, "event"> & { event: string },
): Promise<SendOutcome> {
  return sendTemplateEmail({ ...opts });
}

/** Marketing wrapper — consent enforced inside sendTemplateEmail. */
export async function sendMarketing(
  opts: Omit<TemplateSendOpts, "event"> & { event: string },
): Promise<SendOutcome> {
  const def = getTemplate(opts.templateId);
  if (def && def.kind !== "marketing") {
    return { ok: false, error: "sendMarketing requires a marketing template." };
  }
  return sendTemplateEmail({ ...opts });
}

async function lookupDisplayName(
  userId?: string | null,
): Promise<string | null> {
  try {
    if (!userId) return null;
    const db = serviceSupabase();
    if (!db) return null;
    const { data } = await db
      .from("verxa_profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    const name = (data as { display_name?: string } | null)?.display_name;
    return name?.trim() || null;
  } catch {
    return null;
  }
}

export { isResendConfigured, getPreferences };
