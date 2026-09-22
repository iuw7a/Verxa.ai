import { createServerSupabase } from "@/lib/supabase/server";
import { parseCodeMessageInput } from "@/lib/code-types";
import { moderatePrompt, runCodeAgent } from "@/lib/code-agent/agent";
import { syncProjectToSandbox } from "@/lib/code-agent/sandbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function encodeEvent(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

/**
 * POST /api/code/agent — runs the coding agent for a project and streams
 * SSE events: status, delta, tool_call, file_written, provider_fallback,
 * blocked, error, done. Persists user + assistant messages.
 */
export async function POST(req: Request) {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const { projectId, content } = (body ?? {}) as { projectId?: unknown; content?: unknown };
  if (typeof projectId !== "string" || !projectId) {
    return Response.json({ error: "projectId is required." }, { status: 400 });
  }
  const parsed = parseCodeMessageInput({ content });
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const supabase = await createServerSupabase();
  if (!supabase) return Response.json({ error: "Service unavailable." }, { status: 503 });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return Response.json({ error: "Sign in to build." }, { status: 401 });

  const { data: project } = await supabase
    .from("verxa_code_projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });

  // Persist the user message first so history survives disconnects.
  const { error: userMsgError } = await supabase.from("verxa_code_messages").insert({
    project_id: projectId,
    role: "user",
    content: parsed.content,
  });
  if (userMsgError) {
    console.error("[code/agent] user message insert failed:", userMsgError);
    return Response.json({ error: "Could not save message." }, { status: 500 });
  }

  const { data: historyRows } = await supabase
    .from("verxa_code_messages")
    .select("role,content")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })
    .limit(20);
  const history = (((historyRows ?? []) as { role: string; content: string }[]) || [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  await supabase.from("verxa_code_projects").update({ status: "building" }).eq("id", projectId);

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => controller.enqueue(new TextEncoder().encode(encodeEvent(payload)));
      let assistantText = "";
      let failed = false;

      try {
        // Moderation gate — generic refusal, never echoes trigger words.
        send({ type: "status", text: "Checking request…" });
        const { blocked } = await moderatePrompt(parsed.content);
        if (blocked) {
          try {
            await supabase.from("verxa_code_messages").insert({
              project_id: projectId,
              role: "assistant",
              content: "This request can't be processed. Try describing a different app or feature.",
            });
          } catch { /* history best-effort */ }
          send({ type: "blocked", message: "This request can't be processed. Try describing a different app or feature." });
          send({ type: "done", filesChanged: 0 });
          controller.close();
          await supabase.from("verxa_code_projects").update({ status: "draft" }).eq("id", projectId);
          return;
        }

        for await (const event of runCodeAgent({
          db: supabase,
          projectId,
          userText: parsed.content,
          history: history.slice(0, -1), // current message is passed separately
          signal: req.signal,
        })) {
          if (event.type === "delta") assistantText += event.text;
          if (event.type === "error") failed = true;
          send(event);
        }

        // Live preview: after a successful run, boot the project in an E2B
        // cloud sandbox and hand the client a real, working URL.
        if (!failed) {
          try {
            send({ type: "status", text: "Starting live preview…" });
            const preview = await syncProjectToSandbox(supabase, projectId, { signal: req.signal });
            if (preview && "url" in preview) {
              send({ type: "preview_ready", url: preview.url });
            } else if (preview && "error" in preview) {
              console.error("[code/agent] preview failed:", preview.error);
            }
          } catch (e) {
            console.error("[code/agent] preview crashed:", e instanceof Error ? e.message : String(e));
          }
        }

        if (assistantText.trim()) {
          try {
            await supabase.from("verxa_code_messages").insert({
              project_id: projectId,
              role: "assistant",
              content: assistantText.slice(0, 8000),
            });
          } catch (e) {
            console.error("[code/agent] assistant message insert failed:", e instanceof Error ? e.message : String(e));
          }
        }
        await supabase
          .from("verxa_code_projects")
          .update({ status: failed ? "error" : "ready", updated_at: new Date().toISOString() })
          .eq("id", projectId);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          send({ type: "done", filesChanged: 0 });
          controller.close();
          return;
        }
        console.error("[code/agent] stream failed:", error instanceof Error ? error.message : String(error));
        send({ type: "error", message: "Something went wrong while generating. Your message is saved — try again." });
        send({ type: "done", filesChanged: 0 });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
