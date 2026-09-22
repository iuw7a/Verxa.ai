import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { browserAgentEnabled } from "@/lib/browser-agent/browser";
import { createBrowserSession, closeBrowserSession } from "@/lib/browser-agent/session";
import { runBrowserUseAgent, type BrowserUseStep } from "@/lib/browser-agent/run-stream";
import { resolveStartUrl } from "@/lib/browser-agent/resolve";
import type { AgentToolEvent } from "@/lib/browser-agent/events";

export const runtime = "nodejs";
export const maxDuration = 300;

function normalizeBaseUrl(raw: string) {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (/\/v\d+$/.test(trimmed)) return trimmed;
  return `${trimmed}/v1`;
}

function encode(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

/** Maps a real browser-use action to the matching UI event type. */
function eventForStep(step: BrowserUseStep): AgentToolEvent {
  const at = new Date().toISOString();
  const a = (step.action ?? "").toLowerCase();
  const base = {
    at,
    label: humanizeStep(step),
    detail: step.detail?.slice(0, 300) ?? null,
    url: step.url,
    title: step.title,
    screenshot: step.screenshot,
  };
  if (/navigat|goto|open.*url|go_to_url/.test(a)) return { ...base, type: "browser.navigating" };
  if (/click|tap/.test(a)) return { ...base, type: "browser.clicked" };
  if (/type|input|fill|send_keys/.test(a)) return { ...base, type: "browser.typing" };
  if (/scroll/.test(a)) return { ...base, type: "browser.scrolling" };
  if (/wait/.test(a)) return { ...base, type: "browser.waiting" };
  if (/back/.test(a)) return { ...base, type: "browser.Back" };
  if (/forward/.test(a)) return { ...base, type: "browser.forward" };
  if (/screenshot/.test(a)) return { ...base, type: "browser.screenshot" };
  if (/done|finish|complete/.test(a)) return { ...base, type: "browser.completed" };
  return { ...base, type: "browser.reading" };
}

function humanizeStep(step: BrowserUseStep): string {
  const raw = step.action ?? "";
  // browser-use actions look like {"click": {"index": 12}} — shorten it.
  const short = raw.length > 140 ? `${raw.slice(0, 140)}…` : raw;
  if (step.title && /navigat|goto/.test(raw.toLowerCase())) {
    return `Navigating — ${step.title}`;
  }
  if (/click/.test(raw.toLowerCase())) return `Clicked on the page${step.title ? ` — ${step.title}` : ""}`;
  if (/type|input|fill/.test(raw.toLowerCase())) return "Typed into the page";
  if (/scroll/.test(raw.toLowerCase())) return "Scrolled the page";
  if (/extract/.test(raw.toLowerCase())) return `Reading ${step.title || "the page"}`;
  if (short && short !== "step") return short;
  return step.title ? `Reading ${step.title}` : "Working in the browser";
}

/**
 * POST /api/tools/browser-agent/stream — SSE edition, powered by the
 * open-source browser-use Agent running in an E2B Chromium sandbox.
 * Emits one `event` per real agent step (with real screenshots), then `done`.
 * Body: { goal, url?, maxRounds? } (maxRounds caps browser-use max_steps)
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return new Response(JSON.stringify({ error: "Sign in to use the browser agent." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
  if (!browserAgentEnabled()) {
    return new Response(JSON.stringify({ error: "Browser agent is not configured (E2B_API_KEY missing)." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { goal?: string; url?: string; maxRounds?: number };
  try {
    body = (await req.json()) as { goal?: string; url?: string; maxRounds?: number };
  } catch {
    return new Response(JSON.stringify({ error: "Body must be JSON." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const goal = typeof body.goal === "string" ? body.goal.trim().slice(0, 1000) : "";
  if (goal.length < 3) {
    return new Response(JSON.stringify({ error: "Describe what the browser should do." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const startUrl = resolveStartUrl(goal, typeof body.url === "string" ? body.url : "");
  if (!startUrl) {
    return new Response(JSON.stringify({ error: "Give the browser a page to open (URL in your message)." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  // browser-use max_steps (each step = observe + act + screenshot).
  const maxSteps = Math.max(2, Math.min(10, body.maxRounds ?? 6));

  const apiKey =
    process.env.NVIDIA_API_KEY?.trim() || process.env.XKIRO_API_KEY?.trim() || undefined;
  const baseUrl = normalizeBaseUrl(
    process.env.NVIDIA_API_KEY?.trim()
      ? (process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1")
      : (process.env.XKIRO_BASE_URL ?? "https://api.xkiro.com/v1"),
  );
  const model = process.env.NVIDIA_MODEL?.trim() || "openai/gpt-oss-20b";
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Chat model is not configured." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => controller.enqueue(encoder.encode(encode(payload)));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let session: any = null;
      try {
        const at = () => new Date().toISOString();
        send({ type: "event", event: { type: "agent.started", at: at(), label: "Starting browser task", detail: goal } satisfies AgentToolEvent });
        send({ type: "event", event: { type: "browser.started", at: at(), label: `Opening ${startUrl}`, url: startUrl } satisfies AgentToolEvent });

        session = await createBrowserSession();
        if (!session.ready) {
          send({ type: "event", event: { type: "browser.error", at: at(), label: "Browser interaction failed", detail: session.readyError ?? "Browser sandbox failed to start." } satisfies AgentToolEvent });
          send({ type: "error", message: session.readyError ?? "Browser sandbox failed to start." });
          controller.close();
          return;
        }

        send({ type: "event", event: { type: "agent.thinking", at: at(), label: "browser-use agent is planning the task", url: startUrl } satisfies AgentToolEvent });

        const outcome = await runBrowserUseAgent(session, {
          task: goal,
          startUrl,
          llm: { baseUrl, apiKey, model },
          maxSteps,
          signal: req.signal,
          onStep: (step) => {
            try {
              send({ type: "event", event: eventForStep(step) });
            } catch { /* client gone */ }
          },
        });

        if (outcome.error) {
          send({ type: "event", event: { type: "browser.error", at: at(), label: "Browser interaction failed", detail: outcome.error, url: outcome.url } satisfies AgentToolEvent });
          send({ type: "error", message: outcome.error });
          controller.close();
          return;
        }
        const answer = outcome.answer || "The browser session ended without a result.";
        send({ type: "event", event: { type: "browser.completed", at: at(), label: "Finished browsing", url: outcome.url } satisfies AgentToolEvent });
        send({ type: "event", event: { type: "agent.completed", at: at(), label: "Task complete", detail: answer.slice(0, 500), url: outcome.url } satisfies AgentToolEvent });
        send({ type: "done", answer, url: outcome.url, done: outcome.done });
        controller.close();
      } catch (e) {
        if ((e as Error).name === "AbortError" || req.signal.aborted) {
          try {
            send({ type: "error", message: "Stopped." });
            controller.close();
          } catch { /* closed */ }
          return;
        }
        const message = e instanceof Error ? e.message.slice(0, 300) : "Browser agent failed.";
        try {
          send({ type: "event", event: { type: "browser.error", at: new Date().toISOString(), label: "Browser interaction failed", detail: message } satisfies AgentToolEvent });
          send({ type: "error", message });
          controller.close();
        } catch { /* closed */ }
      } finally {
        if (session) await closeBrowserSession(session);
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
