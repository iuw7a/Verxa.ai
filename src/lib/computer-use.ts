/**
 * Computer Use shared contracts (no Next.js / Electron imports — safe to
 * unit-test and reuse). The step route imports the prompt + validator from
 * here; the desktop mirrors the same action schema.
 */

export type ClientAction =
  | { type: "screenshot" }
  | { type: "move_mouse"; x: number; y: number }
  | { type: "click"; x: number; y: number; button?: "left" | "right" | "middle" }
  | { type: "double_click"; x: number; y: number }
  | { type: "right_click"; x: number; y: number }
  | { type: "drag"; x1: number; y1: number; x2: number; y2: number }
  | { type: "scroll"; x: number; y: number; dx: number; dy: number }
  | { type: "type"; text: string }
  | { type: "key_press"; key: string }
  | { type: "hotkey"; keys: string[] }
  | { type: "open_application"; app: string }
  | { type: "focus_window"; title: string }
  | { type: "close_window"; title: string }
  | { type: "wait"; ms: number }
  | { type: "done"; summary: string }
  | { type: "ask_user"; question: string };

export const COMPUTER_USE_ACTION_TYPES = new Set([
  "screenshot", "move_mouse", "click", "double_click", "right_click",
  "drag", "scroll", "type", "key_press", "hotkey", "open_application",
  "focus_window", "close_window", "wait", "done", "ask_user",
]);

export const COMPUTER_USE_APPS = new Set([
  "browser", "chrome", "edge", "firefox", "notepad", "calculator",
  "explorer", "files", "settings", "terminal", "cmd", "powershell",
  "taskmanager", "snipping", "paint", "wordpad",
]);

const KEYS = new Set([
  "enter", "tab", "escape", "backspace", "delete", "space",
  "up", "down", "left", "right", "home", "end", "pageup", "pagedown",
  ...Array.from({ length: 12 }, (_, i) => `f${i + 1}`),
]);

function clamp(n: unknown): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1000, Math.round(n)));
}

