import { NextRequest, NextResponse } from "next/server";
import { verifyUnsubscribe } from "@/lib/email/tokens";
import {
  getPreferences,
  getPreferencesByEmail,
  unsubscribeEmail,
} from "@/lib/email/preferences";

export const runtime = "nodejs";

function mask(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const head = local.slice(0, 2);
  return `${head}***@${domain}`;
}

/**
 * GET /api/email/unsubscribe?token=… — resolve the token (no login needed).
 * Returns the masked address so the page can show a confirmation screen.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const verified = verifyUnsubscribe(token);
  if (!verified) {
    return NextResponse.json(
      { ok: false, error: "This unsubscribe link is invalid or expired." },
      { status: 400 },
    );
  }
  const prefs =
    (verified.userId ? await getPreferences(verified.userId) : null) ??
    (await getPreferencesByEmail(verified.email));
  return NextResponse.json({
    ok: true,
    email: mask(verified.email),
    alreadyUnsubscribed: prefs ? prefs.marketing_consent === false : false,
  });
}

/** POST /api/email/unsubscribe — confirm opt-out (no login needed). */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    token?: string;
  } | null;
  const verified = verifyUnsubscribe(body?.token ?? "");
  if (!verified) {
    return NextResponse.json(
      { ok: false, error: "This unsubscribe link is invalid or expired." },
      { status: 400 },
    );
  }
  const done = await unsubscribeEmail(verified.email, verified.userId);
  if (!done) {
    return NextResponse.json(
      { ok: false, error: "Could not save right now. Please try again." },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, email: mask(verified.email) });
}
