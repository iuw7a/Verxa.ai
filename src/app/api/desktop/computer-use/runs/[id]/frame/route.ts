import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import { resolveDesktopUser } from "@/lib/desktop";
import { loadOwnedRun } from "@/lib/computer-use-runs";

export const runtime = "nodejs";

const MAX_FRAME_CHARS = 2_000_000; // ~1.5 MB binary data URL

/**
 * GET /api/desktop/computer-use/runs/[id]/frame — the latest screen preview
 * ("View Screen" on the web console). The big frame column is only read
 * here, never on the regular run polls.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await resolveDesktopUser(req);
  if (!ctx) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const admin = createAdminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "Service not configured." }, { status: 500 });
  }
  const run = await loadOwnedRun(admin, ctx.userId, id);
  if (!run) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }
  const { data } = await admin
    .from("verxa_computer_runs")
    .select("last_frame,last_frame_at,frame_requested_at")
    .eq("id", id)
    .maybeSingle();
  const row = (data ?? {}) as {
    last_frame?: string | null;
    last_frame_at?: string | null;
    frame_requested_at?: string | null;
  };
  return NextResponse.json({
    frame: row.last_frame ?? null,
    at: row.last_frame_at ?? null,
    pending: Boolean(row.frame_requested_at),
  });
}

/**
 * POST /api/desktop/computer-use/runs/[id]/frame — the executing device
 * uploads a captured frame (desktop sessions only). Clears the pending
 * capture request so the console stops asking.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await resolveDesktopUser(req);
  if (!ctx || ctx.via !== "desktop") {
    return NextResponse.json({ error: "Desktop session required." }, { status: 403 });
  }
  const admin = createAdminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "Service not configured." }, { status: 500 });
  }
  const run = await loadOwnedRun(admin, ctx.userId, id);
  if (!run) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }
  const body = (await req.json().catch(() => null)) as { frame?: string } | null;
  const frame = typeof body?.frame === "string" ? body.frame : "";
  if (!frame.startsWith("data:image/") || frame.length > MAX_FRAME_CHARS) {
    return NextResponse.json({ error: "frame must be a data URL." }, { status: 400 });
  }
  const now = new Date().toISOString();
  const { error } = await admin
    .from("verxa_computer_runs")
    .update({
      last_frame: frame,
      last_frame_at: now,
      frame_requested_at: null,
      updated_at: now,
    })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Could not store the frame." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, at: now });
}
