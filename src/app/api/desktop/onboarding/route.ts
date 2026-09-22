import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import { resolveDesktopUser } from "@/lib/desktop";

export const runtime = "nodejs";

const USE_CASES = new Set([
  "assistant",
  "research",
  "coding",
  "writing",
  "business",
  "learning",
  "productivity",
  "creative",
  "other",
]);
const DISCOVERY = new Set([
  "google",
  "youtube",
  "tiktok",
  "instagram",
  "x",
  "github",
  "friend",
  "school",
  "work",
  "search",
  "other",
]);
const PREVIOUS = new Set([
  "chatgpt",
  "claude",
  "gemini",
  "perplexity",
  "other",
  "none",
]);

/** GET /api/desktop/onboarding — own onboarding state. */
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
    .from("verxa_desktop_onboarding")
    .select("*")
    .eq("user_id", ctx.userId)
    .maybeSingle();
  return NextResponse.json({ onboarding: data ?? null });
}

/** POST /api/desktop/onboarding — save answers (validated enums only). */
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
    display_name?: string;
    company_name?: string | null;
    use_cases?: string[];
    discovery_source?: string;
    previous_ai?: string;
    first_launch_at?: string;
    completed?: boolean;
  } | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const useCases = Array.isArray(body.use_cases)
    ? [...new Set(body.use_cases.filter((u) => USE_CASES.has(u)) )].slice(0, 9)
    : undefined;
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { updated_at: now };
  if (typeof body.display_name === "string" && body.display_name.trim())
    patch.display_name = body.display_name.trim().slice(0, 80);
  if (body.company_name === null) patch.company_name = null;
  else if (typeof body.company_name === "string" && body.company_name.trim())
    patch.company_name = body.company_name.trim().slice(0, 120);
  if (useCases !== undefined) patch.use_cases = useCases;
  if (typeof body.discovery_source === "string" && DISCOVERY.has(body.discovery_source))
    patch.discovery_source = body.discovery_source;
  if (typeof body.previous_ai === "string" && PREVIOUS.has(body.previous_ai))
    patch.previous_ai = body.previous_ai;
  if (typeof body.first_launch_at === "string") {
    const t = new Date(body.first_launch_at);
    if (!Number.isNaN(t.getTime())) patch.first_launch_at = t.toISOString();
  }
  if (body.completed) patch.completed_at = now;

  const { data, error } = await admin
    .from("verxa_desktop_onboarding")
    .upsert({ user_id: ctx.userId, ...patch }, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ error: "Save failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, onboarding: data });
}
