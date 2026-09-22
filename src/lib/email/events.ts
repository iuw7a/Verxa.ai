/**
 * Central email-event architecture:
 * event -> policy (template + sender + kind) -> variables -> Resend -> log.
 *
 * Product code emits events (never templates directly); this map decides
 * what gets sent. Marketing events are consent-gated by the service.
 */

import {
  sendMarketing,
  sendTransactional,
  type SendOutcome,
} from "./service";
import type { SenderKey } from "./config";
import type { TemplateVars } from "./templates/types";
import { getTemplate } from "./registry";

export type EmailEvent =
  | "USER_REGISTERED"
  | "EMAIL_VERIFIED"
  | "EMAIL_VERIFICATION_REQUESTED"
  | "EMAIL_VERIFICATION_REMINDER"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_NOTICE"
  | "PASSWORD_RESET_LINK_RESENT"
  | "PASSWORD_CHANGED"
  | "PASSWORD_RESET_EXPIRED"
  | "USER_LOGIN"
  | "NEW_DEVICE_LOGIN"
  | "SUSPICIOUS_LOGIN"
  | "EMAIL_CHANGED"
  | "EMAIL_CHANGE_CONFIRM"
  | "SECURITY_ALERT"
  | "ACCOUNT_RECOVERY"
  | "ACCOUNT_DELETED"
  | "ACCOUNT_DELETION_CANCELLED"
  | "PROFILE_UPDATED"
  | "USERNAME_CHANGED"
  | "SECURITY_SETTINGS_CHANGED"
  | "TWO_FACTOR_ENABLED"
  | "TWO_FACTOR_DISABLED"
  | "NEW_DEVICE_DETECTED"
  | "NEW_SESSION"
  | "SESSION_REVOKED"
  | "API_KEY_CREATED"
  | "API_KEY_REVOKED"
  | "API_KEY_EXPIRING"
  | "API_USAGE_WARNING"
  | "WELCOME_TO_VERXA"
  | "FIRST_CHAT_STARTED"
  | "PROJECT_CREATED"
  | "PROJECT_SHARED"
  | "PROJECT_INVITATION"
  | "PLUGIN_CONNECTED"
  | "PLUGIN_DISCONNECTED"
  | "INTEGRATION_CONNECTED"
  | "INTEGRATION_DISCONNECTED"
  | "IMPORTANT_PRODUCT_NOTICE"
  | "SYSTEM_NOTIFICATION"
  | "MAINTENANCE_NOTICE"
  | "STATUS_NOTICE"
  | "SUBSCRIPTION_STARTED"
  | "SUBSCRIPTION_UPGRADED"
  | "SUBSCRIPTION_DOWNGRADED"
  | "SUBSCRIPTION_CANCELLED"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "PAYMENT_METHOD_UPDATED"
  | "INVOICE_CREATED"
  | "INVOICE_REMINDER"
  | "USAGE_WARNING"
  | "USAGE_LIMIT_REACHED"
  | "RENEWAL_REMINDER"
  | "TRIAL_STARTED"
  | "TRIAL_ENDING"
  | "TRIAL_ENDED"
  | "FEATURE_ANNOUNCEMENT"
  | "NEW_FEATURE_AVAILABLE"
  | "MARKETING_CAMPAIGN"
  | "NEWSLETTER"
  | "REENGAGEMENT"
  | "POLICY_UPDATE"
  | "SUPPORT_TICKET_CREATED"
  | "SUPPORT_TICKET_REPLY"
  | "SUPPORT_TICKET_CLOSED"
  | "CONTACT_RECEIVED"
  | "FEEDBACK_RECEIVED"
  | "FEEDBACK_RESPONSE";

type Policy = { templateId: string; sender?: SenderKey };

