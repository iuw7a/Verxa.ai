import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import { resolveDesktopUser } from "@/lib/desktop";
import { checkRateLimit } from "@/lib/email/rate-limit";

export const runtime = "nodejs";

/** POST /api/desktop/error — aggregated technical diagnostics (no PII). */
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
    kind?: string;
    message?: string;
    stack?: string;
    app_version?: string;
    os?: string;
  } | null;
  const kinds = new Set([
    "startup",
    "auth",
    "api",
    "update",
    "crash",
    "network",
    "renderer",
  ]);
  const kind = body?.kind ?? "";
  if (!kinds.has(kind)) {
    return NextResponse.json({ error: "Unknown error kind." }, { status: 400 });
  }
  const rl = await checkRateLimit(`desktop-err:${ctx.userId}`, 30, 3600 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const scrub = (s: string) =>
    s
      .replace(/[A-Za-z0-9-_]{20,}/g, "[redacted]")
      .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
      .slice(0, 2000);
  const { error } = await admin.from("verxa_desktop_events").insert({
    user_id: ctx.userId,
    device_id: ctx.session?.device_id ?? null,
    event: "error",
    app_version: (body?.app_version ?? "").slice(0, 20) || null,
    os: (body?.os ?? "").slice(0, 40) || null,
    detail: {
      kind,
      message: scrub((body?.message ?? "").slice(0, 500)),
      stack: scrub((body?.stack ?? "").slice(0, 1500)),
    },
  });
  if (error) {
    return NextResponse.json({ error: "Ingest failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
