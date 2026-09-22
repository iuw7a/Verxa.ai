import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/integrations/store";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Barada Studio media library — per-user persistence in `verxa_studio_media`
 * (metadata) + `verxa_media_assets` (base64 bytes). Bytes live in their own
 * table so library queries never drag megabytes of blobs around; the asset is
 * served by the existing /api/media/[id] route (immutable caching).
 */

const MAX_LIBRARY_ITEMS = 200;
const MAX_ASSET_BYTES = 24 * 1024 * 1024; // 24 MB base64 cap

function supabaseAdmin() {
  const ref = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!ref || !key) return null;
  return { ref, key };
}

// GET — list the signed-in user's library (newest first).
export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to view your library." }, { status: 401 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });

  const res = await fetch(
    `${db.ref}/rest/v1/verxa_studio_media?user_id=eq.${userId}&select=id,kind,prompt,mode,aspect_ratio,source_asset_id,parent_id,created_at&order=created_at.desc&limit=${MAX_LIBRARY_ITEMS}`,
    {
      headers: { Authorization: `Bearer ${db.key}`, apikey: db.key, Accept: "application/json" },
      cache: "no-store",
    },
  );
  if (!res.ok) return NextResponse.json({ error: "Could not load the library." }, { status: 502 });
  const rows = (await res.json().catch(() => [])) as {
    id: string;
    kind: string;
    prompt: string;
    mode: string;
    aspect_ratio: string | null;
    source_asset_id: string | null;
    parent_id: string | null;
    created_at: string;
  }[];

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      kind: r.kind === "video" ? "video" : "image",
      prompt: r.prompt ?? "",
      mode: r.mode ?? "generate",
      aspectRatio: r.aspect_ratio ?? undefined,
      sourceAssetId: r.source_asset_id ?? undefined,
      parentId: r.parent_id ?? undefined,
      url: `/api/media/${r.id}`,
      createdAt: new Date(r.created_at).getTime(),
    })),
  });
}