export const EVENT_POLICY: Record<EmailEvent, Policy> = {
  USER_REGISTERED: { templateId: "auth-welcome", sender: "hello" },
  EMAIL_VERIFIED: { templateId: "product-welcome", sender: "hello" },
  EMAIL_VERIFICATION_REQUESTED: { templateId: "auth-verify", sender: "accounts" },
  EMAIL_VERIFICATION_REMINDER: { templateId: "auth-verify-reminder", sender: "accounts" },
  PASSWORD_RESET_REQUESTED: { templateId: "auth-password-reset-request", sender: "security" },
  PASSWORD_RESET_NOTICE: { templateId: "auth-password-reset-notice", sender: "security" },
  PASSWORD_RESET_LINK_RESENT: { templateId: "auth-password-reset-link", sender: "security" },
  PASSWORD_CHANGED: { templateId: "auth-password-changed", sender: "security" },
  PASSWORD_RESET_EXPIRED: { templateId: "auth-password-reset-expired", sender: "security" },
  USER_LOGIN: { templateId: "auth-login-activity", sender: "security" },
  NEW_DEVICE_LOGIN: { templateId: "auth-new-login", sender: "security" },
  SUSPICIOUS_LOGIN: { templateId: "auth-suspicious-login", sender: "security" },
  EMAIL_CHANGED: { templateId: "auth-email-changed", sender: "security" },
  EMAIL_CHANGE_CONFIRM: { templateId: "auth-email-change-confirm", sender: "accounts" },
  SECURITY_ALERT: { templateId: "auth-security-alert", sender: "security" },
  ACCOUNT_RECOVERY: { templateId: "auth-account-recovery", sender: "accounts" },
  ACCOUNT_DELETED: { templateId: "auth-account-deleted", sender: "accounts" },
  ACCOUNT_DELETION_CANCELLED: { templateId: "auth-account-deletion-cancelled", sender: "accounts" },
  PROFILE_UPDATED: { templateId: "account-profile-updated", sender: "accounts" },
  USERNAME_CHANGED: { templateId: "account-username-changed", sender: "accounts" },
  SECURITY_SETTINGS_CHANGED: { templateId: "account-security-settings-changed", sender: "security" },
  TWO_FACTOR_ENABLED: { templateId: "account-2fa-enabled", sender: "security" },
  TWO_FACTOR_DISABLED: { templateId: "account-2fa-disabled", sender: "security" },
  NEW_DEVICE_DETECTED: { templateId: "account-new-device", sender: "security" },
  NEW_SESSION: { templateId: "account-new-session", sender: "security" },
  SESSION_REVOKED: { templateId: "account-session-revoked", sender: "security" },
  API_KEY_CREATED: { templateId: "account-api-key-created", sender: "security" },
  API_KEY_REVOKED: { templateId: "account-api-key-revoked", sender: "security" },
  API_KEY_EXPIRING: { templateId: "account-api-key-expiring", sender: "notifications" },
  API_USAGE_WARNING: { templateId: "account-api-usage-warning", sender: "notifications" },
  WELCOME_TO_VERXA: { templateId: "product-welcome", sender: "hello" },
  FIRST_CHAT_STARTED: { templateId: "product-first-chat", sender: "hello" },
  PROJECT_CREATED: { templateId: "product-project-created", sender: "notifications" },
  PROJECT_SHARED: { templateId: "product-project-shared", sender: "notifications" },
  PROJECT_INVITATION: { templateId: "product-project-invitation", sender: "notifications" },
  PLUGIN_CONNECTED: { templateId: "product-plugin-connected", sender: "notifications" },
  PLUGIN_DISCONNECTED: { templateId: "product-plugin-disconnected", sender: "notifications" },
  INTEGRATION_CONNECTED: { templateId: "product-integration-connected", sender: "notifications" },
  INTEGRATION_DISCONNECTED: { templateId: "product-integration-disconnected", sender: "notifications" },
  IMPORTANT_PRODUCT_NOTICE: { templateId: "product-important-notice", sender: "notifications" },
  SYSTEM_NOTIFICATION: { templateId: "product-system-notification", sender: "notifications" },
  MAINTENANCE_NOTICE: { templateId: "product-maintenance", sender: "notifications" },
  STATUS_NOTICE: { templateId: "product-status", sender: "notifications" },
  SUBSCRIPTION_STARTED: { templateId: "billing-subscription-started", sender: "billing" },
  SUBSCRIPTION_UPGRADED: { templateId: "billing-subscription-upgraded", sender: "billing" },
  SUBSCRIPTION_DOWNGRADED: { templateId: "billing-subscription-downgraded", sender: "billing" },
  SUBSCRIPTION_CANCELLED: { templateId: "billing-subscription-cancelled", sender: "billing" },
  PAYMENT_SUCCESS: { templateId: "billing-payment-success", sender: "billing" },
  PAYMENT_FAILED: { templateId: "billing-payment-failed", sender: "billing" },
  PAYMENT_METHOD_UPDATED: { templateId: "billing-payment-method-updated", sender: "billing" },
  INVOICE_CREATED: { templateId: "billing-invoice-available", sender: "billing" },
  INVOICE_REMINDER: { templateId: "billing-invoice-reminder", sender: "billing" },
  USAGE_WARNING: { templateId: "billing-usage-warning", sender: "billing" },
  USAGE_LIMIT_REACHED: { templateId: "billing-usage-limit-reached", sender: "billing" },
  RENEWAL_REMINDER: { templateId: "billing-renewal-reminder", sender: "billing" },
  TRIAL_STARTED: { templateId: "billing-trial-started", sender: "billing" },
  TRIAL_ENDING: { templateId: "billing-trial-ending", sender: "billing" },
  TRIAL_ENDED: { templateId: "billing-trial-ended", sender: "billing" },
  FEATURE_ANNOUNCEMENT: { templateId: "product-feature-announcement", sender: "updates" },
  NEW_FEATURE_AVAILABLE: { templateId: "product-new-feature", sender: "updates" },
  MARKETING_CAMPAIGN: { templateId: "marketing-campaign", sender: "updates" },
  NEWSLETTER: { templateId: "marketing-newsletter", sender: "updates" },
  REENGAGEMENT: { templateId: "marketing-reengagement", sender: "hello" },
  POLICY_UPDATE: { templateId: "legal-service-policy", sender: "hello" },
  SUPPORT_TICKET_CREATED: { templateId: "support-ticket-created", sender: "support" },
  SUPPORT_TICKET_REPLY: { templateId: "support-ticket-reply", sender: "support" },
  SUPPORT_TICKET_CLOSED: { templateId: "support-ticket-closed", sender: "support" },
  CONTACT_RECEIVED: { templateId: "support-contact-received", sender: "support" },
  FEEDBACK_RECEIVED: { templateId: "support-feedback-received", sender: "support" },
  FEEDBACK_RESPONSE: { templateId: "support-feedback-response", sender: "support" },
};