/** Validate + normalize a model-produced action. Null = reject. */
export function validateComputerAction(
  raw: unknown,
): (ClientAction & { needs_confirmation: boolean }) | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  if (typeof a.type !== "string" || !COMPUTER_USE_ACTION_TYPES.has(a.type)) return null;
  let needs_confirmation = a.needs_confirmation === true;

  switch (a.type) {
    case "screenshot":
      return { type: "screenshot", needs_confirmation };
    case "move_mouse": {
      const x = clamp(a.x), y = clamp(a.y);
      return x === null || y === null ? null : { type: "move_mouse", x, y, needs_confirmation };
    }
    case "click": {
      const x = clamp(a.x), y = clamp(a.y);
      const button = a.button === undefined || a.button === "left" ? "left"
        : a.button === "right" ? "right" : a.button === "middle" ? "middle" : null;
      return x === null || y === null || !button ? null
        : { type: "click", x, y, button, needs_confirmation };
    }
    case "double_click": {
      const x = clamp(a.x), y = clamp(a.y);
      return x === null || y === null ? null : { type: "double_click", x, y, needs_confirmation };
    }
    case "right_click": {
      const x = clamp(a.x), y = clamp(a.y);
      return x === null || y === null ? null : { type: "right_click", x, y, needs_confirmation };
    }
    case "drag": {
      const x1 = clamp(a.x1), y1 = clamp(a.y1), x2 = clamp(a.x2), y2 = clamp(a.y2);
      return x1 === null || y1 === null || x2 === null || y2 === null ? null
        : { type: "drag", x1, y1, x2, y2, needs_confirmation };
    }
    case "scroll": {
      const x = clamp(a.x), y = clamp(a.y);
      const dx = typeof a.dx === "number" && Number.isFinite(a.dx) ? Math.max(-10, Math.min(10, Math.round(a.dx))) : 0;
      const dy = typeof a.dy === "number" && Number.isFinite(a.dy) ? Math.max(-10, Math.min(10, Math.round(a.dy))) : -3;
      return x === null || y === null ? null : { type: "scroll", x, y, dx, dy, needs_confirmation };
    }
    case "type": {
      if (typeof a.text !== "string" || !a.text || a.text.length > 2000) return null;
      return { type: "type", text: a.text, needs_confirmation };
    }
    case "key_press": {
      if (typeof a.key !== "string") return null;
      const key = a.key.toLowerCase();
      if (key.length !== 1 && !KEYS.has(key)) return null;
      if (key === "enter") needs_confirmation = true; // may submit forms
      return { type: "key_press", key, needs_confirmation };
    }
    case "hotkey": {
      if (!Array.isArray(a.keys) || a.keys.length < 2 || a.keys.length > 3) return null;
      const keys = a.keys.map((k) => String(k).toLowerCase());
      const mods = new Set(["ctrl", "alt", "shift", "win"]);
      const hasMod = keys.some((k) => mods.has(k));
      if (!hasMod) return null;
      if (keys.includes("alt") && keys.includes("f4")) needs_confirmation = true; // closes windows
      if (keys.includes("alt") || keys.includes("win")) needs_confirmation = true; // system-level
      return { type: "hotkey", keys, needs_confirmation };
    }
    case "open_application": {
      if (typeof a.app !== "string" || !COMPUTER_USE_APPS.has(a.app.toLowerCase())) return null;
      return { type: "open_application", app: a.app.toLowerCase(), needs_confirmation };
    }
    case "focus_window": {
      if (typeof a.title !== "string" || !a.title.trim() || a.title.length > 200) return null;
      return { type: "focus_window", title: a.title.trim(), needs_confirmation };
    }
    case "close_window":
      // Closing can lose unsaved work — always confirm.
      if (typeof a.title !== "string" || !a.title.trim() || a.title.length > 200) return null;
      return { type: "close_window", title: a.title.trim(), needs_confirmation: true };
    case "wait": {
      const ms = typeof a.ms === "number" && Number.isFinite(a.ms)
        ? Math.max(250, Math.min(10000, Math.round(a.ms))) : 1000;
      return { type: "wait", ms, needs_confirmation };
    }
    case "done":
      return { type: "done", summary: typeof a.summary === "string" ? a.summary.slice(0, 1000) : "Done.", needs_confirmation: false };
    case "ask_user":
      return { type: "ask_user", question: typeof a.question === "string" ? a.question.slice(0, 500) : "I need your input to continue.", needs_confirmation: false };
    default:
      return null;
  }
}

export function extractComputerActionJson(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = (fenced?.[1] ?? text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

export const COMPUTER_USE_SYSTEM_PROMPT = `You are Verxa Computer Use, an AI that operates a Windows desktop. You receive the user's goal, the current screenshot (coordinates are 0-1000 relative to the displayed image), the active window, and recent history.

Rules:
- Respond with EXACTLY ONE JSON object, no other text. Schema:
  {"type":"<action>","x":0-1000,"y":0-1000,"button":"left","x1":0-1000,"y1":0-1000,"x2":0-1000,"y2":0-1000,"dx":int,"dy":int,"text":"...","key":"enter","keys":["ctrl","c"],"app":"browser|chrome|edge|firefox|notepad|calculator|explorer|files|settings|terminal|cmd|powershell|taskmanager|snipping|paint|wordpad","title":"window title substring","ms":1000,"summary":"...","question":"...","needs_confirmation":false}
  Include only fields relevant to the chosen type.
- Action types: screenshot, move_mouse, click, double_click, right_click, drag, scroll, type, key_press, hotkey, open_application, focus_window, close_window, wait, done, ask_user.
- Prefer open_application over clicking Start-menu icons. Prefer hotkeys (win, ctrl+l, ctrl+t) over imprecise clicks when reliable.
- NEVER output shell commands, scripts, or file paths to execute. NEVER ask for or repeat passwords.
- If the screen is ambiguous: return ask_user (or set needs_confirmation true) instead of guessing a click.
- If the goal is complete: {"type":"done","summary":"..."}.
- If you need information only the user has: {"type":"ask_user","question":"..."}.
- Set needs_confirmation true for: sending messages, submitting/paying forms, closing windows with possible unsaved work, anything irreversible.
- Keep "type" text short (what the user asked, verbatim when possible).`;
