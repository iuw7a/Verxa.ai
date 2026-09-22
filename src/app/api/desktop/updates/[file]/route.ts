import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/desktop/updates/latest.yml — electron-updater generic feed.
 * Only serves a feed when a current Windows release exists.
 */
export async function GET(req: NextRequest) {
  if (!req.nextUrl.pathname.endsWith("latest.yml")) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const admin = createAdminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "Service not configured." }, { status: 500 });
  }
  const { data } = await admin
    .from("verxa_desktop_releases")
    .select("version,download_url,sha512,size_bytes,release_date,notes")
    .eq("is_current", true)
    .eq("platform", "win");
  const rel = ((data ?? []) as {
    version?: string;
    download_url?: string;
    sha512?: string | null;
    size_bytes?: number | null;
    release_date?: string;
    notes?: string | null;
  }[])[0];
  if (!rel?.version || !rel?.download_url || !rel?.sha512) {
    return NextResponse.json(
      { error: "No published release." },
      { status: 404 },
    );
  }
  const yml = [
    "version: " + rel.version,
    "releaseDate: " + (rel.release_date ?? new Date().toISOString()),
    "files:",
    "  - url: " + rel.download_url,
    "    sha512: " + rel.sha512,
    "    size: " + (rel.size_bytes ?? 0),
    "path: Verxa-Setup.exe",
    "sha512: " + rel.sha512,
    "releaseNotes: " + JSON.stringify(rel.notes ?? ""),
  ].join("\n");
  return new NextResponse(yml + "\n", {
    headers: { "Content-Type": "text/yaml; charset=utf-8" },
  });
}
