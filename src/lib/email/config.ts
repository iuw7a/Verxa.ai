/**
 * Central email configuration (SERVER-ONLY).
 *
 * Never import this module from client components — it reads secrets from
 * server-side environment variables. `RESEND_API_KEY` must never reach the
 * browser, client JS, or any `NEXT_PUBLIC_*` variable.
 */

export const EMAIL_DOMAIN =
  process.env.RESEND_FROM_DOMAIN?.trim() || "verxa.de";

export const APP_URL = (
  process.env.SITE_URL?.trim() || "https://verxa.de"
).replace(/\/+$/, "");

export type SenderKey =
  | "hello"
  | "support"
  | "security"
  | "accounts"
  | "billing"
  | "notifications"
  | "updates"
  | "team"
  | "noreply"
  | "ceo";

export type SenderIdentity = { name: string; email: string };

/**
 * All sender identities live on the verified Resend domain (`verxa.de`,
 * verified in the Resend dashboard). Add new aliases here only after the
 * mailbox/alias actually exists for the domain.
 */
export const EMAIL_SENDERS: Record<SenderKey, SenderIdentity> = {
  hello: { name: "Verxa", email: `hello@${EMAIL_DOMAIN}` },
  support: { name: "Verxa Support", email: `support@${EMAIL_DOMAIN}` },
  security: { name: "Verxa Security", email: `security@${EMAIL_DOMAIN}` },
  accounts: { name: "Verxa Accounts", email: `accounts@${EMAIL_DOMAIN}` },
  billing: { name: "Verxa Billing", email: `billing@${EMAIL_DOMAIN}` },
  notifications: {
    name: "Verxa",
    email: `notifications@${EMAIL_DOMAIN}`,
  },
  updates: { name: "Verxa Updates", email: `updates@${EMAIL_DOMAIN}` },
  team: { name: "Verxa Team", email: `team@${EMAIL_DOMAIN}` },
  noreply: { name: "Verxa", email: `no-reply@${EMAIL_DOMAIN}` },
  ceo: { name: "CEO, Verxa", email: `ceo@${EMAIL_DOMAIN}` },
};

export function senderAddress(key: SenderKey): string {
  const s = EMAIL_SENDERS[key];
  return `${s.name} <${s.email}>`;
}

export function senderEmail(key: SenderKey): string {
  return EMAIL_SENDERS[key].email;
}

export const DEFAULT_REPLY_TO =
  process.env.RESEND_REPLY_TO?.trim() || senderEmail("support");

export const DEFAULT_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL?.trim() || senderEmail("notifications");

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/** Safe for admin UI / health checks — never contains secrets. */
export function emailConfigStatus() {
  return {
    resendKeyConfigured: isResendConfigured(),
    webhookSecretConfigured: Boolean(
      process.env.RESEND_WEBHOOK_SECRET?.trim(),
    ),
    domain: EMAIL_DOMAIN,
    replyTo: DEFAULT_REPLY_TO,
    defaultFrom: DEFAULT_FROM_EMAIL,
    senders: (Object.keys(EMAIL_SENDERS) as SenderKey[]).map((key) => ({
      key,
      ...EMAIL_SENDERS[key],
    })),
    appUrl: APP_URL,
  };
}

/** Throws when called in the browser — secrets must stay server-side. */
export function assertServerOnly(scope: string) {
  if (typeof window !== "undefined") {
    throw new Error(
      `[email] ${scope} is server-only and must never run in the browser.`,
    );
  }
}
