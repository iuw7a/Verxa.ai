import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ADMIN_EMAILS = ["admin@verxta.de"];
const STEPS = new Set(["entered", "named", "started", "completed"]);

/**
 * POST /api/invite/visits — public, best-effort. Records that someone
 * entered the invite flow. No sensitive data: only source, step,
 * display name and device. Never expose admin internals to the client.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    source?: string;
    step?: string;
    name?: string;
    device?: string;
    visitId?: string;
  } | null;

  const source = (body?.source ?? "").trim().slice(0, 40) || "unknown";
  const step = typeof body?.step === "string" && STEPS.has(body.step) ? body.step : "entered";
  const name = (body?.name ?? "").trim().slice(0, 40) || null;
  const device =
    body?.device === "mobile" || body?.device === "desktop" ? body.device : null;

  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false });

  const ua = req.headers.get("user-agent")?.slice(0, 200) ?? null;

  // Update the existing visit row when the client passes its id back.
  if (body?.visitId) {
    const patch: Record<string, string | null> = { last_step: step };
    if (name) patch.display_name = name;
    if (device) patch.device = device;
    const { error } = await admin
      .from("verxa_invite_visits")
      .update(patch)
      .eq("id", body.visitId);
    if (error) return NextResponse.json({ ok: false });
    return NextResponse.json({ ok: true, id: body.visitId });
  }

  const { data, error } = await admin
    .from("verxa_invite_visits")
    .insert({ source, last_step: step, display_name: name, device, user_agent: ua })
    .select("id")
    .single();
  if (error) return NextResponse.json({ ok: false });
  return NextResponse.json({ ok: true, id: data?.id ?? null });
}

/**
 * GET /api/invite/visits — admin only. Lists invite-flow visitors so the
 * admin can see who entered through the invite link.
 */
export async function GET() {
  const supabase = await createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Service not configured." }, { status: 500 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !ADMIN_EMAILS.includes(user.email)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const admin = createAdminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "Service not configured." }, { status: 500 });
  }
  const { data, error } = await admin
    .from("verxa_invite_visits")
    .select("id, source, display_name, device, last_step, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    return NextResponse.json({ error: "Query failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, visits: data ?? [] });
}
