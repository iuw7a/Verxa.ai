"use client";

/**
 * Browser Use service — the ONLY client entry point the workspace talks to.
 * Abstracts the provider (E2B Chromium via /api/tools/browser-agent) behind:
 *   browser.open/navigate/click/type/scroll/read/back/forward/wait/stop
 * over a single SSE stream of real AgentToolEvents. No mocking: every event
 * and screenshot comes from actual tool execution on the server.
 */

import type { AgentToolEvent } from "@/lib/browser-agent/events";

export type BrowserRunCallbacks = {
  onEvent: (e: AgentToolEvent) => void;
  onDone: (summary: { answer: string; url: string; done: boolean }) => void;
  onError: (message: string) => void;
};

function encodeSse(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}
void encodeSse;

export function runBrowserTask(
  goal: string,
  startUrl: string,
  cbs: BrowserRunCallbacks,
  opts?: { maxRounds?: number; signal?: AbortSignal },
): { stop: () => void } {
  const controller = new AbortController();
  const parent = opts?.signal;
  const onAbort = () => controller.abort();
  parent?.addEventListener("abort", onAbort, { once: true });
  let stopped = false;

  (async () => {
    try {
      const res = await fetch("/api/tools/browser-agent/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          goal,
          url: startUrl,
          maxRounds: opts?.maxRounds ?? 5,
        }),
      });
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        cbs.onError(j?.error ?? `Browser request failed (${res.status}).`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          const evt = JSON.parse(line.slice(5).trim()) as
            | { type: "event"; event: AgentToolEvent }
            | { type: "done"; answer: string; url: string; done: boolean }
            | { type: "error"; message: string };
          if (evt.type === "event") cbs.onEvent(evt.event);
          else if (evt.type === "done") {
            cbs.onDone({ answer: evt.answer, url: evt.url, done: evt.done });
            return;
          } else if (evt.type === "error") {
            cbs.onError(evt.message);
            return;
          }
        }
      }
      if (!stopped) cbs.onError("Browser stream ended unexpectedly.");
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      cbs.onError(e instanceof Error ? e.message.slice(0, 300) : "Browser agent failed.");
    } finally {
      parent?.removeEventListener("abort", onAbort);
    }
  })();

  return {
    stop() {
      stopped = true;
      controller.abort();
    },
  };
}

/** Convenience facade matching the requested conceptual interface. */
export function createBrowserHandle(
  start: (goal: string, startUrl: string, cbs: BrowserRunCallbacks, opts?: { signal?: AbortSignal }) => { stop: () => void },
) {
  let current: { stop: () => void } | null = null;
  return {
    open(goal: string, url: string, cbs: BrowserRunCallbacks, signal?: AbortSignal) {
      current?.stop();
      current = start(goal, url, cbs, signal ? { signal } : undefined);
    },
    stop() {
      current?.stop();
      current = null;
    },
  };
}
