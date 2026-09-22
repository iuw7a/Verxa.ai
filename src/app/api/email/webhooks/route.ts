import { NextRequest, NextResponse } from "next/server";
import {
  handleWebhookEvent,
  isWebhookConfigured,
  verifySvixSignature,
  type ResendWebhookEvent,
} from "@/lib/email/webhooks";

export const runtime = "nodejs";

/**
 * POST /api/email/webhooks — Resend delivery events (Svix-signed).
 * Configure in the Resend dashboard with the webhook secret stored as
 * RESEND_WEBHOOK_SECRET. Unverified requests are rejected.
 */
export async function POST(req: NextRequest) {
  if (!isWebhookConfigured()) {
    return NextResponse.json(
      {
        error:
          "Webhook secret not configured. Set RESEND_WEBHOOK_SECRET (from the Resend dashboard) to enable delivery tracking.",
      },
      { status: 503 },
    );
  }

  const payload = await req.text();
  const verified = verifySvixSignature({
    payload,
    svixId: req.headers.get("svix-id"),
    svixTimestamp: req.headers.get("svix-timestamp"),
    svixSignature: req.headers.get("svix-signature"),
  });
  if (!verified) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: ResendWebhookEvent;
  try {
    event = JSON.parse(payload) as ResendWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const result = await handleWebhookEvent(event);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
