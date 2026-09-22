import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createAdminSupabase } from "@/lib/admin";
import { resolveDesktopUser } from "@/lib/desktop";
import { checkRateLimit } from "@/lib/email/rate-limit";
import { insertRunEvent, loadConsentEnabled, type RunRow } from "@/lib/computer-use-runs";
import { advanceWebRun } from "@/lib/computer-use-web-worker";

export const runtime = "nodejs";

/**
 * GET /api/desktop/computer-use/runs — the caller's own runs, newest first.
 * The web console renders these; nothing here is device-specific.
 */
export async function GET(req: NextRequest) {
  const ctx = await resolveDesktopUser(req);
  if (!ctx) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const admin = createAdminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "Service not configured." }, { status: 500 });
  }
  const { data, error } = await admin
    .from("verxa_computer_runs")
    .select(
      "id,device_id,goal,status,step,summary,error,created_at,updated_at,claimed_at,finished_at",
    )
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
  return NextResponse.json({ runs: data ?? [] });
}

/**
 * POST /api/desktop/computer-use/runs — start a Computer Use session from
 * the website. Requires the user's server-side consent record (same
 * authority the step route enforces). Web-only: the server immediately
 * claims the run as a web session — it never waits for a desktop computer.
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
  if (!(await loadConsentEnabled(admin, ctx.userId))) {
    return NextResponse.json(
      { error: "Computer Use is not enabled for this account." },
      { status: 403 },
    );
  }
  const rl = await checkRateLimit(`cu-run:${ctx.userId}`, 30, 3600 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many sessions — try again later." }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { goal?: string } | null;
  const goal = typeof body?.goal === "string" ? body.goal.trim().slice(0, 500) : "";
  if (goal.length < 3) {
    return NextResponse.json({ error: "Describe what Verxa should do." }, { status: 400 });
  }

  const id = nanoid(12);
  const { data, error } = await admin
    .from("verxa_computer_runs")
    .insert({ id, user_id: ctx.userId, goal, status: "queued" })
    .select(
      "id,device_id,goal,status,step,summary,error,created_at,updated_at,claimed_at,finished_at",
    )
    .single();
  if (error) {
    return NextResponse.json({ error: "Could not start the session." }, { status: 500 });
  }
  await insertRunEvent(
    admin,
    id,
    "info",
    "Web-Sitzung wird gestartet — direkt hier, ohne Installation.",
  );
  // Web-only: claim + first real step right away. Never throws — if the
  // worker fails, the run stays queued and the next client poll retries it.
  try {
    const created = await admin
      .from("verxa_computer_runs")
      .select(
        "id,user_id,device_id,goal,status,step,summary,error,created_at,updated_at,claimed_at,finished_at",
      )
      .eq("id", id)
      .maybeSingle();
    if (created.data) {
      const advanced = await advanceWebRun(admin, created.data as RunRow);
      if (advanced) return NextResponse.json({ run: advanced });
    }
  } catch {
    /* healed by the next GET poll */
  }
  return NextResponse.json({ run: data });
}
