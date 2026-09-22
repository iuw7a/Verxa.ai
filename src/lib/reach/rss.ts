import "server-only";

import { fetchText, stripHtml, type ReachResult } from "@/lib/reach";

export type RssItem = { title: string; url: string; snippet: string };
export type RssData = { feed: string; items: RssItem[] };

export async function reachRss(feedUrl: string): Promise<ReachResult<RssData>> {
  let parsed: URL;
  try {
    parsed = new URL(feedUrl.trim());
  } catch {
    return { ok: false, error: "That is not a valid feed URL." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Only http(s) feed URLs are supported." };
  }
  try {
    const res = await fetchText(parsed.toString(), 15000);
    if (!res.ok) return { ok: false, error: "The feed returned HTTP " + res.status + "." };
    const xml = await res.text();
    const blocks = xml.split(/<(item|entry)[\s>]/i).slice(1, 9);
    const items: RssItem[] = blocks.map((b) => {
      const titleM = b.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const linkM = b.match(/<link[^>]*href="([^"]+)"/i) ?? b.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
      const descM = b.match(/<(description|summary)[^>]*>([\s\S]*?)<\/(description|summary)>/i);
      return {
        title: stripHtml(titleM?.[1] ?? "Untitled").slice(0, 160),
        url: (linkM?.[1] ?? "").trim(),
        snippet: stripHtml(descM?.[2] ?? descM?.[1] ?? "").slice(0, 300),
      };
    });
    if (!items.length) return { ok: false, error: "No entries found in that feed." };
    return { ok: true, data: { feed: parsed.toString(), items } };
  } catch {
    return { ok: false, error: "Could not fetch that feed." };
  }
}
