import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function greetingForHour(hour = new Date().getHours()) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function formatRelativeTime(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function titleFromPrompt(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "New chat";
  return clean.length > 42 ? `${clean.slice(0, 42).trim()}…` : clean;
}

export function needsWebSearch(text: string) {
  const q = text.toLowerCase();
  if (
    /\b(today|tonight|yesterday|this week|latest|breaking|news|current|price|who won|score|weather|stock|release date|as of|202[4-9]|compare|vs\.?|versus)\b/.test(
      q,
    ) ||
    /\?/.test(text)
  ) {
    return true;
  }
  // Company/product lookups: URLs, bare domains, and proper-noun-ish subjects.
  if (/https?:\/\/|\b[a-z0-9-]+\.(com|io|ai|cloud|dev|de|net|org|app|co)\b/i.test(text)) {
    return true;
  }
  // Short dated lookups like "hamburg dubai 22.10" or "konzert berlin 3.10":
  // a terse topic + place + explicit date is an event/local question that
  // must be answered from real data, not memory (memory invites invented
  // venue listings).
  const hasExplicitDate = /\b\d{1,2}[./]\d{1,2}([.]\d{2,4})?\b/.test(q);
  if (hasExplicitDate && q.split(/\s+/).length <= 4) return true;
  return /\b(was ist|wer ist|what is|who is|über|about)\b/.test(q);
}

/** Turns a raw user message into a compact web-search query. */
export function buildSearchQuery(text: string) {
  let q = text.replace(/\s+/g, " ").trim();
  q = q.replace(
    /^(was ist|was sind|wer ist|wer war|erzähl mir (etwas )?über|erkläre( mir)?|what is|what are|who is|who was|tell me about|explain|about)\s+/i,
    "",
  );
  q = q.replace(/[?.!]+$/, "").trim();
  return q.slice(0, 140);
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "V";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
