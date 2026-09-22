import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import {
  DESKTOP_EVENT_ALLOWLIST,
  resolveDesktopUser,
  sanitizeDetail,
} from "@/lib/desktop";
import { checkRateLimit } from "@/lib/email/rate-limit";

export const runtime = "nodejs";

/** POST /api/desktop/events — privacy-safe usage analytics ingest. */
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
    event?: string;
    app_version?: string;
    os?: string;
    detail?: unknown;
  } | null;
  const event = body?.event ?? "";
  if (!DESKTOP_EVENT_ALLOWLIST.has(event)) {
    return NextResponse.json({ error: "Unknown event." }, { status: 400 });
  }
  const rl = await checkRateLimit(`desktop-ev:${ctx.userId}`, 500, 3600 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const { error } = await admin.from("verxa_desktop_events").insert({
    user_id: ctx.userId,
    device_id: ctx.session?.device_id ?? null,
    event,
    app_version: (body?.app_version ?? "").slice(0, 20) || null,
    os: (body?.os ?? "").slice(0, 40) || null,
    detail: sanitizeDetail(body?.detail),
  });
  if (error) {
    return NextResponse.json({ error: "Ingest failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
