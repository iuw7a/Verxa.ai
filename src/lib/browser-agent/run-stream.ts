import "server-only";

import type { BrowserSession } from "@/lib/browser-agent/browser";

export type BrowserUseStep = {
  url: string | null;
  title: string | null;
  action: string | null;
  detail: string | null;
  screenshot: string | null;
};

export type BrowserUseOutcome = {
  answer: string;
  url: string;
  done: boolean;
  error: string | null;
};

/**
 * Runs the browser-use Agent inside the sandbox (bu_runner.py) and streams
 * real per-step observations via onStep. The runner prints VERXA_JSON lines;
 * all other library log noise is ignored.
 */
export async function runBrowserUseAgent(
  session: BrowserSession,
  opts: {
    task: string;
    startUrl: string;
    llm: { baseUrl: string; apiKey: string; model: string };
    maxSteps: number;
    onStep: (step: BrowserUseStep) => void;
    signal?: AbortSignal;
  },
): Promise<BrowserUseOutcome> {
  const payload = JSON.stringify({
    task: opts.task,
    start_url: opts.startUrl,
    llm: {
      base_url: opts.llm.baseUrl,
      api_key: opts.llm.apiKey,
      model: opts.llm.model,
    },
    max_steps: opts.maxSteps,
  });
  const cmd = `python3 /home/user/bu_agent_runner.py <<'VERXA_EOF'\n${payload}\nVERXA_EOF`;

  let buffer = "";
  let final: BrowserUseOutcome | null = null;

  const handleLine = (line: string) => {
    const idx = line.indexOf("VERXA_JSON:");
    if (idx < 0) return;
    try {
      const obj = JSON.parse(line.slice(idx + "VERXA_JSON:".length)) as Record<string, unknown>;
      if (obj.kind === "step") {
        const shot = typeof obj.screenshot === "string" ? obj.screenshot : null;
        opts.onStep({
          url: typeof obj.url === "string" ? obj.url : null,
          title: typeof obj.title === "string" ? obj.title : null,
          action: typeof obj.action === "string" ? obj.action : null,
          detail: typeof obj.detail === "string" ? obj.detail : null,
          screenshot: shot && shot.startsWith("data:") ? shot : null,
        });
      } else if (obj.kind === "done") {
        final = {
          answer: typeof obj.answer === "string" ? obj.answer : "Done.",
          url: typeof obj.url === "string" ? obj.url : opts.startUrl,
          done: true,
          error: null,
        };
      } else if (obj.kind === "error") {
        final = {
          answer: "",
          url: opts.startUrl,
          done: false,
          error: typeof obj.message === "string" ? obj.message : "Browser agent failed.",
        };
      }
    } catch {
      /* ignore malformed lines */
    }
  };

  const onData = (data: string) => {
    buffer += data;
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    for (const p of parts) handleLine(p);
  };

  const kill = () => {
    void session.sandbox.kill().catch(() => undefined);
  };
  opts.signal?.addEventListener("abort", kill, { once: true });

  try {
    await session.sandbox.commands.run(cmd, {
      requestTimeoutMs: 280000,
      timeoutMs: 280000,
      onStdout: onData,
      onStderr: onData,
    });
    if (buffer.trim()) handleLine(buffer);
  } catch (e) {
    if ((e as Error)?.name === "AbortError" || opts.signal?.aborted) {
      return { answer: "", url: opts.startUrl, done: false, error: "Stopped." };
    }
    const msg = e instanceof Error ? e.message.slice(0, 300) : "Browser agent failed.";
    return final ?? { answer: "", url: opts.startUrl, done: false, error: msg };
  } finally {
    opts.signal?.removeEventListener("abort", kill);
  }
  return (
    final ?? {
      answer: "The browser session ended without a result.",
      url: opts.startUrl,
      done: false,
      error: null,
    }
  );
}