// POST — persist a generated asset (base64 data URL) into the library.
export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to save media." }, { status: 401 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as {
    kind?: string;
    prompt?: string;
    mode?: string;
    aspectRatio?: string;
    sourceAssetId?: string;
    parentId?: string;
    dataUrl?: string;
    url?: string;
  };

  const kind = body.kind === "video" ? "video" : "image";
  const mode = ["generate", "edit", "transform", "image-to-video", "video"].includes(body.mode ?? "")
    ? (body.mode as string)
    : kind === "video"
      ? "video"
      : "generate";
  const prompt = (body.prompt ?? "").slice(0, 2000);
  const aspectRatio = (body.aspectRatio ?? "").slice(0, 12) || null;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (body.sourceAssetId && !uuid.test(body.sourceAssetId)) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (body.parentId && !uuid.test(body.parentId)) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  // Asset bytes: accept the provider's hosted URL (fetched server-side) or a
  // client-provided data URL (uploads / proxied results).
  let mime = kind === "video" ? "video/mp4" : "image/jpeg";
  let data = "";
  if (typeof body.dataUrl === "string" && body.dataUrl.startsWith("data:")) {
    const match = /^data:([\w./+-]+);base64,([\s\S]+)$/.exec(body.dataUrl);
    if (!match) return NextResponse.json({ error: "Unsupported data URL." }, { status: 400 });
    mime = match[1];
    data = match[2];
    if (data.length * 0.75 > MAX_ASSET_BYTES) {
      return NextResponse.json({ error: "File too large (max 24 MB)." }, { status: 413 });
    }
  } else {
  const src = typeof body.url === "string" ? body.url : "";
    if (!/^https?:\/\//.test(src)) return NextResponse.json({ error: "No media supplied." }, { status: 400 });
    try {
      const upstream = await fetch(src, { signal: AbortSignal.timeout(25_000), cache: "no-store" });
      if (!upstream.ok) return NextResponse.json({ error: "Could not fetch the media to save it." }, { status: 502 });
      const type = upstream.headers.get("content-type") ?? mime;
      if (!type.startsWith("image/") && !type.startsWith("video/")) {
        return NextResponse.json({ error: "Unsupported media type." }, { status: 400 });
      }
      mime = type.split(";")[0];
      const buf = Buffer.from(await upstream.arrayBuffer());
      if (buf.length > MAX_ASSET_BYTES) {
        return NextResponse.json({ error: "File too large (max 24 MB)." }, { status: 413 });
      }
      data = buf.toString("base64");
    } catch {
      return NextResponse.json({ error: "Could not fetch the media to save it." }, { status: 502 });
    }
  }
  if (!data) return NextResponse.json({ error: "No media supplied." }, { status: 400 });

  // Keep the library bounded: trim oldest rows beyond the cap.
  try {
    const countRes = await fetch(
      `${db.ref}/rest/v1/verxa_studio_media?user_id=eq.${userId}&select=id&order=created_at.desc&limit=1&count=exact`,
      {
        headers: {
          Authorization: `Bearer ${db.key}`,
          apikey: db.key,
          Accept: "application/json",
          Prefer: "count=exact",
        },
        cache: "no-store",
      },
    );
    const range = countRes.headers.get("content-range");
    const total = range ? Number(range.split("/")[1]) : 0;
    if (Number.isFinite(total) && total >= MAX_LIBRARY_ITEMS) {
      const overflowRes = await fetch(
        `${db.ref}/rest/v1/verxa_studio_media?user_id=eq.${userId}&select=id&order=created_at.desc&offset=${MAX_LIBRARY_ITEMS - 1}`,
        {
          headers: { Authorization: `Bearer ${db.key}`, apikey: db.key, Accept: "application/json" },
          cache: "no-store",
        },
      );
      if (overflowRes.ok) {
        const overflow = (await overflowRes.json().catch(() => [])) as { id: string }[];
      if (overflow.length) {
        await fetch(
          `${db.ref}/rest/v1/verxa_studio_media?id=in.(${overflow.map((o) => o.id).join(",")})`,
          { method: "DELETE", headers: { Authorization: `Bearer ${db.key}`, apikey: db.key } },
        );
      }
      }
    }
  } catch {
    // trimming is best-effort; never block the save
  }

  // Row id === asset id: /api/media/[id] serves the bytes, delete cleans
  // both with one id, and library URLs stay stable forever.
  const id = crypto.randomUUID();
  const assetId = id;

  const assetRes = await fetch(`${db.ref}/rest/v1/verxa_media_assets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${db.key}`,
      apikey: db.key,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ id: assetId, mime, data }),
  });
  if (!assetRes.ok) {
    return NextResponse.json({ error: "Could not store the media." }, { status: 502 });
  }

  const rowRes = await fetch(`${db.ref}/rest/v1/verxa_studio_media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${db.key}`,
      apikey: db.key,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      id,
      user_id: userId,
      kind,
      mode,
      prompt,
      aspect_ratio: aspectRatio,
      source_asset_id: body.sourceAssetId ?? null,
      parent_id: body.parentId ?? null,
    }),
  });
  if (!rowRes.ok) {
    // Orphan cleanup: don't leave the blob behind if the row failed.
    void fetch(`${db.ref}/rest/v1/verxa_media_assets?id=eq.${assetId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${db.key}`, apikey: db.key },
    });
    return NextResponse.json({ error: "Could not save to the library." }, { status: 502 });
  }
  const rows = (await rowRes.json().catch(() => [])) as { id: string; created_at: string }[];
  const row = rows[0];

  return NextResponse.json({
    item: {
      id,
      kind,
      mode,
      prompt,
      aspectRatio: aspectRatio ?? undefined,
      sourceAssetId: body.sourceAssetId ?? undefined,
      parentId: body.parentId ?? undefined,
      url: `/api/media/${id}`,
      createdAt: row ? new Date(row.created_at).getTime() : Date.now(),
    },
  });
}
