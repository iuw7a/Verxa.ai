import "server-only";

import { webSearch, type SearchResult } from "@/lib/search";

export type ReachResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function fetchText(url: string, timeoutMs = 15000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "VerxaAI/1.0 (internet-tools)",
        Accept: "text/html,application/json,application/xml,text/*;q=0.9",
      },
    });
  } finally {
    clearTimeout(t);
  }
}

export function stripHtml(html: string): string {
  let s = html;
  s = s.split("<script")[0] + " " + (s.split("</script>").slice(1).join(" ") || "");
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 12000);
}

export { webSearch };
export type { SearchResult };
