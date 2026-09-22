import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * POST /api/code/projects/[id]/github — creates a repo under the configured
 * token owner and pushes all project files as the initial commit.
 * Requires GITHUB_TOKEN (classic PAT with `repo` scope, or fine-grained with
 * Contents + Administration write) on the server. Full per-user GitHub OAuth
 * is the follow-up; until then this typed endpoint reports its state.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createServerSupabase();
  if (!supabase) return Response.json({ error: "Service unavailable." }, { status: 503 });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return Response.json({ error: "Sign in to build." }, { status: 401 });

  const { data: project } = await supabase
    .from("verxa_code_projects")
    .select("id,title")
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });

  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    return Response.json(
      {
        error: "GitHub is not connected.",
        hint: "Set GITHUB_TOKEN on the server (per-user GitHub OAuth is coming next), then retry.",
        connected: false as const,
      },
      { status: 503 },
    );
  }

  let name = "";
  try {
    name = ((await req.json().catch(() => ({}))) as { name?: unknown }).name as string;
  } catch { /* optional */ }
  const title = (project as { title: string }).title;
  const repoName =
    (typeof name === "string" && name.trim() ? name.trim() : title)
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || `verxa-site-${id.slice(0, 8)}`;

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };

  const { data: fileRows, error: filesError } = await supabase
    .from("verxa_code_files")
    .select("path,content")
    .eq("project_id", id)
    .order("path");
  if (filesError) return Response.json({ error: "Could not load files." }, { status: 500 });
  const files = ((fileRows ?? []) as { path: string; content: string }[]);
  if (files.length === 0) return Response.json({ error: "No files to push yet." }, { status: 400 });

  try {
    const created = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers,
      body: JSON.stringify({ name: repoName, private: false, auto_init: false, description: `Built with Verxa Code: ${title}`.slice(0, 120) }),
      signal: AbortSignal.timeout(30000),
    });
    const createdJson = (await created.json().catch(() => ({}))) as { html_url?: string; full_name?: string; message?: string };
    if (!created.ok || !createdJson.full_name) {
      throw new Error(createdJson.message ?? `Could not create the repo (HTTP ${created.status}).`);
    }

    // Upload each file via Contents API (initial commit, one PUT per file).
    for (const f of files) {
      const put = await fetch(`https://api.github.com/repos/${createdJson.full_name}/contents/${encodeURIComponent(f.path).replace(/%2F/g, "/")}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ message: `Add ${f.path} (Verxa Code initial commit)`, content: Buffer.from(f.content, "utf8").toString("base64") }),
        signal: AbortSignal.timeout(30000),
      });
      if (!put.ok) {
        const pj = (await put.json().catch(() => ({}))) as { message?: string };
        throw new Error(`Could not push ${f.path}: ${pj.message ?? `HTTP ${put.status}`}`);
      }
    }

    return Response.json({ repo: { name: createdJson.full_name, url: createdJson.html_url ?? `https://github.com/${createdJson.full_name}` } }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "GitHub push failed.";
    console.error("[code/github] failed:", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
