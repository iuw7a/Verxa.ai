import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

/** GET /api/admin/profiles — plan/ban state for all profiles. */
export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const { admin } = guard;

  const { data, error } = await admin
    .from("verxa_profiles")
    .select("id,plan,banned");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profiles: data ?? [] });
}
