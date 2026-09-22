import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import {
  DESKTOP_AUTH_TTL_MS,
  clientIp,
  newSecretId,
  newUserCode,
  sha256Hex,
} from "@/lib/desktop";
import { checkRateLimit } from "@/lib/email/rate-limit";

export const runtime = "nodejs";

const APP_URL = (process.env.SITE_URL?.trim() || "https://verxa.de").replace(
  /\/+$/,
  "",
);

/**
 * POST /api/desktop/auth/start — begin a browser-based device login.
 * Body: { device_name?, os?, app_version? }. No auth (the desktop is new).
 * Returns a secret session id + user code; the user approves in the browser.
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req) ?? "unknown";
  const rl = await checkRateLimit(`desktop-start:${ip}`, 20, 3600 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as {
    device_name?: string;
    os?: string;
    app_version?: string;
  } | null;

  const admin = createAdminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "Service not configured." }, { status: 500 });
  }

  const sessionId = newSecretId();
  const deviceId = newSecretId(16);
  const deviceSecret = newSecretId();
  const userCode = newUserCode();

  const { error } = await admin.from("verxa_desktop_auth").insert({
    session_id: sessionId,
    code_hash: sha256Hex(userCode),
    user_code: userCode,
    device_id: deviceId,
    device_secret_hash: sha256Hex(deviceSecret),
    device_name: (body?.device_name ?? "").slice(0, 80) || "Verxa Desktop",
    os: (body?.os ?? "").slice(0, 40) || null,
    app_version: (body?.app_version ?? "").slice(0, 20) || null,
    ip,
    status: "pending",
    expires_at: new Date(Date.now() + DESKTOP_AUTH_TTL_MS).toISOString(),
  });
  if (error) {
    return NextResponse.json({ error: "Could not start login." }, { status: 500 });
  }

  return NextResponse.json({
    session_id: sessionId,
    device_id: deviceId,
    device_secret: deviceSecret,
    user_code: userCode,
    browser_url: `${APP_URL}/desktop/login?session=${encodeURIComponent(sessionId)}`,
    expires_in: DESKTOP_AUTH_TTL_MS / 1000,
  });
}
