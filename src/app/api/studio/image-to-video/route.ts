import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/integrations/store";
import { isFalConfigured, falSubmitImageToVideo } from "@/lib/fal";
import { normalizeStudioImage } from "../image-normalize";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/studio/image-to-video — Barada Studio image → video.
 * Body: { imageUrl: string, prompt?: string (optional motion direction) }
 * Submits an i2v job on fal's queue; the client polls
 * /api/generate/status?statusUrl=…&responseUrl=… until the video URL arrives.
 */

// 4 conversions per user per 10 minutes (video is expensive).
const hits = new Map<string, number[]>();
function rateLimited(userId: string): boolean {
  const now = Date.now();
  const window = 10 * 60 * 1000;
  const list = (hits.get(userId) ?? []).filter((t) => now - t < window);
  if (list.length >= 4) return true;
  list.push(now);
  hits.set(userId, list);
  return false;
}

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to create videos." }, { status: 401 });
  if (rateLimited(userId)) {
    return NextResponse.json(
      { code: "rate_limit", message: "You've reached the video limit (4 / 10 min). Wait a bit and try again." },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { imageUrl?: string; prompt?: string };
  const prompt = (body.prompt ?? "").trim();
  if (prompt.length > 1000) {
    return NextResponse.json({ error: "Keep the motion prompt under 1000 characters." }, { status: 400 });
  }
  if (!isFalConfigured()) {
    return NextResponse.json({ code: "not_configured", message: "Image-to-video is not configured on this server." }, { status: 503 });
  }

  const src = await normalizeStudioImage(body.imageUrl ?? "");
  if (!src.ok) return NextResponse.json({ error: src.error }, { status: src.status });

  const r = await falSubmitImageToVideo(src.imageUrl, prompt);
  if (r.ok) return NextResponse.json({ mode: "fal", requestId: r.requestId, statusUrl: r.statusUrl, responseUrl: r.responseUrl });
  return NextResponse.json({ code: r.code, message: r.message }, { status: r.code === "invalid_prompt" ? 400 : 502 });
}
