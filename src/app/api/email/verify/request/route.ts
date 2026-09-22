import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/admin";
import { APP_URL } from "@/lib/email/config";
import { emitEmailEvent } from "@/lib/email/events";
import { createEmailToken } from "@/lib/email/tokens";
import { checkRateLimit, RATE_LIMITS } from "@/lib/email/rate-limit";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Resolve a user id + name for an email via the public profile mirror. */
async function resolveAccount(email: string): Promise<{
  userId: string | null;
  name: string | null;
  alreadyVerified: boolean;
}> {
  const admin = createAdminSupabase();
  if (!admin) return { userId: null, name: null, alreadyVerified: false };
  const { data: profile } = await admin
    .from("verxa_profiles")
    .select("id,display_name")
    .eq("email", email)
    .maybeSingle();
  const row = profile as { id?: string; display_name?: string } | null;
  let alreadyVerified = false;
  if (row?.id) {
    try {
      const { data } = await admin.auth.admin.getUserById(row.id);
      alreadyVerified = Boolean(data?.user?.email_confirmed_at);
    } catch {
      /* treat as unverified */
    }
  }
  return {
    userId: row?.id ?? null,
    name: row?.display_name ?? null,
    alreadyVerified,
  };
}

/**
 * POST /api/email/verify/request — send (or re-send) the verification email.
 * Always responds {ok:true} to prevent email enumeration; rate-limited.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    email?: string;
  } | null;

  let email = body?.email?.trim().toLowerCase() ?? "";
  let sessionUserId: string | null = null;

  const supabase = await createServerSupabase();
  const { data: userData } = supabase
    ? await supabase.auth.getUser()
    : { data: null };
  if (userData?.user?.email) {
    email = userData.user.email.trim().toLowerCase();
    sessionUserId = userData.user.id;
  }

  if (!email || !EMAIL_RE.test(email) || email.length > 320) {
    // Same generic shape — no enumeration.
    return NextResponse.json({ ok: true });
  }

  const rl = await checkRateLimit(
    `verify:${email}`,
    RATE_LIMITS.verification.limit,
    RATE_LIMITS.verification.windowMs,
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please wait a while." },
      { status: 429 },
    );
  }

  const account = await resolveAccount(email);
  const userId = sessionUserId ?? account.userId;
  if (account.alreadyVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const created = await createEmailToken({
    purpose: "verify_email",
    userId,
    email,
  });
  if (!created) return NextResponse.json({ ok: true });

  const verificationUrl = `${APP_URL}/verify-email?token=${encodeURIComponent(created.token)}`;
  // Fire-and-forget: the HTTP response must not leak send status.
  void emitEmailEvent("EMAIL_VERIFICATION_REQUESTED", {
    to: email,
    userId,
    vars: { name: account.name ?? undefined, email, verificationUrl },
  });

  return NextResponse.json({ ok: true });
}
