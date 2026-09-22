import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = (process.env.SITE_URL?.trim() || "https://verxa.de").replace(
  /\/+$/,
  "",
);

type ReleaseRow = {
  version: string;
  platform: string;
  download_url: string;
  sha256: string | null;
  release_date: string;
  notes: string | null;
};

/**
 * GET /api/desktop/version — public release metadata.
 * Single source of truth for the /downloads page and the updater.
 */
export async function GET() {
  const admin = createAdminSupabase();
  let win: ReleaseRow | null = null;
  if (admin) {
    const { data } = await admin
      .from("verxa_desktop_releases")
      .select("version,platform,download_url,sha256,release_date,notes")
      .eq("is_current", true)
      .eq("platform", "win");
    const rows = (data ?? []) as ReleaseRow[];
    win = rows[0] ?? null;
  }
  return NextResponse.json({
    windows: win
      ? {
          available: true,
          version: win.version,
          releaseDate: win.release_date,
          downloadUrl: `${APP_URL}/api/desktop/download?platform=win`,
          sha256: win.sha256,
          notes: win.notes,
        }
      : { available: false },
    macos: { available: false, status: "coming-soon" },
    ios: { available: false, status: "coming-soon" },
    android: { available: false, status: "coming-soon" },
  });
}
