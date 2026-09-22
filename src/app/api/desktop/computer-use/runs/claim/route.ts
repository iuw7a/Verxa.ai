import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import { resolveDesktopUser } from "@/lib/desktop";
import { insertRunEvent, loadConsentEnabled } from "@/lib/computer-use-runs";

export const runtime = "nodejs";

/**
 * POST /api/desktop/computer-use/runs/claim — a paired device (the Verxa
 * connector) claims the oldest queued run for its user. Desktop sessions
 * only: browsers never claim runs. Returns `{ run: null }` when there is
 * nothing to do (also on claim races).
 */
export async function POST(req: NextRequest) {
  const ctx = await resolveDesktopUser(req);
  if (!ctx || ctx.via !== "desktop" || !ctx.session) {
    return NextResponse.json({ error: "Desktop session required." }, { status: 403 });
  }
  const admin = createAdminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "Service not configured." }, { status: 500 });
  }
  if (!(await loadConsentEnabled(admin, ctx.userId))) {
    // 403 tells the connector to back off and re-check consent later.
    return NextResponse.json(
      { error: "Computer Use is not enabled for this account." },
      { status: 403 },
    );
  }

  const { data: queued } = await admin
    .from("verxa_computer_runs")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!queued) {
    return NextResponse.json({ run: null });
  }

  // Guarded transition — exactly one device can win the claim.
  const now = new Date().toISOString();
  const { data: run } = await admin
    .from("verxa_computer_runs")
    .update({
      status: "running",
      device_id: ctx.session.device_id,
      claimed_at: now,
      updated_at: now,
    })
    .eq("id", (queued as { id: string }).id)
    .eq("status", "queued")
    .select("id,goal,status,device_id")
    .maybeSingle();
  if (!run) {
    return NextResponse.json({ run: null });
  }
  await insertRunEvent(
    admin,
    (run as { id: string }).id,
    "step",
    `Picked up by ${ctx.session.device_name ?? "your computer"}`,
  );
  return NextResponse.json({ run });
}
