import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { emitEmailEvent } from "@/lib/email/events";

export const runtime = "nodejs";

/** POST /api/email/welcome — fires when a new user completes signup. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    userId?: string;
    email?: string;
    name?: string;
  } | null;

  if (!body?.email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  // Only send for the caller's own account (or when service creds validate it).
  const supabase = await createServerSupabase();
  const { data } = supabase ? await supabase.auth.getUser() : { data: null };
  const allowed =
    data?.user?.email === body.email || data?.user?.id === body.userId;
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const result = await emitEmailEvent("USER_REGISTERED", {
    to: body.email,
    userId: body.userId ?? data?.user?.id ?? null,
    vars: { name: body.name ?? body.email.split("@")[0], email: body.email },
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
