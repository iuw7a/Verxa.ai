import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/integrations/store";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * DELETE /api/studio — remove one library item (row + stored asset bytes).
 * Body: { id: "<uuid>" } — ownership enforced via user_id filter.
 */
export async function DELETE(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { id?: string };
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!body.id || !uuid.test(body.id)) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  // RLS-equivalent filter: only rows owned by this user can match.
  const res = await fetch(
    `${db.ref}/rest/v1/verxa_studio_media?id=eq.${body.id}&user_id=eq.${userId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${db.key}`,
        apikey: db.key,
        Prefer: "return=representation",
      },
    },
  );
  if (!res.ok) return NextResponse.json({ error: "Could not delete the item." }, { status: 502 });
  const rows = (await res.json().catch(() => [])) as { id: string }[];
  if (!rows.length) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Best-effort blob cleanup.
  void fetch(`${db.ref}/rest/v1/verxa_media_assets?id=eq.${body.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${db.key}`, apikey: db.key },
  });

  return NextResponse.json({ ok: true });
}

function supabaseAdmin() {
  const ref = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!ref || !key) return null;
  return { ref, key };
}
