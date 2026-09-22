import "server-only";

/**
 * Browser agent loop (browser-use style, Vercel-native):
 * goal → LLM picks actions → E2B Chromium executes → observe → repeat.
 * Pure function over injected llmCall so it is unit-testable.
 */

import type { BrowserAction, RunnerResult } from "@/lib/browser-agent/browser";

export type AgentStep = {
  actions: BrowserAction[];
  observation: RunnerResult;
};

export type AgentOutcome = {
  done: boolean;
  answer: string;
  steps: AgentStep[];
  finalUrl: string;
};

const ACTION_SCHEMA = `Respond with EXACTLY ONE JSON object, no other text:
{"actions":[{"type":"goto","url":"https://..."}]}
Action types:
- goto: {"type":"goto","url":"https://..."} (absolute https URL only)
- click: {"type":"click","selector":"css selector"}
- type: {"type":"type","selector":"css selector","text":"..."}
- scroll: {"type":"scroll","direction":"down"}
- wait: {"type":"wait","ms":1500}
- read: {"type":"read"} (just re-read the page)
- done: {"type":"done","answer":"..."} (task complete, answer in user language)`;

function parseActions(text: string): { actions: BrowserAction[]; doneAnswer: string | null } {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return { actions: [{ type: "read" }], doneAnswer: null };
  try {
    const j = JSON.parse(text.slice(start, end + 1)) as {
      actions?: ({ type?: string; url?: string; selector?: string; text?: string; answer?: string } | null)[];
      type?: string;
      answer?: string;
    };
    if (j.type === "done") return { actions: [], doneAnswer: String(j.answer ?? "Done.") };
    const actions: BrowserAction[] = [];
    for (const a of j.actions ?? []) {
      if (!a || typeof a.type !== "string") continue;
      if (a.type === "done") return { actions, doneAnswer: String(a.answer ?? "Done.") };
      if (a.type === "goto" && typeof a.url === "string" && /^https:\/\//.test(a.url)) {
        actions.push({ type: "goto", url: a.url.slice(0, 500) });
      } else if (a.type === "click" && typeof a.selector === "string" && a.selector.length < 300) {
        actions.push({ type: "click", selector: a.selector });
      } else if (a.type === "type" && typeof a.selector === "string" && typeof a.text === "string") {
        actions.push({ type: "type", selector: a.selector.slice(0, 300), text: a.text.slice(0, 2000) });
      } else if (a.type === "scroll") {
        actions.push({ type: "scroll", direction: "down" });
      } else if (a.type === "read") {
        actions.push({ type: "read" });
      }
      if (actions.length >= 4) break;
    }
    return { actions: actions.length ? actions : [{ type: "read" }], doneAnswer: null };
  } catch {
    return { actions: [{ type: "read" }], doneAnswer: null };
  }
}

export async function runBrowserAgent(opts: {
  goal: string;
  startUrl: string;
  maxRounds: number;
  llmCall: (prompt: string) => Promise<string>;
  execBatch: (actions: BrowserAction[]) => Promise<RunnerResult>;
}): Promise<AgentOutcome> {
  const steps: AgentStep[] = [];
  let currentUrl = opts.startUrl;
  let lastObs: RunnerResult | null = null;

  for (let round = 0; round < opts.maxRounds; round++) {
    const obsText = lastObs
      ? `URL: ${lastObs.finalUrl}\nTITLE: ${lastObs.finalTitle}\nTEXT:\n${lastObs.text.slice(0, 4000)}`
      : "(first round — navigate to the start URL, then read)";
    const prompt = [
      `Goal: ${opts.goal.slice(0, 1000)}`,
      `Current URL: ${currentUrl}`,
      `Last observation:\n${obsText}`,
      ACTION_SCHEMA,
    ].join("\n\n");
    const raw = await opts.llmCall(prompt);
    const { actions, doneAnswer } = parseActions(raw);
    if (doneAnswer) {
      return { done: true, answer: doneAnswer.slice(0, 4000), steps, finalUrl: currentUrl };
    }
    const safe = actions.filter((a) => a.type !== "screenshot");
    const obs = await opts.execBatch(safe.length ? safe : [{ type: "read" }]);
    currentUrl = obs.finalUrl || currentUrl;
    steps.push({ actions: safe, observation: obs });
    lastObs = obs;
  }
  const summary = lastObs
    ? `Visited ${currentUrl} (${lastObs.finalTitle || "no title"}). Top content: ${lastObs.text.slice(0, 1500)}`
    : "The browser session ended without readable content.";
  return { done: false, answer: summary, steps, finalUrl: currentUrl };
}
