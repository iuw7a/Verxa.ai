import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import { emitEmailEvent } from "@/lib/email/events";
import { consumeEmailToken } from "@/lib/email/tokens";

export const runtime = "nodejs";

/** POST /api/email/password/confirm — consume token + set new password. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    token?: string;
    password?: string;
  } | null;
  const token = body?.token?.trim() ?? "";
  const password = body?.password ?? "";

  if (!token || token.length > 200) {
    return NextResponse.json({ ok: false, code: "invalid" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 6 || password.length > 128) {
    return NextResponse.json(
      { ok: false, code: "weak_password" },
      { status: 400 },
    );
  }

  const consumed = await consumeEmailToken("reset_password", token);
  if (!consumed.ok) {
    return NextResponse.json(
      { ok: false, code: consumed.code },
      { status: 400 },
    );
  }
  if (!consumed.token.userId) {
    return NextResponse.json({ ok: false, code: "invalid" }, { status: 400 });
  }

  const admin = createAdminSupabase();
  if (!admin) {
    return NextResponse.json({ ok: false, code: "server" }, { status: 500 });
  }

  try {
    const { error } = await admin.auth.admin.updateUserById(
      consumed.token.userId,
      { password },
    );
    if (error) {
      return NextResponse.json(
        { ok: false, code: "server", detail: "Password update failed." },
        { status: 500 },
      );
    }
  } catch {
    return NextResponse.json({ ok: false, code: "server" }, { status: 500 });
  }

  void emitEmailEvent("PASSWORD_CHANGED", {
    to: consumed.token.email,
    userId: consumed.token.userId,
    vars: {
      email: consumed.token.email,
      timestamp: new Date().toISOString(),
    },
  });

  return NextResponse.json({ ok: true });
}
