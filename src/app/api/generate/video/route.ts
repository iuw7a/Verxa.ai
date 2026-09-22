import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/integrations/store";
import { isAgnesConfigured, agnesSubmitVideo, agnesVideoStatus, type AgnesVideoOptions } from "@/lib/agnes";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Agnes video generation.
 *  POST — submit a text-to-video task → { mode: "agnes", videoId, model }
 *  GET ?videoId=…&model=… — poll task status → { state, url?, progress? }
 * The client polls GET until state === "done". AGNES_API_KEY never leaves
 * the server; the video URL returned is Agnes' own hosted MP4.
 */

// Video is expensive: 4 submissions per user per 10 minutes.
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
  if (!userId) return NextResponse.json({ error: "Sign in to generate videos." }, { status: 401 });
  if (rateLimited(userId))
    return NextResponse.json({ code: "rate_limit", message: "You've reached the video limit (4 / 10 min). Wait a bit and try again." }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { prompt?: string; videoOptions?: AgnesVideoOptions };

  if (isAgnesConfigured()) {
    const r = await agnesSubmitVideo(body.prompt ?? "", body.videoOptions ?? null);
    if (r.ok) return NextResponse.json({ mode: "agnes", videoId: r.videoId, model: r.model });
    return NextResponse.json({ code: r.code, message: r.message }, { status: r.code === "invalid_prompt" ? 400 : 502 });
  }

  return NextResponse.json({ code: "not_configured", message: "Video generation is not configured on this server." }, { status: 503 });
}

export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const videoId = req.nextUrl.searchParams.get("videoId") ?? "";
  if (!/^[\w:-]{8,300}$/.test(videoId))
    return NextResponse.json({ error: "Bad request." }, { status: 400 });

  if (!isAgnesConfigured()) return NextResponse.json({ state: "error", message: "Video service unavailable." });
  const model = req.nextUrl.searchParams.get("model") ?? undefined;
  const s = await agnesVideoStatus(videoId, model);
  if (s.state === "done") return NextResponse.json({ state: "done", url: s.url });
  if (s.state === "error") return NextResponse.json({ state: "error", message: s.message });
  return NextResponse.json({ state: "running", progress: s.progress });
}
