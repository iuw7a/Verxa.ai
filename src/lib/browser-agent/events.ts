/**
 * Unified agent <-> UI event stream for the Live Browser Agent workspace.
 * Every event maps to a real tool execution step — never synthesized.
 */

export type AgentToolEventType =
  | "agent.started"
  | "agent.thinking"
  | "agent.message"
  | "browser.started"
  | "browser.navigating"
  | "browser.clicked"
  | "browser.typing"
  | "browser.scrolling"
  | "browser.reading"
  | "browser.waiting"
  | "browser.Back"
  | "browser.forward"
  | "browser.screenshot"
  | "browser.completed"
  | "browser.error"
  | "agent.completed";

export type AgentToolEvent = {
  type: AgentToolEventType;
  at: string;
  label: string;
  detail?: string | null;
  url?: string | null;
  title?: string | null;
  /** Real screenshot captured from the cloud browser (data URL) or null. */
  screenshot?: string | null;
};

export type AgentStatusKind =
  | "idle"
  | "thinking"
  | "using-browser"
  | "opening"
  | "navigating"
  | "clicking"
  | "typing"
  | "reading"
  | "scrolling"
  | "waiting"
  | "paused"
  | "completed"
  | "error"
  | "stopped";

export const STATUS_COPY: Record<AgentStatusKind, string> = {
  idle: "Idle",
  thinking: "Thinking",
  "using-browser": "Using Browser",
  opening: "Opening website",
  navigating: "Navigating",
  clicking: "Clicking",
  typing: "Typing",
  reading: "Reading page",
  scrolling: "Scrolling",
  waiting: "Waiting for response",
  paused: "Paused",
  completed: "Completed",
  error: "Browser interaction failed",
  stopped: "Stopped",
};

export function statusForEvent(type: AgentToolEventType): AgentStatusKind {
  switch (type) {
    case "agent.started":
    case "agent.thinking":
      return "thinking";
    case "browser.started":
      return "opening";
    case "browser.navigating":
      return "navigating";
    case "browser.clicked":
      return "clicking";
    case "browser.typing":
      return "typing";
    case "browser.reading":
      return "reading";
    case "browser.scrolling":
      return "scrolling";
    case "browser.waiting":
    case "browser.Back":
    case "browser.forward":
      return "waiting";
    case "browser.screenshot":
      return "reading";
    case "browser.completed":
    case "agent.completed":
      return "completed";
    case "browser.error":
      return "error";
    default:
      return "using-browser";
  }
}

export type AgentStep = {
  id: string;
  label: string;
  detail?: string | null;
  done: boolean;
  error?: string | null;
  at: string;
};

export function eventToStep(e: AgentToolEvent, i: number): AgentStep {
  return {
    id: `${e.at}-${i}`,
    label: e.label,
    detail: e.detail ?? e.url ?? null,
    done: e.type === "browser.completed" || e.type === "agent.completed",
    error: e.type === "browser.error" ? (e.detail ?? "Failed") : null,
    at: e.at,
  };
}
