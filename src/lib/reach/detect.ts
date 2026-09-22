/** Detects internet-tool requests (read page, youtube, github, reddit, rss). Pure function. */
export type ReachRequest =
  | { kind: "read_url"; url: string }
  | { kind: "youtube"; ref: string }
  | { kind: "github"; ref: string }
  | { kind: "reddit"; ref: string }
  | { kind: "rss"; url: string };

const URL_RE = /https?:\/\/[^\s)"<>]+/i;

export function detectReachRequest(text: string): ReachRequest | null {
  const q = text.toLowerCase();
  const urlM = text.match(URL_RE);
  const rawUrl = urlM?.[0] ?? null;
  const url = rawUrl ? rawUrl.replace(/[.,;:!?]+$/, "") : null;
  const yt = /(youtube|youtu\.be)/.test(q);
  const gh = /(github|repo|repository)/.test(q);
  const rd = /(reddit)/.test(q);
  const rss = /(rss|atom feed|\.rss)/.test(q);
  const read = /(read|open|fetch|lies|fasse zusammen|summar|what does|inhalt)/.test(q);
  if (url) {
    if (url.includes("youtube.com") || url.includes("youtu.be")) return { kind: "youtube", ref: url };
    if (url.includes("github.com")) return { kind: "github", ref: url };
    if (url.includes("reddit.com")) return { kind: "reddit", ref: url };
    if (rss) return { kind: "rss", url };
    if (read) return { kind: "read_url", url };
    return null;
  }
  if (yt) return { kind: "youtube", ref: text };
  if (rd) return { kind: "reddit", ref: text };
  const repoM = text.match(/\b([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\b/);
  if (gh && repoM) return { kind: "github", ref: repoM[1] };
  return null;
}
