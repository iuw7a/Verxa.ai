import "server-only";

import { fetchText, type ReachResult } from "@/lib/reach";
import { webSearch } from "@/lib/search";

export type RedditData = { title: string; url: string; selftext: string; comments: string[] };

export async function reachReddit(input: string): Promise<ReachResult<RedditData>> {
  const t = input.trim();
  let jsonUrl: string | null = null;
  try {
    const u = new URL(t);
    if (u.hostname.includes("reddit.com")) jsonUrl = "https://old.reddit.com" + u.pathname + ".json?limit=10";
  } catch {
    /* plain query below */
  }
  if (!jsonUrl) {
    const results = await webSearch("site:reddit.com " + t.slice(0, 100)).catch(() => []);
    const first = results[0]?.url;
    if (!first) return { ok: false, error: "No Reddit threads found for that query." };
    try {
      const u = new URL(first);
      jsonUrl = "https://old.reddit.com" + u.pathname + ".json?limit=10";
    } catch {
      return { ok: false, error: "No Reddit threads found for that query." };
    }
  }
  try {
    const res = await fetchText(jsonUrl, 15000);
    if (!res.ok) return { ok: false, error: "Reddit blocked that request (try again later)." };
    const j = (await res.json()) as Array<{
      data?: { children?: Array<{ data?: Record<string, unknown> }> };
    }>;
    const post = j?.[0]?.data?.children?.[0]?.data as
      | { title?: string; selftext?: string; permalink?: string }
      | undefined;
    const rawComments = j?.[1]?.data?.children ?? [];
    const comments = rawComments
      .map((c) => String((c.data as { body?: string } | undefined)?.body ?? "").slice(0, 400))
      .filter((b) => b.length > 20)
      .slice(0, 5);
    if (!post?.title) return { ok: false, error: "Could not read that Reddit thread." };
    return {
      ok: true,
      data: {
        title: post.title,
        url: "https://www.reddit.com" + (post.permalink ?? ""),
        selftext: String(post.selftext ?? "").slice(0, 3000),
        comments,
      },
    };
  } catch {
    return { ok: false, error: "Could not read that Reddit thread." };
  }
}
