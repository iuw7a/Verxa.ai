import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import { resolveDesktopUser } from "@/lib/desktop";
import { RUN_EVENT_KINDS, loadOwnedRun } from "@/lib/computer-use-runs";

export const runtime = "nodejs";

type IncomingEvent = {
  kind?: string;
  label?: string;
  detail?: string;
  payload?: unknown;
};

/**
 * POST /api/desktop/computer-use/runs/[id]/events — the executing device
 * reports Computer Use activity (steps, actions, observations, terminal
 * states, confirmation requests). Desktop sessions only — the browser
 * never writes activity. Terminal statuses are never overwritten by late
 * events (a stopped run stays stopped).
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

  const body = (await req.json().catch(() => null)) as {
    events?: IncomingEvent[];
    step?: number;
  } | null;
  const incoming = (body?.events ?? []).slice(0, 30).filter(
    (e): e is IncomingEvent & { kind: string; label: string } =>
      typeof e?.kind === "string" &&
      RUN_EVENT_KINDS.has(e.kind) &&
      typeof e.label === "string" &&
      e.label.trim().length > 0,
  );
  if (!incoming.length) {
    return NextResponse.json({ error: "No valid events." }, { status: 400 });
  }

  const terminal = run.status === "stopped" || run.status === "done" || run.status === "error";
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { updated_at: now };
  if (typeof body?.step === "number" && Number.isFinite(body.step)) {
    patch.step = Math.max(0, Math.min(500, Math.floor(body.step)));
  }

  if (!terminal) {
    for (const e of incoming) {
      switch (e.kind) {
        case "done":
          patch.status = "done";
          patch.summary = e.label.slice(0, 500);
          patch.finished_at = now;
          break;
        case "error":
          patch.status = "error";
          patch.error = e.label.slice(0, 500);
          patch.finished_at = now;
          break;
        case "stopped":
          patch.status = "stopped";
          patch.finished_at = now;
          break;
        case "paused":
          patch.status = "paused";
          break;
        case "resumed":
          patch.status = "running";
          break;
        case "confirmation": {
          const action =
            e.payload && typeof e.payload === "object"
              ? (e.payload as Record<string, unknown>).action ?? {}
              : {};
          await admin.from("verxa_computer_confirmations").insert({
            run_id: id,
            action,
            reason: e.label.slice(0, 500),
            status: "pending",
          });
          patch.status = "awaiting_confirmation";
          break;
        }
        default:
          break;
      }
    }
  }

  const rows = incoming.map((e) => ({
    run_id: id,
    kind: e.kind,
    label: e.label.slice(0, 500),
    detail:
      typeof e.detail === "string" && e.detail ? e.detail.slice(0, 1000) : null,
    payload: e.payload ?? null,
  }));
  const { error: insertError } = await admin
    .from("verxa_computer_run_events")
    .insert(rows);
  if (insertError) {
    return NextResponse.json({ error: "Could not record activity." }, { status: 500 });
  }
  const { error: patchError } = await admin
    .from("verxa_computer_runs")
    .update(patch)
    .eq("id", id);
  if (patchError) {
    return NextResponse.json({ error: "Could not update the session." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, status: (patch.status as string) ?? run.status });
}
