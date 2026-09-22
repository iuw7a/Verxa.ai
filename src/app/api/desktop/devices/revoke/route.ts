import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import { resolveDesktopUser } from "@/lib/desktop";

export const runtime = "nodejs";

/** POST /api/desktop/devices/revoke — sign out one device (or all). */
export async function POST(req: NextRequest) {
  const ctx = await resolveDesktopUser(req);
  if (!ctx) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const admin = createAdminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "Service not configured." }, { status: 500 });
  }
  const body = (await req.json().catch(() => null)) as {
    device_id?: string;
    all?: boolean;
  } | null;

  const now = new Date().toISOString();
  if (body?.all) {
    const { error } = await admin
      .from("verxa_desktop_sessions")
      .update({ status: "revoked", revoked_at: now })
      .eq("user_id", ctx.userId)
      .eq("status", "active");
    if (error) {
      return NextResponse.json({ error: "Revoke failed." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, revoked: "all" });
  }

  const deviceId = body?.device_id ?? "";
  if (!deviceId || deviceId.length > 200) {
    return NextResponse.json({ error: "device_id required." }, { status: 400 });
  }
  // Users cannot revoke the session they are calling with via "all=false"
  // ambiguity — but single revoke of self is allowed (that's sign-out).
  const { error } = await admin
    .from("verxa_desktop_sessions")
    .update({ status: "revoked", revoked_at: now })
    .eq("user_id", ctx.userId)
    .eq("device_id", deviceId)
    .eq("status", "active");
  if (error) {
    return NextResponse.json({ error: "Revoke failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, revoked: deviceId });
}
