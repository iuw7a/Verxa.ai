import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import { APP_URL } from "@/lib/email/config";
import { emitEmailEvent } from "@/lib/email/events";
import { createEmailToken } from "@/lib/email/tokens";
import { checkRateLimit, RATE_LIMITS } from "@/lib/email/rate-limit";
import { createHash } from "crypto";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fingerprint(req: NextRequest): string {
  const ua = req.headers.get("user-agent") ?? "unknown";
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return createHash("sha256")
    .update(`${ua}|${ip}`)
    .digest("hex")
    .slice(0, 32);
}

async function knownDevice(userId: string, fp: string): Promise<boolean> {
  try {
    const admin = createAdminSupabase();
    if (!admin) return true;
    const { data } = await admin
      .from("verxa_login_devices")
      .select("device_hash")
      .eq("user_id", userId)
      .eq("device_hash", fp)
      .maybeSingle();
    return Boolean(data);
  } catch {
    return true;
  }
}

/**
 * POST /api/email/password/request — start a password reset.
 * Always {ok:true} (enumeration-safe); strict per-address rate limit.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    email?: string;
  } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  if (!email || !EMAIL_RE.test(email) || email.length > 320) {
    return NextResponse.json({ ok: true });
  }

  const rl = await checkRateLimit(
    `pwreset:${email}`,
    RATE_LIMITS.passwordReset.limit,
    RATE_LIMITS.passwordReset.windowMs,
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please wait an hour." },
      { status: 429 },
    );
  }

  const admin = createAdminSupabase();
  let userId: string | null = null;
  let name: string | null = null;
  if (admin) {
    const { data: profile } = await admin
      .from("verxa_profiles")
      .select("id,display_name")
      .eq("email", email)
      .maybeSingle();
    const row = profile as { id?: string; display_name?: string } | null;
    userId = row?.id ?? null;
    name = row?.display_name ?? null;
  }

  // Unknown address: pretend success (no email, no token).
  if (!userId) return NextResponse.json({ ok: true });

  const created = await createEmailToken({
    purpose: "reset_password",
    userId,
    email,
  });
  if (!created) return NextResponse.json({ ok: true });

  const resetPasswordUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(created.token)}`;
  const ua = req.headers.get("user-agent") ?? undefined;

  void emitEmailEvent("PASSWORD_RESET_REQUESTED", {
    to: email,
    userId,
    vars: { name: name ?? undefined, email, resetPasswordUrl, device: ua },
  });

  // Extra heads-up when the request comes from an unrecognized device.
  const fp = fingerprint(req);
  void (async () => {
    try {
      if (!(await knownDevice(userId as string, fp))) {
        await emitEmailEvent("PASSWORD_RESET_NOTICE", {
          to: email,
          userId,
          vars: {
            name: name ?? undefined,
            email,
            device: ua,
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch {
      /* never break the reset flow */
    }
  })();

  return NextResponse.json({ ok: true });
}
