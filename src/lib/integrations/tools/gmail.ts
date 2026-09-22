import "server-only";

/**
 * Gmail backend tools — the ONLY way the AI touches a user's mailbox.
 * Executed exclusively on the server with a freshly resolved access token;
 * tokens are never returned to the client. Read-only scopes only.
 */

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

export type GmailToolError = { code: "rate_limited" | "api_error" | "forbidden" | "not_found"; message: string };

export type GmailListItem = {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
};

async function gmailFetch(path: string, accessToken: string): Promise<
  { ok: true; json: unknown } | { ok: false; error: GmailToolError }
> {
  try {
    const res = await fetch(`${GMAIL_API}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: { code: "forbidden", message: "Gmail access was denied for this scope. Reconnect Google." } };
    }
    if (res.status === 429) {
      return { ok: false, error: { code: "rate_limited", message: "Gmail rate limit reached. Try again in a minute." } };
    }
    if (res.status === 404) {
      return { ok: false, error: { code: "not_found", message: "That message no longer exists." } };
    }
    if (!res.ok) {
      return { ok: false, error: { code: "api_error", message: `Gmail request failed (HTTP ${res.status}).` } };
    }
    return { ok: true, json: await res.json() };
  } catch {
    return { ok: false, error: { code: "api_error", message: "Could not reach Gmail." } };
  }
}

type GmailMessagePart = {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailMessagePart[];
};

type GmailMessage = {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: {
    headers?: { name: string; value: string }[];
    body?: { data?: string };
    parts?: GmailMessagePart[];
  };
};

function header(msg: GmailMessage, name: string): string {
  return msg.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function extractTextBody(msg: GmailMessage): string {
  const walk = (parts: GmailMessagePart[]): string => {
    for (const p of parts) {
      if (p.mimeType === "text/plain" && p.body?.data) return decodeBase64Url(p.body.data);
      if (p.parts) {
        const nested = walk(p.parts);
        if (nested) return nested;
      }
    }
    return "";
  };
  if (msg.payload?.body?.data) return decodeBase64Url(msg.payload.body.data);
  return msg.payload?.parts ? walk(msg.payload.parts) : "";
}

/** GET /messages?labelIds=INBOX — list recent inbox emails (metadata only). */
export async function gmailList(
  accessToken: string,
  max = 10,
): Promise<{ ok: true; emails: GmailListItem[] } | { ok: false; error: GmailToolError }> {
  const list = await gmailFetch(`/messages?maxResults=${Math.min(Math.max(max, 1), 25)}&labelIds=INBOX`, accessToken);
  if (!list.ok) return list;
  const ids = ((list.json as { messages?: { id: string }[] }).messages ?? []).slice(0, max);
  const emails: GmailListItem[] = [];
  for (const { id } of ids) {
    // format=metadata keeps us within gmail.metadata scope (no full body).
    const meta = await gmailFetch(`/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, accessToken);
    if (!meta.ok) continue;
    const msg = meta.json as GmailMessage;
    emails.push({
      id: msg.id,
      threadId: msg.threadId,
      from: header(msg, "From"),
      subject: header(msg, "Subject") || "(no subject)",
      snippet: msg.snippet ?? "",
      date: header(msg, "Date"),
      unread: (msg.labelIds ?? []).includes("UNREAD"),
    });
  }
  return { ok: true, emails };
}

/** GET /messages?q=… — Gmail search (metadata + snippet). */
export async function gmailSearch(
  accessToken: string,
  query: string,
  max = 8,
): Promise<{ ok: true; emails: GmailListItem[] } | { ok: false; error: GmailToolError }> {
  const q = encodeURIComponent(query.slice(0, 200));
  const list = await gmailFetch(`/messages?q=${q}&maxResults=${Math.min(Math.max(max, 1), 20)}`, accessToken);
  if (!list.ok) return list;
  const ids = ((list.json as { messages?: { id: string }[] }).messages ?? []).slice(0, max);
  const emails: GmailListItem[] = [];
  for (const { id } of ids) {
    const meta = await gmailFetch(`/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, accessToken);
    if (!meta.ok) continue;
    const msg = meta.json as GmailMessage;
    emails.push({
      id: msg.id,
      threadId: msg.threadId,
      from: header(msg, "From"),
      subject: header(msg, "Subject") || "(no subject)",
      snippet: msg.snippet ?? "",
      date: header(msg, "Date"),
      unread: (msg.labelIds ?? []).includes("UNREAD"),
    });
  }
  return { ok: true, emails };
}

/** GET /messages/:id — full single email (body text included). */
export async function gmailRead(
  accessToken: string,
  id: string,
): Promise<
  | { ok: true; email: { id: string; from: string; to: string; subject: string; date: string; body: string } }
  | { ok: false; error: GmailToolError }
> {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    return { ok: false, error: { code: "not_found", message: "Invalid message id." } };
  }
  const res = await gmailFetch(`/messages/${id}?format=full`, accessToken);
  if (!res.ok) return res;
  const msg = res.json as GmailMessage;
  return {
    ok: true,
    email: {
      id: msg.id,
      from: header(msg, "From"),
      to: header(msg, "To"),
      subject: header(msg, "Subject") || "(no subject)",
      date: header(msg, "Date"),
      body: extractTextBody(msg).slice(0, 20_000),
    },
  };
}
