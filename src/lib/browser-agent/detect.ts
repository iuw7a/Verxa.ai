/** Detects browser-agent requests (real browser: open, click, browse, surf). Pure function. */
export type BrowserAgentRequest = { goal: string; startUrl: string };

const URL_RE = /https?:\/\/[^\s)"<>]+/i;

const TRIGGER = /(open|offne|oeffne|browse|surf|geh auf|geh zu|visit|navigate|klick|click|check.*site|schau.*seite|webseite.*(test|pruf|check)|fasse.*zusammen|summar)/;

export function detectBrowserAgentRequest(text: string): BrowserAgentRequest | null {
  const q = text.toLowerCase();
  if (!TRIGGER.test(q)) return null;
  const m = text.match(URL_RE);
  const raw = m?.[0]?.replace(/[.,;:!?]+$/, "") ?? null;
  if (raw) {
    try {
      const u = new URL(raw);
      if (u.protocol === "http:" || u.protocol === "https:") {
        return { goal: text.slice(0, 1000), startUrl: u.toString() };
      }
    } catch {
      /* fall through */
    }
  }
  return null;
}
