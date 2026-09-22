import "server-only";

import type { BrowserSession, RunnerResult } from "@/lib/browser-agent/browser";

/** Executes one batch of actions starting from startUrl. Stateless per call. */
export async function runBrowserBatch(
  session: BrowserSession,
  startUrl: string,
  actions: { type: string; [k: string]: unknown }[],
): Promise<RunnerResult> {
  const payload = JSON.stringify({ start_url: startUrl, actions });
  const cmd = `python3 /home/user/agent_runner.py <<'VERXA_EOF'\n${payload}\nVERXA_EOF`;
  const res = await session.sandbox.commands.run(cmd, { requestTimeoutMs: 120000 });
  const raw = `${res.stdout ?? ""}`.trim();
  const lastLine = raw.split("\n").filter(Boolean).pop() ?? "";
  try {
    const j = JSON.parse(lastLine) as {
      final_url?: string;
      final_title?: string;
      text?: string;
      links?: { text: string; href: string }[];
      screenshot?: string | null;
      steps?: { action: string; ok: boolean; error?: string }[];
      error?: string | null;
    };
    // Runner emits a full data URL; accept legacy raw base64 too.
    const shot = typeof j.screenshot === "string" ? j.screenshot : null;
    const screenshot =
      shot && !shot.startsWith("data:") ? `data:image/png;base64,${shot}` : shot;
    return {
      finalUrl: String(j.final_url ?? startUrl),
      finalTitle: String(j.final_title ?? ""),
      text: String(j.text ?? ""),
      links: Array.isArray(j.links) ? j.links : [],
      screenshot,
      steps: Array.isArray(j.steps) ? j.steps : [],
      error: j.error ? String(j.error) : null,
    };
  } catch {
    return {
      finalUrl: startUrl,
      finalTitle: "",
      text: "",
      links: [],
      screenshot: null,
      steps: [],
      error: `Browser run failed: ${(res.stderr ?? "").slice(0, 300) || "no output"}`,
    };
  }
}
