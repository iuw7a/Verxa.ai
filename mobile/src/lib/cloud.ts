import { supabase } from "./supabase";
import type { Chat, ChatMessage } from "./store";

/**
 * Cloud chat sync — uses the exact same Supabase tables as the web app
 * (verxa_chats / verxa_messages, RLS per user), so history is shared
 * between verxa.de and the mobile app for the same account.
 */

type DbMessageRow = {
  id: string;
  chat_id: string;
  role: string;
  content: string;
  sources: { title: string; url: string }[] | null;
  search_unavailable: boolean | null;
  created_at: string;
};

export async function fetchCloudChats(): Promise<Chat[]> {
  if (!supabase) return [];
  const { data: chatRows, error } = await supabase
    .from("verxa_chats")
    .select("id,title,preview,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  if (!chatRows?.length) return [];

  const { data: messageRows, error: msgErr } = await supabase
    .from("verxa_messages")
    .select("id,chat_id,role,content,sources,search_unavailable,created_at")
    .order("created_at", { ascending: true })
    .limit(2000);
  if (msgErr) throw msgErr;

  const byChat = new Map<string, ChatMessage[]>();
  for (const row of (messageRows ?? []) as unknown as DbMessageRow[]) {
    const list = byChat.get(row.chat_id) ?? [];
    list.push({
      id: row.id,
      role: row.role === "user" ? "user" : "assistant",
      content: row.content,
      sources: row.sources ?? undefined,
      createdAt: new Date(row.created_at).getTime(),
    });
    byChat.set(row.chat_id, list);
  }

  return (chatRows as unknown as Record<string, string>[]).map((row) => ({
    id: row.id,
    title: row.title,
    preview: row.preview ?? "",
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    messages: byChat.get(row.id) ?? [],
  }));
}

export async function pushCloudChats(chats: Chat[]): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.auth.getUser();
  const userId = data?.user?.id;
  if (!userId || chats.length === 0) return;

  const chatRows = chats.map((c) => ({
    id: c.id,
    user_id: userId,
    title: c.title,
    preview: c.preview,
    created_at: new Date(c.createdAt).toISOString(),
    updated_at: new Date(c.updatedAt).toISOString(),
  }));

  const messageRows = chats.flatMap((c) =>
    c.messages.map((m) => ({
      id: m.id,
      chat_id: c.id,
      role: m.role,
      content: m.content,
      sources: m.sources ?? null,
      created_at: new Date(m.createdAt).toISOString(),
    })),
  );

  const { error: chatErr } = await supabase
    .from("verxa_chats")
    .upsert(chatRows, { onConflict: "id" });
  if (chatErr) throw chatErr;

  for (let i = 0; i < messageRows.length; i += 200) {
    const { error } = await supabase
      .from("verxa_messages")
      .upsert(messageRows.slice(i, i + 200), { onConflict: "id" });
    if (error) throw error;
  }
}

/** Merge cloud + local by id, newest updatedAt wins. */
export function mergeChats(local: Chat[], cloud: Chat[]): Chat[] {
  const byId = new Map<string, Chat>();
  for (const c of local) byId.set(c.id, c);
  for (const c of cloud) {
    const existing = byId.get(c.id);
    if (!existing || c.updatedAt > existing.updatedAt) byId.set(c.id, c);
  }
  return [...byId.values()]
    .filter((c) => c.messages.length > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
