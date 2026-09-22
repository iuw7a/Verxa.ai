import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/feedback/logout — stores the one-question exit survey shown on
 * /logout. Best effort by design: signing out must never fail because the
 * feedback could not be saved, so this always answers 200.
 *
 * The answer lands in the ticket store (visible in the admin console) with a
 * "Logout feedback" prefix, so leaving-users never pollute the open queue.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    reason?: string;
    comment?: string;
  } | null;

  const reason = (body?.reason ?? "").trim().slice(0, 120);
  const comment = (body?.comment ?? "").trim().slice(0, 1000);
  if (!reason && !comment) return NextResponse.json({ ok: true, stored: false });

  try {
    const supabase = await createServerSupabase();
    const { data } = supabase
      ? await supabase.auth.getUser()
      : { data: { user: null } };
    const user = data.user;
    const admin = createAdminSupabase();

    // Signed-out visitors have nothing to attribute the answer to.
    if (user?.email && admin) {
      const { error } = await admin.from("verxa_tickets").insert({
        user_id: user.id,
        email: user.email,
        subject: `Logout feedback — ${reason || "no reason given"}`,
        message: comment || "—",
        status: "closed",
        priority: "low",
      });
      if (error) console.warn("[feedback/logout] store failed:", error.message);
    }
  } catch (error) {
    console.warn("[feedback/logout] unexpected failure:", error);
  }

  return NextResponse.json({ ok: true, stored: true });
}
