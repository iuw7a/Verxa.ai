import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { buildAiSystemPrompt } from "@/lib/ai/system";
import {
  isImageDataUrl,
  streamAiCompletion,
  type AiChatMessage,
} from "@/lib/ai/xkiro-server";

export const runtime = "nodejs";
export const maxDuration = 120;

type Incoming = {
  role: "user" | "assistant";
  content: string;
  /** Optional image data-URLs attached to a user message. */
  images?: string[];
};

function encodeEvent(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

/** Server-side enabled memories for the signed-in user (empty for guests). */
async function loadServerMemories(): Promise<{ memories: string[]; name: string | null }> {
  try {
    const supabase = await createServerSupabase();
    if (!supabase) return { memories: [], name: null };
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { memories: [], name: null };
    const [{ data: memRows }, { data: profile }] = await Promise.all([
      supabase
        .from("verxa_memories")
        .select("content")
        .eq("enabled", true)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("verxa_profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle(),
    ]);
    return {
      memories: ((memRows ?? []) as { content: string }[]).map((r) => r.content),
      name:
        ((profile as { display_name?: string } | null)?.display_name ?? null) ||
        (user.user_metadata?.full_name as string | undefined) ||
        user.email?.split("@")[0] ||
        null,
    };
  } catch {
    return { memories: [], name: null };
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    messages?: Incoming[];
    /** Guest/local memories (signed-in users get server memories too). */
    memories?: string[];
  } | null;

  const incoming = body?.messages?.filter((m) => m.content?.trim() || m.images?.length) ?? [];
  if (!incoming.length) {
    return new Response(JSON.stringify({ error: "Message required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  // Keep the window bounded for mobile latency.
  const windowed = incoming.slice(-20);

  const { memories: serverMemories, name } = await loadServerMemories();
  const clientMemories = (body?.memories ?? []).filter(Boolean).slice(0, 50);
  const seen = new Set<string>();
  const memories = [...serverMemories, ...clientMemories].filter((m) =>
    seen.has(m) ? false : (seen.add(m), true),
  );

  const system = buildAiSystemPrompt({
    memories,
    displayName: name,
    today: new Date().toISOString().slice(0, 10),
  });

  const messages: AiChatMessage[] = [{ role: "system", content: system }];
  for (const m of windowed) {
    if (m.role === "assistant" || !m.images?.length) {
      messages.push({ role: m.role, content: m.content });
      continue;
    }
    const parts: AiChatMessage["content"] = [];
    if (m.content.trim()) parts.push({ type: "text", text: m.content });
    for (const url of m.images.filter(isImageDataUrl).slice(0, 4)) {
      parts.push({ type: "image_url", image_url: { url } });
    }
    if (!parts.length) continue;
    messages.push({ role: "user", content: parts });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) =>
        controller.enqueue(encoder.encode(encodeEvent(payload)));
      try {
        send({ type: "status", value: "thinking" });
        const model = await streamAiCompletion(messages, {
          signal: req.signal,
          onDelta: (text) => {
            send({ type: "status", value: "streaming" });
            send({ type: "delta", text });
          },
        });
        send({ type: "model", id: model, memoriesUsed: memories.length });
        send({ type: "done" });
        controller.close();
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          send({ type: "done" });
          controller.close();
          return;
        }
        console.error("[ai/chat]", error instanceof Error ? error.message : error);
        send({
          type: "error",
          message:
            error instanceof Error && error.message.includes("XKIRO_API_KEY")
              ? "The AI service is not configured. Please try again later."
              : "The AI could not complete this request. Please try again.",
        });
        send({ type: "done" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
