import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import {
  DESKTOP_SESSION_TTL_MS,
  newSessionToken,
  sha256Hex,
} from "@/lib/desktop";

export const runtime = "nodejs";

type AuthRow = {
  id: string;
  code_hash: string;
  device_id: string;
  device_secret_hash: string;
  device_name: string | null;
  os: string | null;
  app_version: string | null;
  status: string;
  approved_user_id: string | null;
  expires_at: string;
};

/**
 * POST /api/desktop/auth/poll — desktop polls with its secrets.
 * On approval: mints a long-lived session token (returned ONCE) and
 * creates/updates the device session row.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    session_id?: string;
    device_id?: string;
    device_secret?: string;
  } | null;
  const sessionId = body?.session_id ?? "";
  const deviceId = body?.device_id ?? "";
  const deviceSecret = body?.device_secret ?? "";
  if (!sessionId || !deviceId || !deviceSecret) {
    return NextResponse.json({ error: "Missing credentials." }, { status: 400 });
  }

  const admin = createAdminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "Service not configured." }, { status: 500 });
  }
  const { data } = await admin
    .from("verxa_desktop_auth")
    .select(
      "id,code_hash,device_id,device_secret_hash,device_name,os,app_version,status,approved_user_id,expires_at",
    )
    .eq("session_id", sessionId)
    .maybeSingle();
  if (!data) {
    // Generic answer — no session enumeration.
    return NextResponse.json({ status: "pending" });
  }
  const row = data as AuthRow;

  // Verify device binding (constant-shape comparison, no secret leakage).
  if (
    row.device_id !== deviceId ||
    row.device_secret_hash !== sha256Hex(deviceSecret)
  ) {
    return NextResponse.json({ status: "pending" });
  }
  if (new Date(row.expires_at).getTime() < Date.now() && row.status === "pending") {
    await admin
      .from("verxa_desktop_auth")
      .update({ status: "expired" })
      .eq("id", row.id);
    return NextResponse.json({ status: "expired" });
  }
  if (row.status !== "approved" || !row.approved_user_id) {
    return NextResponse.json({ status: row.status });
  }

  // Approved — mint the session token exactly once.
  const { token, hash } = newSessionToken();
  const now = new Date().toISOString();
  const { error: upsertError } = await admin
    .from("verxa_desktop_sessions")
    .upsert(
      {
        user_id: row.approved_user_id,
        device_id: row.device_id,
        device_name: row.device_name,
        os: row.os,
        app_version: row.app_version,
        token_hash: hash,
        status: "active",
        first_seen: now,
        last_seen: now,
        revoked_at: null,
      },
      { onConflict: "user_id,device_id" },
    );
  if (upsertError) {
    return NextResponse.json({ error: "Could not create session." }, { status: 500 });
  }
  await admin
    .from("verxa_desktop_auth")
    .update({ status: "consumed" })
    .eq("id", row.id);

  // Session metadata for the desktop (no secrets besides the one token).
  const { data: userData } = await admin.auth.admin.getUserById(
    row.approved_user_id,
  );

  return NextResponse.json({
    status: "approved",
    session_token: token,
    expires_in: DESKTOP_SESSION_TTL_MS / 1000,
    user: {
      id: row.approved_user_id,
      email: userData?.user?.email ?? null,
      name:
        (userData?.user?.user_metadata?.full_name as string | undefined) ??
        null,
    },
  });
}
