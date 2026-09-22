import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { sendRawEmail } from "@/lib/email/service";

export type EmailTemplate =
  | "welcome"
  | "verify"
  | "password_reset"
  | "password_changed"
  | "email_changed"
  | "profile_updated"
  | "new_login"
  | "subscription_started"
  | "subscription_canceled"
  | "subscription_renewed"
  | "payment_failed"
  | "ticket_created"
  | "ticket_replied"
  | "ceo_custom";

const FROM: Record<Exclude<EmailTemplate, "ceo_custom">, string> = {
  welcome: "Verxa <welcome@verxa.de>",
  verify: "Verxa <support@verxa.de>",
  password_reset: "Verxa <support@verxa.de>",
  password_changed: "Verxa <security@verxa.de>",
  email_changed: "Verxa <security@verxa.de>",
  profile_updated: "Verxa <support@verxa.de>",
  new_login: "Verxa <security@verxa.de>",
  subscription_started: "Verxa <support@verxa.de>",
  subscription_canceled: "Verxa <support@verxa.de>",
  subscription_renewed: "Verxa <support@verxa.de>",
  payment_failed: "Verxa <billing@verxa.de>",
  ticket_created: "Verxa Support <support@verxa.de>",
  ticket_replied: "Verxa Support <support@verxa.de>",
};

type TemplateVars = {
  name?: string;
  action?: string;
  link?: string;
  linkLabel?: string;
  note?: string;
  subject?: string;
  message?: string;
};

