import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import { resolveDesktopUser } from "@/lib/desktop";
import { insertRunEvent, loadOwnedRun } from "@/lib/computer-use-runs";

export const runtime = "nodejs";

type ControlAction = "stop" | "pause" | "resume" | "capture";

/**
 * POST /api/desktop/computer-use/runs/[id]/control — stop / pause / resume /
 * capture a session. Works from the browser (cookies) and from the device
 * token; both are scoped to the run's owner. The executing device applies
 * the change on its next state poll. Stop is idempotent and expires pending
 * confirmations; capture asks the device for a fresh screenshot.
 */
export async function POST(
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
  const body = (await req.json().catch(() => null)) as {
    action?: ControlAction;
  } | null;
  const action = body?.action;
  if (
    action !== "stop" &&
    action !== "pause" &&
    action !== "resume" &&
    action !== "capture"
  ) {
    return NextResponse.json(
      { error: "action must be stop, pause, resume or capture." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const finished = run.status === "done" || run.status === "error" || run.status === "stopped";

  if (action === "capture") {
    if (finished) {
      return NextResponse.json(
        { error: "This session has ended." },
        { status: 409 },
      );
    }
    await admin
      .from("verxa_computer_runs")
      .update({ frame_requested_at: now, updated_at: now })
      .eq("id", id);
    return NextResponse.json({ ok: true, status: run.status, requested: true });
  }

  if (action === "stop") {
    if (!finished) {
      await admin
        .from("verxa_computer_runs")
        .update({ status: "stopped", finished_at: now, updated_at: now })
        .eq("id", id);
      await admin
        .from("verxa_computer_confirmations")
        .update({ status: "expired", decided_at: now })
        .eq("run_id", id)
        .eq("status", "pending");
      await insertRunEvent(admin, id, "stopped", "Stopped by you");
    }
    return NextResponse.json({ ok: true, status: "stopped" });
  }

  if (action === "pause") {
    if (run.status !== "running") {
      return NextResponse.json(
        { error: "Only a running session can be paused." },
        { status: 409 },
      );
    }
    await admin
      .from("verxa_computer_runs")
      .update({ status: "paused", updated_at: now })
      .eq("id", id);
    await insertRunEvent(admin, id, "paused", "Paused by you");
    return NextResponse.json({ ok: true, status: "paused" });
  }

  // resume
  if (run.status !== "paused") {
    return NextResponse.json(
      { error: "Only a paused session can be resumed." },
      { status: 409 },
    );
  }
  await admin
    .from("verxa_computer_runs")
    .update({ status: "running", updated_at: now })
    .eq("id", id);
  await insertRunEvent(admin, id, "resumed", "Resumed by you");
  return NextResponse.json({ ok: true, status: "running" });
}
