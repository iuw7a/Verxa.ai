import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  getPreferences,
  updatePreferences,
  DEFAULT_PREFERENCES,
} from "@/lib/email/preferences";

export const runtime = "nodejs";

/** GET /api/email/preferences — own email preferences (signed in). */
export async function GET() {
  const supabase = await createServerSupabase();
  if (!supabase)
    return NextResponse.json({ error: "Auth not configured." }, { status: 500 });
  const { data } = await supabase.auth.getUser();
  if (!data.user)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const prefs = await getPreferences(data.user.id);
  return NextResponse.json({
    preferences: {
      ...DEFAULT_PREFERENCES,
      ...(prefs ?? {}),
      user_id: data.user.id,
      email: data.user.email ?? prefs?.email ?? null,
    },
  });
}

const BOOL_KEYS = [
  "marketing_consent",
  "product_updates",
  "newsletters",
  "tips_tutorials",
  "new_features",
] as const;

/** PUT /api/email/preferences — update own preferences. */
export async function PUT(req: NextRequest) {
  const supabase = await createServerSupabase();
  if (!supabase)
    return NextResponse.json({ error: "Auth not configured." }, { status: 500 });
  const { data } = await supabase.auth.getUser();
  if (!data.user)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const update: Record<string, boolean | string> = {};
  for (const k of BOOL_KEYS) {
    if (typeof body[k] === "boolean") update[k] = body[k] as boolean;
  }
  if (typeof body.source === "string")
    update.source = body.source.slice(0, 60);

  const prefs = await updatePreferences(
    data.user.id,
    data.user.email ?? null,
    update,
  );
  if (!prefs)
    return NextResponse.json(
      { error: "Could not save preferences yet — email tables are not installed. Ask an admin to run supabase/email-system.sql." },
      { status: 503 },
    );
  return NextResponse.json({ preferences: prefs });
}
