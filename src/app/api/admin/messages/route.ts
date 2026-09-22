import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

/** GET /api/admin/messages?chatId=… — full message history of a chat. */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const { admin } = guard;

  const chatId = req.nextUrl.searchParams.get("chatId");
  if (!chatId) {
    return NextResponse.json({ error: "chatId required" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("verxa_messages")
    .select("id,chat_id,role,content,sources,search_unavailable,created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ messages: data ?? [] });
}

/** PATCH /api/admin/messages — { id, content } to edit a message. */
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const { admin } = guard;

  const body = (await req.json().catch(() => null)) as {
    id?: string;
    content?: string;
  } | null;
  if (!body?.id || typeof body.content !== "string") {
    return NextResponse.json(
      { error: "id and content required" },
      { status: 400 },
    );
  }

  const { error } = await admin
    .from("verxa_messages")
    .update({ content: body.content })
    .eq("id", body.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** DELETE /api/admin/messages?id=… */
export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const { admin } = guard;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { error } = await admin.from("verxa_messages").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
