import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { browserAgentEnabled } from "@/lib/browser-agent/browser";
import { createBrowserSession, closeBrowserSession } from "@/lib/browser-agent/session";
import { runBrowserBatch } from "@/lib/browser-agent/run-batch";
import { runBrowserAgent } from "@/lib/browser-agent/loop";
import { detectBrowserAgentRequest } from "@/lib/browser-agent/detect";

export const runtime = "nodejs";
export const maxDuration = 300;

function normalizeBaseUrl(raw: string) {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (/\/v\d+$/.test(trimmed)) return trimmed;
  return `${trimmed}/v1`;
}

/**
 * POST /api/tools/browser-agent
 * Body: { goal: string, url?: string, maxRounds?: number }
 * Spins up an E2B Chromium, lets the LLM drive it (goto/click/type/read),
 * returns the final answer + visited URL + screenshots.
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return NextResponse.json({ error: "Sign in to use the browser agent." }, { status: 401 });
    }
  }
  if (!browserAgentEnabled()) {
    return NextResponse.json(
      { error: "Browser agent is not configured (E2B_API_KEY missing)." },
      { status: 503 },
    );
  }

  let body: { goal?: string; url?: string; maxRounds?: number };
  try {
    body = (await req.json()) as { goal?: string; url?: string; maxRounds?: number };
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }
  const goal = typeof body.goal === "string" ? body.goal.trim().slice(0, 1000) : "";
  if (goal.length < 3) {
    return NextResponse.json({ error: "Describe what the browser should do." }, { status: 400 });
  }
  const explicit = typeof body.url === "string" ? body.url.trim() : "";
  const detected = detectBrowserAgentRequest(`${goal} ${explicit}`);
  let startUrl = explicit;
  try {
    if (startUrl) void new URL(startUrl);
    else if (detected) startUrl = detected.startUrl;
  } catch {
    return NextResponse.json({ error: "Start URL must be a valid http(s) URL." }, { status: 400 });
  }
  if (!startUrl) {
    return NextResponse.json(
      { error: "Give the browser a page to open (URL in your message)." },
      { status: 400 },
    );
  }
  const maxRounds = Math.max(1, Math.min(6, body.maxRounds ?? 3));

  const apiKey =
    process.env.NVIDIA_API_KEY?.trim() || process.env.XKIRO_API_KEY?.trim() || undefined;
  const baseUrl = normalizeBaseUrl(
    process.env.NVIDIA_API_KEY?.trim()
      ? (process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1")
      : (process.env.XKIRO_BASE_URL ?? "https://api.xkiro.com/v1"),
  );
  const model = process.env.NVIDIA_MODEL?.trim() || "openai/gpt-oss-20b";
  if (!apiKey) {
    return NextResponse.json({ error: "Chat model is not configured." }, { status: 500 });
  }

  const llmCall = async (prompt: string): Promise<string> => {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You drive a headless Chromium. Output EXACTLY ONE JSON object per turn. Never browse login pages, never enter credentials, never submit payments.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 600,
        stream: false,
      }),
    });
    if (!res.ok) throw new Error(`LLM failed (${res.status})`);
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return j.choices?.[0]?.message?.content ?? '{"actions":[{"type":"read"}]}';
  };

  let session: Awaited<ReturnType<typeof createBrowserSession>> | null = null;
  try {
    session = await createBrowserSession();
    if (!session.ready) {
      return NextResponse.json(
        { error: session.readyError ?? "Browser sandbox failed to start." },
        { status: 502 },
      );
    }
    const live = session;
    const outcome = await runBrowserAgent({
      goal,
      startUrl,
      maxRounds,
      llmCall,
      execBatch: (actions) => runBrowserBatch(live, startUrl, actions),
    });
    return NextResponse.json({
      answer: outcome.answer,
      url: outcome.finalUrl,
      done: outcome.done,
      rounds: outcome.steps.length,
      steps: outcome.steps.map((s) => ({
        actions: s.actions,
        url: s.observation.finalUrl,
        title: s.observation.finalTitle,
        ok: !s.observation.error,
      })),
      screenshot: outcome.steps[outcome.steps.length - 1]?.observation.screenshot ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message.slice(0, 300) : "Browser agent failed." },
      { status: 500 },
    );
  } finally {
    if (session) await closeBrowserSession(session);
  }
}
