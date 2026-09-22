import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import { resolveDesktopUser } from "@/lib/desktop";

export const runtime = "nodejs";

type ChatRow = {
  id: string;
  title: string | null;
  preview: string | null;
  created_at: string;
  updated_at: string;
};
type MessageRow = {
  id: string;
  chat_id: string;
  role: string;
  content: string;
  sources: unknown;
  search_unavailable: boolean | null;
  created_at: string;
};

/**
 * GET /api/desktop/sync — full pull for the desktop client:
 * chats + messages + memories + personalization + plan.
 * Auth: desktop session token OR Supabase session.
 */
export async function GET(req: NextRequest) {
  const ctx = await resolveDesktopUser(req);
  if (!ctx) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const admin = createAdminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "Service not configured." }, { status: 500 });
  }

  const [chats, messages, memories, personalization, sub, profile] =
    await Promise.all([
      admin
        .from("verxa_chats")
        .select("id,title,preview,created_at,updated_at")
        .eq("user_id", ctx.userId)
        .order("updated_at", { ascending: false })
        .limit(500),
      admin
        .from("verxa_messages")
        .select("id,chat_id,role,content,sources,search_unavailable,created_at")
        .in(
          "chat_id",
          (
            await admin
              .from("verxa_chats")
              .select("id")
              .eq("user_id", ctx.userId)
              .limit(2000)
          ).data?.map((c: { id: string }) => c.id) ?? ["__none__"],
        )
        .order("created_at", { ascending: true })
        .limit(5000),
      admin.from("verxa_memories").select("id,content,enabled,created_at").eq("user_id", ctx.userId),
      admin
        .from("verxa_personalization")
        .select("custom_instructions,tone,response_length,personality")
        .eq("user_id", ctx.userId)
        .maybeSingle(),
      admin
        .from("verxa_subscriptions")
        .select("plan,status")
        .eq("user_id", ctx.userId)
        .eq("status", "active")
        .maybeSingle(),
      admin
        .from("verxa_profiles")
        .select("display_name,username,email,avatar_url")
        .eq("id", ctx.userId)
        .maybeSingle(),
    ]);

  return NextResponse.json({
    chats: (chats.data ?? []) as ChatRow[],
    messages: (messages.data ?? []) as MessageRow[],
    memories: memories.data ?? [],
    personalization: personalization.data ?? null,
    plan: (sub.data as { plan?: string } | null)?.plan === "pro" ? "pro" : "free",
    profile: profile.data ?? null,
    serverTime: new Date().toISOString(),
  });
}

/**
 * POST /api/desktop/sync — push chats + messages from the desktop.
 * Upserts are strictly scoped to the caller's user_id (verified ownership
 * of every chat id before writing its messages). No deletes via sync.
 */
export async function POST(req: NextRequest) {
  const ctx = await resolveDesktopUser(req);
  if (!ctx) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const admin = createAdminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "Service not configured." }, { status: 500 });
  }

  const body = (await req.json().catch(() => null)) as {
    chats?: { id?: string; title?: string; preview?: string; updated_at?: string }[];
    messages?: {
      id?: string;
      chat_id?: string;
      role?: string;
      content?: string;
      sources?: unknown;
      search_unavailable?: boolean;
    }[];
  } | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const chats = (body.chats ?? []).slice(0, 500);
  const messages = (body.messages ?? []).slice(0, 2000);

  // 1) Upsert chats (force ownership to the caller).
  const chatIds = new Set<string>();
  if (chats.length) {
    const rows = chats
      .filter((c) => typeof c.id === "string" && c.id.length < 120)
      .map((c) => ({
        id: c.id as string,
        user_id: ctx.userId,
        title: (c.title ?? "New chat").slice(0, 200),
        preview: (c.preview ?? "").slice(0, 500),
        updated_at: c.updated_at ?? new Date().toISOString(),
      }));
    for (const c of rows) chatIds.add(c.id);
    if (rows.length) {
      const { error } = await admin
        .from("verxa_chats")
        .upsert(rows, { onConflict: "id" });
      if (error) {
        return NextResponse.json({ error: "Chat sync failed." }, { status: 500 });
      }
    }
  }

  // 2) Verify ownership of ALL referenced chats (pushed + pre-existing),
  //    then upsert only messages belonging to owned chats.
  const referenced = new Set<string>();
  for (const m of messages) {
    if (typeof m.chat_id === "string") referenced.add(m.chat_id);
  }
  const ownedIds = chatIds;  const missing = [...referenced].filter((id) => !ownedIds.has(id));
  if (missing.length) {
    const { data } = await admin
      .from("verxa_chats")
      .select("id")
      .eq("user_id", ctx.userId)
      .in("id", missing.slice(0, 500));
    for (const r of (data ?? []) as { id: string }[]) ownedIds.add(r.id);
  }

  let written = 0;
  const validRoles = new Set(["user", "assistant", "system"]);
  const msgRows = messages
    .filter(
      (m) =>
        typeof m.id === "string" &&
        m.id.length < 120 &&
        typeof m.chat_id === "string" &&
        ownedIds.has(m.chat_id) &&
        typeof m.role === "string" &&
        validRoles.has(m.role) &&
        typeof m.content === "string" &&
        m.content.length <= 200000,
    )
    .map((m) => ({
      id: m.id as string,
      chat_id: m.chat_id as string,
      role: m.role as string,
      content: m.content as string,
      sources: m.sources ?? null,
      search_unavailable: Boolean(m.search_unavailable),
    }));
  if (msgRows.length) {
    // Chunked upserts (mirrors web client behavior).
    for (let i = 0; i < msgRows.length; i += 200) {
      const chunk = msgRows.slice(i, i + 200);
      const { error } = await admin
        .from("verxa_messages")
        .upsert(chunk, { onConflict: "id" });
      if (error) {
        return NextResponse.json({ error: "Message sync failed." }, { status: 500 });
      }
      written += chunk.length;
    }
  }

  return NextResponse.json({ ok: true, chats: chatIds.size, messages: written });
}
