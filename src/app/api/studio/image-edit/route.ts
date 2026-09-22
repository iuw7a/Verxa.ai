import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/integrations/store";
import { isFalConfigured, falSubmitImageEdit } from "@/lib/fal";
import { normalizeStudioImage } from "../image-normalize";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/studio/image-edit — Barada Studio image editing / transformation.
 * Body: { imageUrl: string (hosted or /api/media/... absolute), prompt: string }
 * Submits an image-edit job on fal's queue (FLUX Kontext); the client polls
 * /api/generate/status?statusUrl=…&responseUrl=… until the edited image URL
 * arrives. FAL_KEY stays server-side.
 */

// 10 edits per user per 5 minutes.
const hits = new Map<string, number[]>();
function rateLimited(userId: string): boolean {
  const now = Date.now();
  const window = 5 * 60 * 1000;
  const list = (hits.get(userId) ?? []).filter((t) => now - t < window);
  if (list.length >= 10) return true;
  list.push(now);
  hits.set(userId, list);
  return false;
}

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to edit images." }, { status: 401 });
  if (rateLimited(userId)) {
    return NextResponse.json(
      { code: "rate_limit", message: "You've reached the edit limit (10 / 5 min). Wait a bit and try again." },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { imageUrl?: string; prompt?: string };
  const prompt = (body.prompt ?? "").trim();
  if (prompt.length < 3 || prompt.length > 1000) {
    return NextResponse.json({ error: "Describe the edit in a few words (3–1000 characters)." }, { status: 400 });
  }
  if (!isFalConfigured()) {
    return NextResponse.json({ code: "not_configured", message: "Image editing is not configured on this server." }, { status: 503 });
  }

  // Normalize the source image to something fal can read: data URIs pass
  // through, local /api/media/… paths are inlined as data URIs (works in dev
  // where localhost isn't publicly reachable), https URLs pass through.
  const src = await normalizeStudioImage(body.imageUrl ?? "");
  if (!src.ok) return NextResponse.json({ error: src.error }, { status: src.status });

  const r = await falSubmitImageEdit(src.imageUrl, prompt);
  if (r.ok) return NextResponse.json({ mode: "fal", requestId: r.requestId, statusUrl: r.statusUrl, responseUrl: r.responseUrl });
  return NextResponse.json({ code: r.code, message: r.message }, { status: r.code === "invalid_prompt" ? 400 : 502 });
}