function layout(inner: string, preheader = "") {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#08080a;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#08080a;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#101013;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
<tr><td style="padding:28px 32px 0;">
  <table role="presentation" width="100%"><tr>
    <td><span style="display:inline-block;font-size:18px;font-weight:600;color:#f2f2f4;letter-spacing:-0.02em;">◆ Verxa<span style="color:#8ea4ff;"> AI</span></span></td>
    <td align="right"><span style="font-size:12px;color:#5c5c66;">verxa.de</span></td>
  </tr></table>
</td></tr>
<tr><td style="padding:8px 32px 32px;">
  ${inner}
</td></tr>
<tr><td style="padding:18px 32px;border-top:1px solid rgba(255,255,255,0.07);">
  <span style="font-size:12px;line-height:1.6;color:#5c5c66;">
    Verxa AI · Berlin · <a href="https://verxa.de/support" style="color:#8ea4ff;text-decoration:none;">Support</a> ·
    <a href="https://verxa.de/privacy" style="color:#8ea4ff;text-decoration:none;">Privacy</a>
  </span>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function h2(t: string) {
  return `<h2 style="margin:18px 0 10px;font-size:20px;font-weight:600;color:#f2f2f4;letter-spacing:-0.02em;">${t}</h2>`;
}
function p(t: string) {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#a8a8b3;">${t}</p>`;
}
function btn(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr><td style="background:#8ea4ff;border-radius:10px;">
<a href="${href}" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#0b0b10;text-decoration:none;">${label}</a>
</td></tr></table>`;
}
function box(t: string) {
  return `<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.6;color:#c9c9d2;white-space:pre-wrap;">${t}</div>`;
}

export function renderEmail(template: EmailTemplate, vars: TemplateVars = {}) {
  const name = vars.name || "there";
  let subject = "Verxa AI";
  let inner = "";

  switch (template) {
    case "welcome":
      subject = "Welcome to Verxa AI";
      inner = h2(`Welcome, ${name} 👋`) + p(
        "Your Verxa account is ready. You now have eight curated AI models, live web search, and your conversations synced across every device.",
      ) + btn("https://verxa.de/chat", "Start chatting") + p(
        "If you ever need help, just reply to this email — it reaches a human.",
      );
      break;
    case "verify":
      subject = "Confirm your email address";
      inner = h2("One quick click") + p(
        `Hi ${name}, please confirm your email address to secure your Verxa account.`,
      ) + btn(vars.link || "#", "Confirm email") + p(
        "If you didn't create a Verxa account, you can ignore this email.",
      );
      break;
    case "password_reset":
      subject = "Reset your password";
      inner = h2("Password reset") + p(
        `Hi ${name}, we received a request to reset your Verxa password. This link is valid for a short time.`,
      ) + btn(vars.link || "#", "Reset password") + p(
        "Didn't request this? Your account is safe — the link expires unused.",
      );
      break;
    case "password_changed":
      subject = "Your password was changed";
      inner = h2("Security update") + p(
        `Hi ${name}, your Verxa password was just changed successfully.`,
      ) + (vars.note ? box(vars.note) : "") + p(
        "If this wasn't you, reply to this email immediately so we can lock the account.",
      );
      break;
    case "email_changed":
      subject = "Your email address was changed";
      inner = h2("Email updated") + p(
        `Hi ${name}, the email address on your Verxa account was changed to <strong style="color:#f2f2f4;">${vars.note || "a new address"}</strong>.`,
      ) + p("If this wasn't you, reply immediately.");
      break;
    case "profile_updated":
      subject = "Your profile was updated";
      inner = h2("Profile updated") + p(
        `Hi ${name}, changes were saved to your Verxa profile${vars.note ? `: ${vars.note}` : "."}`,
      );
      break;
    case "new_login":
      subject = "New sign-in to your Verxa account";
      inner = h2("New sign-in detected") + p(
        `Hi ${name}, your Verxa account was just accessed from a new sign-in.`,
      ) + (vars.note ? box(vars.note) : "") + p(
        "If this wasn't you, reset your password right away.",
      ) + btn("https://verxa.de/account/security", "Review security");
      break;
    case "subscription_started":
      subject = "Welcome to Verxa Pro";
      inner = h2("You're on Pro 🎉") + p(
        `Thanks ${name} — your Verxa Pro subscription is active. Unlimited chats, priority models, and premium support are unlocked.`,
      ) + btn("https://verxa.de/chat", "Open Verxa") + p("Manage your subscription anytime in your account settings.");
      break;
    case "subscription_canceled":
      subject = "Your Verxa subscription was canceled";
      inner = h2("Subscription canceled") + p(
        `Hi ${name}, your subscription has been canceled${vars.note ? ` — ${vars.note}` : ""}. You keep access until the end of the current period.`,
      ) + btn("https://verxa.de/account/subscription", "Subscription settings");
      break;
    case "subscription_renewed":
      subject = "Your Verxa Pro subscription renewed";
      inner = h2("Renewed ✓") + p(
        `Hi ${name}, your Pro subscription renewed successfully. Thanks for staying with Verxa.`,
      );
      break;
    case "payment_failed":
      subject = "Action needed: payment failed";
      inner = h2("Payment failed") + p(
        `Hi ${name}, we couldn't charge your payment method for Verxa Pro.`,
      ) + (vars.note ? box(vars.note) : "") + btn(
        "https://verxa.de/account/subscription",
        "Update payment method",
      );
      break;
    case "ticket_created":
      subject = `We received your message${vars.subject ? `: ${vars.subject}` : ""}`;
      inner = h2("Ticket received") + p(
        `Hi ${name}, thanks for reaching out — our team will reply as soon as possible.`,
      ) + (vars.message ? box(vars.message) : "") + p("This is a confirmation; replies will come from support@verxa.de.");
      break;
    case "ticket_replied":
      subject = `Re: ${vars.subject || "Your support ticket"}`;
      inner = h2("New reply from support") + p(
        `Hi ${name}, the Verxa team replied to your ticket:`,
      ) + (vars.message ? box(vars.message) : "") + btn(
        "https://verxa.de/support",
        "View conversation",
      );
      break;
    case "ceo_custom":
      subject = vars.subject || "A note from the Verxa CEO";
      inner = h2(vars.action || "A personal note") + p(
        `Hi ${name},` + (vars.message ? "" : ","),
      ) + (vars.message ? box(vars.message) : "") + p(
        `— ${vars.action || "CEO, Verxa AI"}`,
      );
      break;
  }

  return { subject, html: layout(inner, subject) };
}

// ---------- Gmail SMTP provider (guaranteed fallback) ----------
async function gmailSend(
  from: string,
  to: string,
  subject: string,
  html: string,
): Promise<SendResult | null> {
  const user = process.env.GMAIL_SMTP_USER;
  const pass = process.env.GMAIL_SMTP_APP_PASSWORD;
  if (!user || !pass) return null; // not configured
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    });
    const info = await transporter.sendMail({
      from: `${from.replace(/<.*>/, "").trim() || "Verxa"} <${user}>`,
      to,
      subject,
      html,
      replyTo: from.includes("@") ? (from.match(/[\w.+-]+@[\w.-]+/)?.[0] ?? undefined) : undefined,
    });
    return { ok: true, id: info.messageId };
  } catch (error) {
    return { ok: false, error: `Gmail SMTP: ${(error as Error).message}` };
  }
}

// ---------- InboxMail (useinbox.email) provider ----------
let aliasCache: { ids: Map<string, string>; at: number } | null = null;

