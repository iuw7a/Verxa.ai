import "server-only";

import { detectReachRequest } from "@/lib/reach/detect";
import { reachReadUrl } from "@/lib/reach/url";
import { reachYoutube } from "@/lib/reach/youtube";
import { reachGithub } from "@/lib/reach/github";
import { reachReddit } from "@/lib/reach/reddit";
import { reachRss } from "@/lib/reach/rss";

export type ReachSource = { title: string; url: string; snippet?: string };

/**
 * Runs the matching internet tool for a user message.
 * Returns display text for the model + sources for the UI.
 * Never throws — failures become a short notice string.
 */
export async function runReachTool(
  userText: string,
): Promise<{ text: string; sources: ReachSource[] } | null> {
  const req = detectReachRequest(userText);
  if (!req) return null;
  try {
    if (req.kind === "read_url") {
      const r = await reachReadUrl(req.url);
      if (!r.ok) return { text: `[Page lookup failed: ${r.error}]`, sources: [] };
      return {
        text: `[Page: ${r.data.title} <${r.data.url}>]\n${r.data.text.slice(0, 8000)}`,
        sources: [{ title: r.data.title, url: r.data.url }],
      };
    }
    if (req.kind === "youtube") {
      const r = await reachYoutube(req.ref);
      if (!r.ok) return { text: `[YouTube lookup failed: ${r.error}]`, sources: [] };
      const who = r.data.author ? ` by ${r.data.author}` : "";
      return {
        text: `[YouTube: ${r.data.title}${who} <${r.data.url}>]\nNo public transcript available — answer from the title/metadata and say so.`,
        sources: [{ title: r.data.title, url: r.data.url }],
      };
    }
    if (req.kind === "github") {
      const r = await reachGithub(req.ref);
      if (!r.ok) return { text: `[GitHub lookup failed: ${r.error}]`, sources: [] };
      const lines = r.data.items
        .slice(0, 5)
        .map((i) => `- ${i.title} <${i.url}> ${i.snippet.slice(0, 200)}`);
      return {
        text: `[GitHub: ${r.data.summary}]\n${lines.join("\n")}`,
        sources: r.data.items.slice(0, 5).map((i) => ({ title: i.title, url: i.url })),
      };
    }
    if (req.kind === "reddit") {
      const r = await reachReddit(req.ref);
      if (!r.ok) return { text: `[Reddit lookup failed: ${r.error}]`, sources: [] };
      const comments = r.data.comments.slice(0, 4).map((c) => `- ${c.slice(0, 300)}`);
      return {
        text: `[Reddit: ${r.data.title} <${r.data.url}>]\n${r.data.selftext.slice(0, 2000)}\n${comments.join("\n")}`,
        sources: [{ title: r.data.title, url: r.data.url }],
      };
    }
    const r = await reachRss(req.url);
    if (!r.ok) return { text: `[RSS lookup failed: ${r.error}]`, sources: [] };
    const lines = r.data.items
      .slice(0, 6)
      .map((i) => `- ${i.title} <${i.url}> ${i.snippet.slice(0, 180)}`);
    return {
      text: `[RSS: ${r.data.feed}]\n${lines.join("\n")}`,
      sources: r.data.items.slice(0, 6).map((i) => ({ title: i.title, url: i.url })),
    };
  } catch {
    return { text: "[Internet tool failed unexpectedly.]", sources: [] };
  }
}
