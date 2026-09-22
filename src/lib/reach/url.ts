import "server-only";

import { fetchText, stripHtml, type ReachResult } from "@/lib/reach";

export type ReadUrlData = { url: string; title: string; text: string };

export async function reachReadUrl(url: string): Promise<ReachResult<ReadUrlData>> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: "That is not a valid URL." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Only http(s) URLs can be read." };
  }
  try {
    const res = await fetchText("https://r.jina.ai/" + url, 20000);
    if (res.ok) {
      const text = (await res.text()).slice(0, 15000).trim();
      if (text.length > 200) {
        const firstLine = (text.split("\n")[0] ?? "Page").slice(0, 160);
        return { ok: true, data: { url, title: firstLine, text } };
      }
    }
  } catch {
    /* fall through to direct fetch */
  }
  try {
    const res = await fetchText(url);
    if (!res.ok) return { ok: false, error: "The page returned HTTP " + res.status + "." };
    const html = await res.text();
    const title = "Page";
    const text = stripHtml(html).slice(0, 12000);
    if (text.length < 80) return { ok: false, error: "The page has no readable text." };
    return { ok: true, data: { url, title, text } };
  } catch {
    return { ok: false, error: "Could not fetch that page." };
  }
}