export type EmitOpts = {
  to: string;
  vars?: TemplateVars;
  userId?: string | null;
  locale?: string | null;
  replyTo?: string;
  idempotencyKey?: string;
};

/**
 * Emit an email event. Fire-and-forget safe: resolves the policy, picks the
 * transactional/marketing sender automatically, and never throws.
 */
export async function emitEmailEvent(
  event: EmailEvent,
  opts: EmitOpts,
): Promise<SendOutcome> {
  try {
    const policy = EVENT_POLICY[event];
    if (!policy) return { ok: false, error: `No policy for event ${event}` };
    const def = getTemplate(policy.templateId);
    if (!def) return { ok: false, error: `Template missing: ${policy.templateId}` };
    const base = {
      templateId: policy.templateId,
      to: opts.to,
      vars: opts.vars,
      userId: opts.userId,
      locale: opts.locale,
      event,
      senderOverride: policy.sender,
      replyTo: opts.replyTo,
      idempotencyKey: opts.idempotencyKey,
    };
    if (def.kind === "marketing") return sendMarketing(base);
    return sendTransactional(base);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Event metadata for the admin UI (no secrets). */
export function eventMetadata() {
  return (Object.keys(EVENT_POLICY) as EmailEvent[]).map((event) => {
    const policy = EVENT_POLICY[event];
    const def = getTemplate(policy.templateId);
    return {
      event,
      templateId: policy.templateId,
      sender: policy.sender ?? def?.sender ?? null,
      kind: def?.kind ?? null,
      category: def?.category ?? null,
    };
  });
}
