/**
 * Start-URL resolver: many browser tasks name a site without pasting a URL
 * ("Open ChatGPT and ask…", "Go to Google, search…").
 * Pure function, unit-testable. Never returns credentials or internals.
 */

const URL_RE = /https?:\/\/[^\s)"<>]+/i;

const KNOWN: { match: RegExp; url: string }[] = [
  { match: /chatgpt|openai.*chat/i, url: "https://chatgpt.com/" },
  { match: /google/i, url: "https://www.google.com/" },
  { match: /youtube/i, url: "https://www.youtube.com/" },
  { match: /github/i, url: "https://github.com/" },
  { match: /wikipedia/i, url: "https://www.wikipedia.org/" },
  { match: /berlin.*restaurant|restaurant.*berlin/i, url: "https://www.google.com/" },
];

export function resolveStartUrl(goal: string, explicit?: string): string | null {
  const rawExplicit = (explicit ?? "").trim();
  if (rawExplicit) {
    try {
      const u = new URL(rawExplicit);
      if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
    } catch {
      /* fall through to inference */
    }
  }
  const m = goal.match(URL_RE);
  const raw = m?.[0]?.replace(/[.,;:!?]+$/, "") ?? null;
  if (raw) {
    try {
      const u = new URL(raw);
      if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
    } catch {
      /* fall through */
    }
  }
  for (const k of KNOWN) {
    if (k.match.test(goal)) return k.url;
  }
  // Generic browse intent without a named site → start at Google
  // so the agent can search its way forward (multi-step tasks).
  if (/open|browse|surf|visit|navigate|search|google|look up|find|compare|website|site|page\b/i.test(goal)) {
    return "https://www.google.com/";
  }
  return null;
}

/** Client-safe browser-intent detection (mirrors server detect, URL-optional). */
export function detectBrowserIntent(text: string): { goal: string; startUrl: string } | null {
  const q = text.toLowerCase();
  const trigger =
    /(open|browse|surf|visit|navigat|click|google|search.*(open|site|result)|compare.*(open|site)|go to|geh auf|geh zu|oeffne|öffne|webseite|website)/;
  if (!trigger.test(q)) return null;
  if (/^(open|show|view) (the )?(source|code|file|project)/i.test(text)) return null;
  const startUrl = resolveStartUrl(text);
  if (!startUrl) return null;
  return { goal: text.slice(0, 1000), startUrl };
}
