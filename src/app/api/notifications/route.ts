import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** GET /api/notifications — the signed-in user's unseen notifications. */
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Auth not configured." }, { status: 500 });
  }
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ notifications: [] });
  }

  const scope = req.nextUrl.searchParams.get("scope");
  let query = supabase
    .from("verxa_notifications")
    .select("id,kind,title,body,created_at,seen")
    .eq("user_id", data.user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  // Default: only unseen (back-compat). scope=all also returns seen items.
  if (scope !== "all") query = query.eq("seen", false);

  const { data: rows, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ notifications: rows ?? [] });
}

/** POST /api/notifications — { id } marks one notification as seen. */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Auth not configured." }, { status: 500 });
  }
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("verxa_notifications")
    .update({ seen: true })
    .eq("id", body.id)
    .eq("user_id", data.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
