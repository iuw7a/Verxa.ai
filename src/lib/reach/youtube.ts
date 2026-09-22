import "server-only";

import { fetchText, type ReachResult } from "@/lib/reach";

export type YoutubeData = { id: string; title: string; author: string; url: string; transcript: string };

function youtubeId(input: string): string | null {
  const t = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(t)) return t;
  try {
    const u = new URL(t);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).slice(0, 11) || null;
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
      const m = u.pathname.match(/\/(embed|shorts|live)\/([A-Za-z0-9_-]{11})/);
      if (m) return m[2];
    }
  } catch {
    return null;
  }
  return null;
}

export async function reachYoutube(input: string): Promise<ReachResult<YoutubeData>> {
  const id = youtubeId(input);
  if (!id) return { ok: false, error: "That is not a recognizable YouTube URL or video id." };
  const url = "https://www.youtube.com/watch?v=" + id;
  let title = "YouTube video";
  let author = "";
  try {
    const meta = await fetchText(
      "https://www.youtube.com/oembed?url=" + encodeURIComponent(url) + "&format=json",
      10000,
    );
    if (meta.ok) {
      const j = (await meta.json()) as { title?: string; author_name?: string };
      if (j.title) title = j.title;
      if (j.author_name) author = j.author_name;
    }
  } catch {
    /* metadata is best-effort */
  }
  return { ok: true, data: { id, title, author, url, transcript: "" } };
}
