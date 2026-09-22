/**
 * Normalize a Studio image reference into a form fal can consume:
 * - data: URIs          → pass through
 * - /api/media/<uuid>   → fetched and inlined as a data URI (dev has no
 *                          public hostname; fal accepts data URIs natively)
 * - https://…           → pass through (fal fetches it directly)
 */
export async function normalizeStudioImage(
  input: string,
): Promise<{ ok: true; imageUrl: string } | { ok: false; error: string; status: number }> {
  const value = (input ?? "").trim();

  if (value.startsWith("data:image/")) {
    if (value.length > 24 * 1024 * 1024) {
      return { ok: false, error: "Image too large (max 24 MB).", status: 413 };
    }
    return { ok: true, imageUrl: value };
  }

  if (/^https?:\/\//.test(value)) {
    return { ok: true, imageUrl: value };
  }

  const mediaMatch = /^\/api\/media\/([0-9a-f-]{36})$/i.exec(value);
  if (mediaMatch) {
    const ref = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!ref || !key) return { ok: false, error: "Storage unavailable.", status: 503 };

    const res = await fetch(
      `${ref}/rest/v1/verxa_media_assets?id=eq.${mediaMatch[1]}&select=mime,data`,
      {
        headers: { Authorization: `Bearer ${key}`, apikey: key, Accept: "application/json" },
        cache: "no-store",
      },
    );
    if (!res.ok) return { ok: false, error: "Could not load the source image.", status: 502 };
    const rows = (await res.json().catch(() => [])) as { mime?: string; data?: string }[];
    const row = rows[0];
    if (!row?.data) return { ok: false, error: "Source image not found.", status: 404 };
    return { ok: true, imageUrl: `data:${row.mime ?? "image/jpeg"};base64,${row.data}` };
  }

  return { ok: false, error: "An image is required — upload one or pick it from your library.", status: 400 };
}
