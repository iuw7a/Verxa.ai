import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import { resolveDesktopUser } from "@/lib/desktop";
import { insertRunEvent, loadOwnedRun } from "@/lib/computer-use-runs";

export const runtime = "nodejs";

/**
 * POST /api/desktop/computer-use/runs/[id]/confirm — decide a pending
 * confirmation. The browser user approves or denies; the device may only
 * deny (its auto-decline timeout backstop — it can never approve itself).
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
    confirmation_id?: string;
    allow?: boolean;
  } | null;
  const confirmationId = body?.confirmation_id ?? "";
  const allow = body?.allow === true;
  if (!/^[0-9a-f-]{36}$/i.test(confirmationId)) {
    return NextResponse.json({ error: "confirmation_id required." }, { status: 400 });
  }
  if (ctx.via === "desktop" && allow) {
    return NextResponse.json(
      { error: "Devices cannot approve their own actions." },
      { status: 403 },
    );
  }

  const now = new Date().toISOString();
  const { data: decided } = await admin
    .from("verxa_computer_confirmations")
    .update({ status: allow ? "approved" : "denied", decided_at: now })
    .eq("id", confirmationId)
    .eq("run_id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (!decided) {
    return NextResponse.json({ error: "This request was already decided." }, { status: 409 });
  }

  if (run.status === "awaiting_confirmation") {
    await admin
      .from("verxa_computer_runs")
      .update({ status: "running", updated_at: now })
      .eq("id", id);
  }
  await insertRunEvent(
    admin,
    id,
    "observation",
    ctx.via === "desktop"
      ? "Confirmation timed out — declined automatically."
      : allow
        ? "You approved this action."
        : "You declined this action.",
  );
  return NextResponse.json({ ok: true, allow });
}
