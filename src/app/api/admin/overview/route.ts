import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, createAdminSupabase } from "@/lib/admin";

export const runtime = "nodejs";

/** GET /api/admin/overview — stats + user list. */
export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const { admin: dbAdmin } = guard;

  const [chats, messages, memories, profiles] = await Promise.all([
    dbAdmin.from("verxa_chats").select("id", { count: "exact", head: true }),
    dbAdmin.from("verxa_messages").select("id", { count: "exact", head: true }),
    dbAdmin.from("verxa_memories").select("id", { count: "exact", head: true }),
    dbAdmin
      .from("verxa_profiles")
      .select("id,display_name,username,email,created_at")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  // Auth users come from the Admin API (service client).
  const authAdmin = createAdminSupabase();
  const { data: authUsers } = authAdmin
    ? await authAdmin.auth.admin.listUsers({ perPage: 200 })
    : { data: null };

  const users = (authUsers?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "",
    name:
      (profiles.data ?? []).find((p) => p.id === u.id)?.display_name ||
      (u.user_metadata?.full_name as string | undefined) ||
      "",
    createdAt: u.created_at,
    lastSignIn: u.last_sign_in_at,
    confirmed: Boolean(u.email_confirmed_at),
  }));

  const totals = {
    users: users.length,
    chats: chats.count ?? 0,
    messages: messages.count ?? 0,
    memories: memories.count ?? 0,
  };

  return NextResponse.json({ totals, users });
}

/** DELETE /api/admin/overview?userId=… — delete a user and all their data. */
export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const { userId: selfId } = guard;

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  if (userId === selfId) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 400 },
    );
  }

  const authAdmin = createAdminSupabase();
  if (!authAdmin) {
    return NextResponse.json(
      { error: "Service key not configured." },
      { status: 500 },
    );
  }

  // DB rows cascade via foreign keys; this removes the auth user too.
  const { error } = await authAdmin.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
