import "server-only";

import { fetchText, type ReachResult } from "@/lib/reach";

export type GithubItem = { title: string; url: string; snippet: string };
export type GithubData = { kind: string; summary: string; items: GithubItem[] };

async function gh(path: string): Promise<unknown | null> {
  try {
    const res = await fetchText("https://api.github.com" + path, 12000);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function reachGithub(input: string): Promise<ReachResult<GithubData>> {
  const q = input.trim();
  const repoMatch = q.match(/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/) ?? q.match(/^([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)$/);
  if (repoMatch) {
    const repo = repoMatch[1].replace(/\/$/, "");
    const info = (await gh("/repos/" + repo)) as {
      full_name?: string;
      description?: string | null;
      stargazers_count?: number;
      language?: string | null;
    } | null;
    if (!info?.full_name) return { ok: false, error: "Repo not found: " + repo };
    const issues = (await gh("/repos/" + repo + "/issues?state=open&per_page=5")) as {
      title?: string;
      html_url?: string;
      body?: string | null;
    }[] | null;
    const items: GithubItem[] = (issues ?? []).slice(0, 5).map((i) => ({
      title: String(i.title ?? "Issue"),
      url: String(i.html_url ?? ""),
      snippet: String(i.body ?? "").slice(0, 300),
    }));
    const summary =
      info.full_name + " stars=" + String(info.stargazers_count ?? 0) + " lang=" + String(info.language ?? "?");
    return { ok: true, data: { kind: "repo", summary, items } };
  }
  const repos = (await gh("/search/repositories?q=" + encodeURIComponent(q.slice(0, 100)) + "&per_page=5")) as {
    items?: { full_name?: string; html_url?: string; description?: string | null; stargazers_count?: number }[];
  } | null;
  const items: GithubItem[] = (repos?.items ?? []).map((r) => ({
    title: String(r.full_name ?? "?") + " (" + String(r.stargazers_count ?? 0) + " stars)",
    url: String(r.html_url ?? ""),
    snippet: String(r.description ?? ""),
  }));
  if (!items.length) return { ok: false, error: "No GitHub repositories found." };
  return { ok: true, data: { kind: "search", summary: "Top repos for query", items } };
}
