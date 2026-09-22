import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * GET /api/media/:id — serves a generated media asset (stored as base64 in
 * verxa_media_assets). IDs are uuid v4 (unguessable); the row is fetched with
 * the service key, so this works regardless of RLS on anon requests.
 * Immutable caching: generated media never changes.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    return new NextResponse("Not found", { status: 404 });

  const ref = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!ref || !key) return new NextResponse("Media unavailable", { status: 503 });

  const res = await fetch(
    `${ref}/rest/v1/verxa_media_assets?id=eq.${id}&select=mime,data`,
    {
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );
  if (!res.ok) return new NextResponse("Media unavailable", { status: 503 });

  const rows = (await res.json().catch(() => [])) as { mime?: string; data?: string }[];
  const row = rows[0];
  if (!row?.data) return new NextResponse("Not found", { status: 404 });

  const buffer = Buffer.from(row.data, "base64");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": row.mime ?? "image/jpeg",
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
