import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import { resolveDesktopUser } from "@/lib/desktop";

export const runtime = "nodejs";

function maskIp(ip: string | null): string | null {
  if (!ip) return null;
  // v4: mask last octet. Keep it coarse on purpose.
  const v4 = ip.match(/^(\d+\.\d+\.\d+)\.\d+$/);
  if (v4) return `${v4[1]}.0`;
  return "hidden";
}

/** GET /api/desktop/devices — own desktop sessions (no tokens exposed). */
export async function GET(req: NextRequest) {
  const ctx = await resolveDesktopUser(req);
  if (!ctx) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const admin = createAdminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "Service not configured." }, { status: 500 });
  }
  const { data, error } = await admin
    .from("verxa_desktop_sessions")
    .select("device_id,device_name,os,app_version,ip,status,first_seen,last_seen,revoked_at")
    .eq("user_id", ctx.userId)
    .order("last_seen", { ascending: false });
  if (error) {
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
  return NextResponse.json({
    devices: ((data ?? []) as Record<string, unknown>[]).map((d) => ({
      ...d,
      ip: maskIp(d.ip as string | null),
      current: ctx.session?.device_id === d.device_id,
    })),
  });
}
