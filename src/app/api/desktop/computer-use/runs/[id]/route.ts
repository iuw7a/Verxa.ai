import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import { resolveDesktopUser } from "@/lib/desktop";
import { loadOwnedRun } from "@/lib/computer-use-runs";
import { advanceWebRun } from "@/lib/computer-use-web-worker";

export const runtime = "nodejs";

/**
 * GET /api/desktop/computer-use/runs/[id] — full run state for the console:
 * run row + activity timeline + latest confirmation. The device polls this
 * too (control state: stop/pause/resume + confirmation decisions).
 * Web-only healing: when the website polls a run that is still waiting for
 * a (no longer required) desktop computer, the server claims and advances
 * it as a web session right here — idempotent, owner-scoped.
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
  let run = await loadOwnedRun(admin, ctx.userId, id);
  if (!run) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }
  if (ctx.via === "session") {
    try {
      const advanced = await advanceWebRun(admin, run);
      if (advanced) run = { ...run, ...advanced };
    } catch {
      /* serve the stored state — the next poll retries */
    }
  }
  const [events, confirmation] = await Promise.all([
    admin
      .from("verxa_computer_run_events")
      .select("id,kind,label,detail,created_at")
      .eq("run_id", id)
      .order("id", { ascending: true })
      .limit(300),
    admin
      .from("verxa_computer_confirmations")
      .select("id,action,reason,status,created_at,decided_at")
      .eq("run_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  return NextResponse.json({
    run,
    events: events.data ?? [],
    confirmation: confirmation.data ?? null,
  });
}
