import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import { emitEmailEvent } from "@/lib/email/events";
import { consumeEmailToken } from "@/lib/email/tokens";

export const runtime = "nodejs";

/** POST /api/email/verify/confirm — consume a verification token. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    token?: string;
  } | null;
  const token = body?.token?.trim() ?? "";
  if (!token || token.length > 200) {
    return NextResponse.json(
      { ok: false, code: "invalid" },
      { status: 400 },
    );
  }

  const consumed = await consumeEmailToken("verify_email", token);
  if (!consumed.ok) {
    return NextResponse.json(
      { ok: false, code: consumed.code },
      { status: 400 },
    );
  }

  // Mark the address confirmed in Supabase Auth (mirrors the native flow).
  const admin = createAdminSupabase();
  if (admin && consumed.token.userId) {
    try {
      await admin.auth.admin.updateUserById(consumed.token.userId, {
        email_confirm: true,
      });
    } catch {
      /* non-fatal: token is consumed, user can sign in and retry */
    }
  }

  void emitEmailEvent("EMAIL_VERIFIED", {
    to: consumed.token.email,
    userId: consumed.token.userId,
    vars: { email: consumed.token.email },
  });

  return NextResponse.json({ ok: true, email: consumed.token.email });
}
