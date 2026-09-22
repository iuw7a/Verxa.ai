/**
 * Resend webhook verification (Svix) + delivery-status handling.
 *
 * Resend signs webhooks with Svix: headers `svix-id`, `svix-timestamp`,
 * `svix-signature` (one or more `v1,<base64>` signatures). The secret comes
 * from `RESEND_WEBHOOK_SECRET` (server-only). Unverified requests are
 * rejected — never trust arbitrary webhook calls.
 */
import { createHmac, timingSafeEqual } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertServerOnly } from "./config";

export type ResendWebhookEvent = {
  type: string;
  created_at: string;
  data: {
    email_id?: string;
    to?: string[];
    from?: string;
    subject?: string;
    created_at?: string;
    [k: string]: unknown;
  };
};

function serviceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return null;
  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function webhookSecret(): Uint8Array | null {
  const raw = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!raw) return null;
  const b64 = raw.startsWith("whsec_") ? raw.slice("whsec_".length) : raw;
  try {
    return new Uint8Array(Buffer.from(b64, "base64"));
  } catch {
    return null;
  }
}

export function isWebhookConfigured(): boolean {
  return webhookSecret() !== null;
}

/** Verify a Svix-signed payload. Returns false for anything untrusted. */
export function verifySvixSignature(opts: {
  payload: string;
  svixId: string | null;
  svixTimestamp: string | null;
  svixSignature: string | null;
}): boolean {
  assertServerOnly("verifySvixSignature");
  const secret = webhookSecret();
  if (!secret || !opts.svixId || !opts.svixTimestamp || !opts.svixSignature)
    return false;
  // Reject stale requests (>5 min) to narrow the replay window.
  const ts = Number(opts.svixTimestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300)
    return false;
  const signedContent = `${opts.svixId}.${opts.svixTimestamp}.${opts.payload}`;
  const expected = createHmac("sha256", secret)
    .update(signedContent, "utf8")
    .digest("base64");
  const candidates = opts.svixSignature.split(" ");
  for (const c of candidates) {
    const [version, sig] = c.split(",");
    if (version !== "v1" || !sig) continue;
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) continue;
    try {
      if (timingSafeEqual(a, b)) return true;
    } catch {
      continue;
    }
  }
  return false;
}

const TERMINAL_COLUMN: Record<string, string> = {
  "email.delivered": "delivered_at",
  "email.delivery_delayed": "delivered_at",
  "email.bounced": "bounced_at",
  "email.complained": "complained_at",
  "email.opened": "opened_at",
  "email.clicked": "clicked_at",
};

/** Apply a verified webhook event to the delivery log. */
export async function handleWebhookEvent(
  event: ResendWebhookEvent,
): Promise<{ ok: boolean; error?: string }> {
  assertServerOnly("handleWebhookEvent");
  const db = serviceSupabase();
  if (!db) return { ok: false, error: "DB not configured." };
  const type = event.type ?? "";
  const emailId =
    typeof event.data?.email_id === "string" ? event.data.email_id : null;
  if (!emailId) return { ok: false, error: "Missing email_id." };
  const now = new Date().toISOString();

  try {
    if (type === "email.sent") {
      await db
        .from("verxa_email_logs")
        .update({ status: "sent", updated_at: now })
        .eq("resend_id", emailId)
        .eq("status", "queued");
      return { ok: true };
    }
    if (type === "email.failed") {
      await db
        .from("verxa_email_logs")
        .update({ status: "failed", error: "Resend reported failure.", updated_at: now })
        .eq("resend_id", emailId);
      return { ok: true };
    }
    const column = TERMINAL_COLUMN[type];
    if (!column) return { ok: true }; // unknown event: acknowledge, ignore
    const patch: Record<string, string> = { [column]: now, updated_at: now };
    if (type === "email.delivered" || type === "email.delivery_delayed")
      patch.status = "delivered";
    if (type === "email.bounced") patch.status = "bounced";
    if (type === "email.complained") patch.status = "complained";
    await db.from("verxa_email_logs").update(patch).eq("resend_id", emailId);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