async function inboxMailAliases(key: string): Promise<Map<string, string>> {
  if (aliasCache && Date.now() - aliasCache.at < 600000) return aliasCache.ids;
  const res = await fetch("https://api.useinbox.email/api/v1/aliases", {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(12000),
  });
  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: { aliases?: { prefix: string; id: string; status: string }[] };
  } | null;
  const ids = new Map<string, string>();
  for (const a of json?.data?.aliases ?? []) {
    if (a.status === "ACTIVE") ids.set(a.prefix.toLowerCase(), a.id);
  }
  aliasCache = { ids, at: Date.now() };
  return ids;
}

async function inboxMailSend(
  from: string,
  to: string,
  subject: string,
  html: string,
): Promise<SendResult | null> {
  const key = process.env.INBOX_API_KEY;
  if (!key) return null; // provider not configured
  try {
    // "CEO Verxa <ceo@verxa.de>" -> "ceo" ; "ceo@verxa.de" -> "ceo"
    const emailMatch = from.match(/[\w.+-]+@[\w.-]+/);
    const local = emailMatch?.[0]?.split("@")[0]?.toLowerCase() ?? "";
    const aliases = await inboxMailAliases(key);
    const aliasId = aliases.get(local);
    if (!aliasId) {
      return {
        ok: false,
        error: `InboxMail: no active alias for "${from}" (create it in the InboxMail dashboard)`,
      };
    }
    const res = await fetch("https://api.useinbox.email/api/v1/emails/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from_alias_id: aliasId,
        to: [to],
        subject,
        html,
      }),
      signal: AbortSignal.timeout(20000),
    });
    const json = (await res.json().catch(() => null)) as {
      success?: boolean;
      data?: { id?: string };
      error?: { code?: string; message?: string };
    } | null;
    if (res.ok && json?.success) {
      return { ok: true, id: json.data?.id };
    }
    return {
      ok: false,
      error: `InboxMail ${json?.error?.code ?? res.status}: ${json?.error?.message ?? "unknown"}`,
    };
  } catch (error) {
    return { ok: false, error: `InboxMail request failed: ${(error as Error).message}` };
  }
}

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return null;
  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type SendResult = { ok: boolean; id?: string; error?: string };

/** Renders, sends via the configured provider, and logs the result. */
export async function sendEmail(opts: {
  template: EmailTemplate;
  to: string;
  vars?: TemplateVars;
  fromOverride?: string;
}): Promise<SendResult> {
  const db = serviceSupabase();
  const { subject, html } = renderEmail(opts.template, opts.vars);
  const from =
    opts.fromOverride ??
    (opts.template === "ceo_custom" ? "CEO Verxa <ceo@verxa.de>" : FROM[opts.template]);

  let result: SendResult = { ok: false, error: "No email provider configured" };
  let provider = "none";

  // Primary: InboxMail (own domain sending via useinbox.email aliases).
  const inbox = await inboxMailSend(from, opts.to, subject, html);
  if (inbox) {
    provider = "inboxmail";
    result = inbox;
  }

  // Fallback: Resend via the centralized email service (single call site).
  const inboxError = inbox?.error;
  const resendKey = process.env.RESEND_API_KEY;
  if (!result.ok && resendKey) {
    provider = "resend";
    const resendResult = await sendRawEmail({ from, to: opts.to, subject, html });
    if (resendResult.ok) {
      result = { ok: true, id: resendResult.id };
    } else {
      result = { ok: false, error: resendResult.error ?? "Resend failed" };
    }
  }

  if (!result.ok && inboxError && provider === "resend") {
    result = { ...result, error: `InboxMail failed | ${result.error}` };
  }

  // Last resort: Gmail SMTP (works reliably; From is rewritten to the Gmail
  // account, original address stays as Reply-To).
  if (!result.ok) {
    const gmail = await gmailSend(from, opts.to, subject, html);
    if (gmail) {
      provider = gmail.ok ? "gmail" : `${provider}+gmail`;
      result = gmail;
    } else {
      result = {
        ...result,
        error: `${result.error} | Gmail SMTP not configured — set GMAIL_SMTP_APP_PASSWORD (Google App Password) in .env.local for guaranteed delivery`,
      };
    }
  }

  if (db) {
    await db.from("verxa_email_logs").insert({
      to_email: opts.to,
      from_email: from,
      subject,
      template: opts.template,
      status: result.ok ? "sent" : "failed",
      provider_id: result.id ? `${provider}:${result.id}` : provider,
      error: result.error ?? null,
      payload: opts.vars ?? {},
    });
  }

  return result;
}
