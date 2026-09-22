import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

/** GET /api/admin/chats?userId=… — all chats (+message counts), newest first. */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const { admin } = guard;

  const userId = req.nextUrl.searchParams.get("userId");

  let query = admin
    .from("verxa_chats")
    .select(
      "id,user_id,title,preview,created_at,updated_at,verxa_messages(count)",
    )
    .order("updated_at", { ascending: false })
    .limit(200);
  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const chats = (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    userId: row.user_id as string | null,
    title: row.title as string,
    preview: (row.preview as string) ?? "",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    messageCount:
      (row.verxa_messages as { count: number }[] | null)?.[0]?.count ?? 0,
  }));

  return NextResponse.json({ chats });
}

/** DELETE /api/admin/chats?id=… — delete a chat and its messages (cascade). */
export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const { admin } = guard;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { error } = await admin.from("verxa_chats").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
