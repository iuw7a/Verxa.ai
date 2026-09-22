import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import { resolveDesktopUser } from "@/lib/desktop";

export const runtime = "nodejs";

const RATINGS = new Set(["good", "okay", "needs_improvement"]);
const CATEGORIES = new Set(["bug", "feature", "general"]);

/** POST /api/desktop/feedback — rating + optional message. No chat contents. */
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
    rating?: string;
    category?: string;
    message?: string;
    app_version?: string;
    os?: string;
  } | null;
  const message = (body?.message ?? "").trim().slice(0, 2000);
  if (!message && !body?.rating) {
    return NextResponse.json(
      { error: "A rating or message is required." },
      { status: 400 },
    );
  }
  const { error } = await admin.from("verxa_desktop_feedback").insert({
    user_id: ctx.userId,
    rating:
      typeof body?.rating === "string" && RATINGS.has(body.rating)
        ? body.rating
        : null,
    category:
      typeof body?.category === "string" && CATEGORIES.has(body.category)
        ? body.category
        : "general",
    message: message || "(rating only)",
    app_version: (body?.app_version ?? "").slice(0, 20) || null,
    os: (body?.os ?? "").slice(0, 40) || null,
  });
  if (error) {
    return NextResponse.json({ error: "Submit failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
