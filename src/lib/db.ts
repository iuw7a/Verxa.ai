import type { Chat, MemoryItem, Personalization, Source } from "@/lib/types";

/**
 * Cloud sync for signed-in users. Guests stay on localStorage only.
 * All rows live in verxa_* tables protected by RLS (auth.uid() = owner).
 */

export type SyncChatsPayload = (Pick<Chat, "id" | "title" | "preview" | "createdAt" | "updatedAt"> & {
  messages: {
    id: string;
    role: string;
    content: string;
    sources?: Source[] | null;
    searchUnavailable?: boolean | null;
    createdAt: number;
  }[];
})[];

type DbMessageRow = {
  id: string;
  chat_id: string;
  role: string;
  content: string;
  sources: Source[] | null;
  search_unavailable: boolean | null;
  created_at: string;
};

type DbChatRow = {
  id: string;
  title: string;
  preview: string | null;
  created_at: string;
  updated_at: string;
};

type DbMemoryRow = {
  id: string;
  content: string;
  enabled: boolean | null;
  created_at: string;
};

export async function fetchCloudChats(
  supabase: NonNullable<ReturnType<typeof import("@/lib/supabase/client").createClient>>,
): Promise<Chat[]> {
  const { data: chatRows, error: chatErr } = await supabase
    .from("verxa_chats")
    .select("id,title,preview,created_at,updated_at")
    .order("updated_at", { ascending: false });
  if (chatErr) throw chatErr;
  if (!chatRows?.length) return [];

  const { data: messageRows, error: msgErr } = await supabase
    .from("verxa_messages")
    .select("id,chat_id,role,content,sources,search_unavailable,created_at")
    .order("created_at", { ascending: true });
  if (msgErr) throw msgErr;

  const byChat = new Map<string, Chat["messages"]>();
  for (const row of (messageRows ?? []) as unknown as DbMessageRow[]) {
    const list = byChat.get(row.chat_id) ?? [];
    list.push({
      id: row.id,
      role: row.role as Chat["messages"][number]["role"],
      content: row.content,
      sources: row.sources ?? undefined,
      searchUnavailable: row.search_unavailable ?? undefined,
      createdAt: new Date(row.created_at).getTime(),
    });
    byChat.set(row.chat_id, list);
  }

  return (chatRows as unknown as DbChatRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    preview: row.preview ?? "",
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    messages: byChat.get(row.id) ?? [],
  }));
}

export async function pushCloudChats(
  supabase: NonNullable<ReturnType<typeof import("@/lib/supabase/client").createClient>>,
  userId: string,
  chats: Chat[],
) {
  if (!chats.length) return;

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
      search_unavailable: m.searchUnavailable ?? null,
      created_at: new Date(m.createdAt).toISOString(),
    })),
  );

  const { error: chatErr } = await supabase
    .from("verxa_chats")
    .upsert(chatRows, { onConflict: "id" });
  if (chatErr) throw chatErr;

  if (messageRows.length) {
    // Upsert in chunks to stay under request size limits.
    for (let i = 0; i < messageRows.length; i += 200) {
      const { error } = await supabase
        .from("verxa_messages")
        .upsert(messageRows.slice(i, i + 200), { onConflict: "id" });
      if (error) throw error;
    }
  }
}

export async function fetchCloudMemories(
  supabase: NonNullable<ReturnType<typeof import("@/lib/supabase/client").createClient>>,
): Promise<MemoryItem[]> {
  const { data, error } = await supabase
    .from("verxa_memories")
    .select("id,content,enabled,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as DbMemoryRow[]).map((row) => ({
    id: row.id,
    content: row.content,
    enabled: row.enabled ?? true,
    createdAt: new Date(row.created_at).getTime(),
  }));
}

export async function pushCloudMemories(
  supabase: NonNullable<ReturnType<typeof import("@/lib/supabase/client").createClient>>,
  userId: string,
  memories: MemoryItem[],
) {
  if (!memories.length) return;
  const { error } = await supabase.from("verxa_memories").upsert(
    memories.map((m) => ({
      id: m.id,
      user_id: userId,
      content: m.content,
      enabled: m.enabled,
      created_at: new Date(m.createdAt).toISOString(),
    })),
    { onConflict: "id" },
  );
  if (error) throw error;
}

export async function pushCloudPersonalization(
  supabase: NonNullable<ReturnType<typeof import("@/lib/supabase/client").createClient>>,
  userId: string,
  personalization: Personalization,
) {
  const { error } = await supabase.from("verxa_personalization").upsert(
    {
      user_id: userId,
      custom_instructions: personalization.customInstructions,
      tone: personalization.tone,
      response_length: personalization.responseLength,
      personality: personalization.personality,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}
