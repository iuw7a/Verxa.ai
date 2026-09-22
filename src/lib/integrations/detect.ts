/**
 * Detects when a chat message requires an integration (Gmail, Calendar,
 * Drive, …) and maps it to a concrete tool. Pure function — unit-testable.
 */

export type IntegrationRequest =
  | { kind: "status" }
  | {
      kind: "tool";
      provider: string;
      tool: "gmail_list" | "gmail_search" | "gmail_read" | "gmail_draft" | "calendar_list" | "drive_search";
      query?: string;
    };

export function detectIntegrationRequest(text: string): IntegrationRequest | null {
  const q = text.toLowerCase();

  // Google / Gmail / Calendar / Drive family.
  const mentionsGoogle = /\b(gmail|google mail|google\b|calendar\b|drive\b|email\b|e-mail\b|inbox\b|mail\b)/.test(q);
  if (!mentionsGoogle) return null;

  const wantsCalendar = /\b(calendar|termin|kalender|event|meeting|termin today|schedule)\b/.test(q);
  const wantsDrive = /\b(drive|file|document|dokument|datei)\b/.test(q);

  // Extract an embedded search phrase: latest email from google / mails about x.
  const about = text.match(/\b(?:about|regarding|from|vom|über|concerning)\s+(["']?)([\w\s@.\-!?äöüß]{2,60})\1/i);
  const query = about?.[2]?.trim();

  if (wantsCalendar) return { kind: "tool", provider: "google", tool: "calendar_list" };
  if (wantsDrive) return { kind: "tool", provider: "google", tool: "drive_search", query };

  // "check my gmail", "any new emails", "important today", "did i receive" → list inbox.
  if (/\b(check|any|new|received|inbox|latest|recent|today|unread|important)\b/.test(q)) {
    // If there's a specific sender/subject phrase → search; otherwise list.
    if (query && query.length > 2) return { kind: "tool", provider: "google", tool: "gmail_search", query };
    return { kind: "tool", provider: "google", tool: "gmail_list" };
  }

  // "find/search email(s) …" → search.
  if (/\b(find|search|suche|such|look for)\b/.test(q)) {
    return { kind: "tool", provider: "google", tool: "gmail_search", query };
  }

  // Draft intents must always be user-confirmed at execution; detection only
  // flags it so the model knows to compose and ask before sending.
  if (/\b(send|draft|write|compose|reply)\b.*\b(email|mail)\b|\b(email|mail)\b.*\b(send|draft|write|compose|reply)\b/.test(q)) {
    return { kind: "tool", provider: "google", tool: "gmail_draft", query };
  }

  return { kind: "tool", provider: "google", tool: "gmail_list" };
}
