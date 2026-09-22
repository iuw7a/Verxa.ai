import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/integrations/store";
import { isAgnesConfigured, agnesGenerateImage } from "@/lib/agnes";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST /api/generate/image — generates one image.
 * Images use ONLY the Agnes key (fast ~10s, free, hosted URL) per project
 * decision. Provider keys never leave the server.
 */

// Simple in-memory rate limit: 10 generations per user per 5 minutes.
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
  if (!userId) return NextResponse.json({ error: "Sign in to generate images." }, { status: 401 });
  if (rateLimited(userId))
    return NextResponse.json({ code: "rate_limit", message: "You've reached the image limit (10 / 5 min). Wait a bit and try again." }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { prompt?: string };
  const prompt = body.prompt ?? "";

  if (!isAgnesConfigured())
    return NextResponse.json({ code: "not_configured", message: "Image generation is not configured on this server." }, { status: 503 });

  const r = await agnesGenerateImage(prompt);
  if (r.ok) return NextResponse.json({ mode: "sync", url: r.url });
  return NextResponse.json({ code: r.code, message: r.message }, { status: r.code === "invalid_prompt" ? 400 : 502 });
}
