import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/desktop/download?platform=win — 302 to the real installer.
 * Only released platforms resolve; everything else 404s (no fake downloads).
 */
export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get("platform") ?? "";
  if (platform !== "win") {
    return NextResponse.json(
      { error: "No download available for this platform yet." },
      { status: 404 },
    );
  }
  const admin = createAdminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "Service not configured." }, { status: 500 });
  }
  const { data } = await admin
    .from("verxa_desktop_releases")
    .select("download_url")
    .eq("is_current", true)
    .eq("platform", "win");
  const url = ((data ?? []) as { download_url?: string }[])[0]?.download_url;
  if (!url) {
    return NextResponse.json(
      { error: "Windows build is not published yet." },
      { status: 404 },
    );
  }
  return NextResponse.redirect(url, { status: 302 });
}
