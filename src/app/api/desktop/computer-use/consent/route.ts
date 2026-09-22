import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import { resolveDesktopUser } from "@/lib/desktop";

export const runtime = "nodejs";

const DEFAULTS = {
  enabled: false,
  safe_mode: true,
  screen_access: true,
  mouse_control: true,
  keyboard_control: true,
  app_control: true,
  allowed_displays: "all",
};

/** GET /api/desktop/computer-use/consent — own consent record (default off). */
export async function GET(req: NextRequest) {
  const ctx = await resolveDesktopUser(req);
  if (!ctx) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const admin = createAdminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "Service not configured." }, { status: 500 });
  }
  const { data } = await admin
    .from("verxa_desktop_computer_use")
    .select("*")
    .eq("user_id", ctx.userId)
    .maybeSingle();
  return NextResponse.json({ consent: data ?? { user_id: ctx.userId, ...DEFAULTS } });
}

/**
 * POST /api/desktop/computer-use/consent — enable/disable + granular toggles.
 * Enabling records granted_at; disabling records revoked_at. Server is the
 * authority: the step endpoint refuses reasoning while enabled=false.
 */
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
    enabled?: boolean;
    safe_mode?: boolean;
    screen_access?: boolean;
    mouse_control?: boolean;
    keyboard_control?: boolean;
    app_control?: boolean;
    allowed_displays?: string;
  } | null;
  if (!body || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled (boolean) required." }, { status: 400 });
  }
  const now = new Date().toISOString();
  const bool = (v: unknown, fallback: boolean) =>
    typeof v === "boolean" ? v : fallback;
  const allowedDisplays = typeof body.allowed_displays === "string"
    && (body.allowed_displays === "all" || body.allowed_displays === "primary" || /^-?\d{1,20}$/.test(body.allowed_displays))
    ? body.allowed_displays
    : "all";
  const patch: Record<string, unknown> = {
    enabled: body.enabled,
    safe_mode: bool(body.safe_mode, true),
    screen_access: bool(body.screen_access, true),
    mouse_control: bool(body.mouse_control, true),
    keyboard_control: bool(body.keyboard_control, true),
    app_control: bool(body.app_control, true),
    allowed_displays: allowedDisplays,
    updated_at: now,
  };
  if (body.enabled) {
    patch.granted_at = now;
    patch.revoked_at = null;
  } else {
    patch.revoked_at = now;
  }
  const { data, error } = await admin
    .from("verxa_desktop_computer_use")
    .upsert({ user_id: ctx.userId, ...patch }, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ error: "Save failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, consent: data });
}
