import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/admin";
import { emitEmailEvent } from "@/lib/email/events";
import { checkRateLimit, RATE_LIMITS } from "@/lib/email/rate-limit";

export const runtime = "nodejs";

const NOTIFY_COOLDOWN_MS = 30 * 24 * 3600 * 1000; // one notice per device / 30d

function deviceHash(ua: string, ip: string): string {
  return createHash("sha256").update(`${ua}|${ip}`).digest("hex").slice(0, 32);
}

function shortUa(ua: string): string {
  // Keep it human-readable without storing the full fingerprint in email.
  const m = ua.match(/(Chrome|Firefox|Safari|Edg|OPR|Mobile)[/\s][\d.]+/);
  const os = ua.match(/(Windows|Mac OS X|Android|iPhone|iPad|Linux)[^;)]*/);
  return [m?.[0], os?.[0]].filter(Boolean).join(" · ") || "Unknown device";
}

/**
 * POST /api/email/events/login — client-reported sign-in (auth required).
 * Records the device; emails ONLY unknown devices (no refresh spam).
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  if (!supabase)
    return NextResponse.json({ error: "Auth not configured." }, { status: 500 });
  const { data } = await supabase.auth.getUser();
  if (!data.user || !data.user.email)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const ua = req.headers.get("user-agent") ?? "unknown";
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const hash = deviceHash(ua, ip);

  const admin = createAdminSupabase();
  if (!admin)
    return NextResponse.json({ error: "Service not configured." }, { status: 500 });

  const now = new Date().toISOString();
  let known = true;
  try {
    const { data: row } = await admin
      .from("verxa_login_devices")
      .select("last_notified_at")
      .eq("user_id", data.user.id)
      .eq("device_hash", hash)
      .maybeSingle();
    if (!row) {
      known = false;
      await admin.from("verxa_login_devices").insert({
        user_id: data.user.id,
        device_hash: hash,
        user_agent: ua.slice(0, 300),
        ip: ip === "unknown" ? null : ip.slice(0, 64),
        first_seen: now,
        last_seen: now,
        last_notified_at: now,
      });
    } else {
      await admin
        .from("verxa_login_devices")
        .update({ last_seen: now, user_agent: ua.slice(0, 300) })
        .eq("user_id", data.user.id)
        .eq("device_hash", hash);
      const last = (row as { last_notified_at?: string | null })
        ?.last_notified_at;
      if (last && Date.now() - new Date(last).getTime() < NOTIFY_COOLDOWN_MS) {
        return NextResponse.json({ ok: true, notified: false });
      }
    }
  } catch {
    return NextResponse.json({ ok: true, notified: false });
  }

  if (!known) {
    const rl = await checkRateLimit(
      `login:${data.user.id}`,
      RATE_LIMITS.loginNotice.limit,
      RATE_LIMITS.loginNotice.windowMs,
    );
    if (rl.allowed) {
      void emitEmailEvent("NEW_DEVICE_LOGIN", {
        to: data.user.email,
        userId: data.user.id,
        vars: {
          email: data.user.email,
          device: shortUa(ua),
          timestamp: now,
        },
      });
      return NextResponse.json({ ok: true, notified: true });
    }
  }
  return NextResponse.json({ ok: true, notified: false });
}
