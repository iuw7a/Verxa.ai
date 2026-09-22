import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";

export const runtime = "nodejs";

/**
 * GET /api/desktop/auth/session?session=… — public pairing info for the
 * browser page AND the desktop (device name, code, expiry, status).
 * The session id is a 256-bit secret; only its holder can read this.
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session") ?? "";
  if (!sessionId || sessionId.length > 200) {
    return NextResponse.json({ error: "Missing session." }, { status: 400 });
  }
  const admin = createAdminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "Service not configured." }, { status: 500 });
  }
  const { data } = await admin
    .from("verxa_desktop_auth")
    .select("user_code,device_name,os,app_version,status,expires_at,created_at")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (!data) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }
  const row = data as {
    user_code: string;
    device_name: string | null;
    os: string | null;
    app_version: string | null;
    status: string;
    expires_at: string;
  };
  const expired = new Date(row.expires_at).getTime() < Date.now();
  return NextResponse.json({
    device_name: row.device_name,
    os: row.os,
    app_version: row.app_version,
    user_code: row.user_code,
    status: expired && row.status === "pending" ? "expired" : row.status,
    expires_at: row.expires_at,
  });
}
