import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/integrations/store";
import { falStatus, falResult } from "@/lib/fal";

export const runtime = "nodejs";

/**
 * GET /api/generate/status?url=... — polls one fal queue job.
 * The client passes the opaque status/response URLs it received on submit
 * (they are scoped, unguessable fal URLs). Auth required; no key involved.
 */
export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const statusUrl = req.nextUrl.searchParams.get("statusUrl") ?? "";
  const responseUrl = req.nextUrl.searchParams.get("responseUrl") ?? "";
  if (!statusUrl.startsWith("https://queue.fal.run/") || !responseUrl.startsWith("https://queue.fal.run/"))
    return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const status = await falStatus(statusUrl);
  if (!status) return NextResponse.json({ state: "error", message: "Lost contact with the generation service." });

  if (status.status !== "COMPLETED") {
    return NextResponse.json({
      state: "running",
      queuePosition: status.queuePosition ?? null,
    });
  }

  const result = await falResult(responseUrl);
  if (!result.ok)
    return NextResponse.json({ state: "error", code: result.code, message: result.message });

  return NextResponse.json({ state: "done", kind: result.kind, url: result.url });
}
