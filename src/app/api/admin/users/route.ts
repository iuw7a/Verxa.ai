import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, createAdminSupabase } from "@/lib/admin";
import { emitEmailEvent, type EmailEvent } from "@/lib/email/events";

export const runtime = "nodejs";

/** GET /api/admin/users?userId=… — profile + memories + personalization. */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const { admin } = guard;

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const [profile, memories, personalization, chats] = await Promise.all([
    admin.from("verxa_profiles").select("*").eq("id", userId).maybeSingle(),
    admin.from("verxa_memories").select("*").eq("user_id", userId),
    admin.from("verxa_personalization").select("*").eq("user_id", userId).maybeSingle(),
    admin
      .from("verxa_chats")
      .select("id,title,updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(50),
  ]);

  return NextResponse.json({
    profile: profile.data,
    memories: memories.data ?? [],
    personalization: personalization.data,
    chats: chats.data ?? [],
  });
}

/** PATCH /api/admin/users — { userId, banned?, plan? } */
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const { admin, userId: selfId } = guard;

  const body = (await req.json().catch(() => null)) as {
    userId?: string;
    banned?: boolean;
    plan?: string;
  } | null;

  if (!body?.userId || (body.banned === undefined && !body.plan)) {
    return NextResponse.json(
      { error: "userId and banned or plan required" },
      { status: 400 },
    );
  }
  if (body.userId === selfId && body.banned) {
    return NextResponse.json(
      { error: "You cannot ban yourself." },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = {};
  if (body.banned !== undefined) patch.banned = body.banned;
  if (body.plan) patch.plan = body.plan === "pro" ? "pro" : "free";

  const { error } = await admin
    .from("verxa_profiles")
    .update(patch)
    .eq("id", body.userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from("verxa_activity").insert({
    actor: "admin",
    action: body.banned !== undefined ? `user.${body.banned ? "banned" : "unbanned"}` : "user.plan_changed",
    detail: { userId: body.userId, ...patch },
  });

  const notify: EmailEvent | null = body.plan === "pro"
    ? "SUBSCRIPTION_STARTED"
    : body.plan === "free"
      ? "SUBSCRIPTION_CANCELLED"
      : null;
  if (notify) {
    const authAdmin = createAdminSupabase();
    const { data } = authAdmin
      ? await authAdmin.auth.admin.getUserById(body.userId)
      : { data: null };
    const email = data?.user?.email;
    if (email) {
      void emitEmailEvent(notify, {
        to: email,
        userId: body.userId,
        vars: {
          name: data?.user?.user_metadata?.full_name as string | undefined,
          email,
          planName: body.plan === "pro" ? "Pro" : "Free",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // In-app notification (appears live in the user's UI via toast).
    await admin.from("verxa_notifications").insert({
      user_id: body.userId,
      kind: notify === "SUBSCRIPTION_STARTED" ? "subscription_started" : "subscription_canceled",
      title:
        notify === "SUBSCRIPTION_STARTED"
          ? "Welcome to Verxa Pro 🎉"
          : "Subscription updated",
      body:
        notify === "SUBSCRIPTION_STARTED"
          ? "Pro is now active on your account — unlimited chats and priority models are unlocked. A confirmation email is on its way."
          : "Your Pro access was removed. You're back on the free plan.",
    });
  }

  return NextResponse.json({ ok: true });
}

/** PUT /api/admin/users — ban via auth API (blocks sign-in) { userId, banned } */
export async function PUT(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const { userId: selfId } = guard;

  const body = (await req.json().catch(() => null)) as {
    userId?: string;
    banned?: boolean;
  } | null;
  if (!body?.userId || body.banned === undefined) {
    return NextResponse.json({ error: "userId and banned required" }, { status: 400 });
  }
  if (body.userId === selfId) {
    return NextResponse.json({ error: "You cannot ban yourself." }, { status: 400 });
  }

  const authAdmin = createAdminSupabase();
  if (!authAdmin) {
    return NextResponse.json(
      { error: "Service key not configured." },
      { status: 500 },
    );
  }

  const { error } = await authAdmin.auth.admin.updateUserById(body.userId, {
    ban_duration: body.banned ? "876000h" : "none",
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await createAdminSupabase()!.from("verxa_activity").insert({
    actor: "admin",
    action: body.banned ? "user.auth_banned" : "user.auth_unbanned",
    detail: { userId: body.userId },
  });

  return NextResponse.json({ ok: true });
}
