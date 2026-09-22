import { NextResponse } from "next/server";
import { requireAdmin, createAdminSupabase } from "@/lib/admin";

export const runtime = "nodejs";

function dayKey(iso: string | null | undefined) {
  return iso ? iso.slice(0, 10) : null;
}

/** GET /api/admin/analytics — time series + funnel + delivery stats. */
export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const { admin } = guard;

  const since = new Date(Date.now() - 30 * 86400000).toISOString();

  const [chats, msgs, emails, profiles, authAdminRes] = await Promise.all([
    admin.from("verxa_chats").select("id,user_id,created_at").gte("created_at", since),
    admin.from("verxa_messages").select("id,chat_id,created_at").gte("created_at", since),
    admin
      .from("verxa_email_logs")
      .select("status,created_at")
      .gte("created_at", since),
    admin.from("verxa_profiles").select("id,display_name,email,plan"),
    Promise.resolve(createAdminSupabase()),
  ]);

  const { data: authUsers } = authAdminRes
    ? await authAdminRes.auth.admin.listUsers({ perPage: 500 })
    : { data: null };

  const signupDays = new Map<string, number>();
  const activeDays = new Map<string, Set<string>>();
  for (const u of authUsers?.users ?? []) {
    const d = dayKey(u.created_at);
    if (d) signupDays.set(d, (signupDays.get(d) ?? 0) + 1);
  }
  for (const u of authUsers?.users ?? []) {
    const d = dayKey(u.last_sign_in_at);
    if (d) {
      if (!activeDays.has(d)) activeDays.set(d, new Set());
      activeDays.get(d)!.add(u.id);
    }
  }

  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    days.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
  }

  const growth = days.map((d) => ({
    day: d,
    signups: signupDays.get(d) ?? 0,
    activeUsers: activeDays.get(d)?.size ?? 0,
  }));

  const chatDays = new Map<string, number>();
  for (const row of chats.data ?? []) {
    const d = dayKey(row.created_at);
    if (d) chatDays.set(d, (chatDays.get(d) ?? 0) + 1);
  }
  const msgDays = new Map<string, number>();
  for (const row of msgs.data ?? []) {
    const d = dayKey(row.created_at);
    if (d) msgDays.set(d, (msgDays.get(d) ?? 0) + 1);
  }
  const activity = days.map((d) => ({
    day: d,
    chats: chatDays.get(d) ?? 0,
    messages: msgDays.get(d) ?? 0,
  }));

  const sent = (emails.data ?? []).filter((e) => e.status === "sent").length;
  const failed = (emails.data ?? []).filter((e) => e.status === "failed").length;

  const { count: proCount } = await admin
    .from("verxa_profiles")
    .select("id", { count: "exact", head: true })
    .eq("plan", "pro");

  const totalUsers = authUsers?.users?.length ?? 0;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
  const signupsToday = (authUsers?.users ?? []).filter((u) => dayKey(u.created_at) === today).length;
  const signupsYesterday = (authUsers?.users ?? []).filter((u) => dayKey(u.created_at) === yesterday).length;
  const activeUsers7 = (authUsers?.users ?? []).filter((u) => u.last_sign_in_at && new Date(u.last_sign_in_at).getTime() >= Date.now() - 7 * 86400000).length;
  const activeUsers30 = (authUsers?.users ?? []).filter((u) => u.last_sign_in_at && new Date(u.last_sign_in_at).getTime() >= Date.now() - 30 * 86400000).length;
  const chatOwners = new Map<string, string>();
  for (const chat of chats.data ?? []) {
    if (chat.user_id) chatOwners.set(chat.id, chat.user_id);
  }
  const activityByUser = new Map<string, number>();
  for (const message of msgs.data ?? []) {
    const owner = chatOwners.get(message.chat_id);
    if (owner) activityByUser.set(owner, (activityByUser.get(owner) ?? 0) + 1);
  }
  const profileById = new Map((profiles.data ?? []).map((profile) => [profile.id, profile]));
  const topUsers = [...activityByUser.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, messageCount]) => ({
      id,
      name: profileById.get(id)?.display_name || profileById.get(id)?.email || authUsers?.users.find((u) => u.id === id)?.email || "Unknown user",
      messageCount,
    }));
  const planDistribution = (profiles.data ?? []).reduce<Record<string, number>>((counts, profile) => {
    const plan = profile.plan || "free";
    counts[plan] = (counts[plan] ?? 0) + 1;
    return counts;
  }, {});
  const messagesToday = (msgs.data ?? []).filter((row) => dayKey(row.created_at) === today).length;
  const chatsToday = (chats.data ?? []).filter((row) => dayKey(row.created_at) === today).length;
  const weekAgo = Date.now() - 7 * 86400000;
  const newThisWeek =
    authUsers?.users?.filter((u) => new Date(u.created_at).getTime() > weekAgo)
      .length ?? 0;

  return NextResponse.json({
    growth,
    activity,
    emailDelivery: { sent, failed, rate: sent + failed ? sent / (sent + failed) : null },
    funnel: {
      visitors: null,
      signups: totalUsers,
      pro: proCount ?? 0,
    },
    summary: {
      totalUsers,
      newThisWeek,
      proSubscriptions: proCount ?? 0,
    },
    monitoring: {
      activeUsers7,
      activeUsers30,
      signupsToday,
      signupsYesterday,
      chatsToday,
      messagesToday,
      averageMessagesPerChat: chats.data?.length ? Number(((msgs.data?.length ?? 0) / chats.data.length).toFixed(1)) : 0,
      topUsers,
      planDistribution,
      latencyMs: null,
      apiCostUsd: null,
      serverLoad: null,
      errorRate: null,
      uptime: null,
      geography: null,
      deviceSplit: null,
    },
  });
}
