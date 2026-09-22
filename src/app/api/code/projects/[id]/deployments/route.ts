import { createHash } from "crypto";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

const VERCEL_API = "https://api.vercel.com";

function vercelHeaders() {
  const token = process.env.VERCEL_API_TOKEN?.trim();
  if (!token) return null;
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function teamQuery() {
  const team = process.env.VERCEL_TEAM_ID?.trim();
  return team ? `?teamId=${encodeURIComponent(team)}` : "";
}

async function owns(supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabase>>>, userId: string, projectId: string) {
  const { data } = await supabase
    .from("verxa_code_projects")
    .select("id,title")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as { id: string; title: string } | null) ?? null;
}

/** GET — list deployments for the project (syncs pending ones with Vercel). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createServerSupabase();
  if (!supabase) return Response.json({ error: "Service unavailable." }, { status: 503 });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return Response.json({ error: "Sign in to build." }, { status: 401 });
  if (!(await owns(supabase, userData.user.id, id))) return Response.json({ error: "Project not found." }, { status: 404 });

  const { data } = await supabase
    .from("verxa_code_deployments")
    .select("id,url,provider,status,error,created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  const rows = ((data ?? []) as { id: string; url: string | null; provider: string; status: string; error: string | null; created_at: string }[]);

  // Sync pending rows (bounded) so the UI converges without webhooks.
  const headers = vercelHeaders();
  if (headers) {
    for (const row of rows.filter((r) => r.status === "pending").slice(0, 3)) {
      try {
        const res = await fetch(`${VERCEL_API}/v13/deployments/${encodeURIComponent(row.id)}${teamQuery()}`, {
          headers: { Authorization: headers.Authorization },
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) continue;
        const j = (await res.json()) as { state?: string; url?: string };
        const state = (j.state ?? "").toUpperCase();
        if (state === "READY" && j.url) {
          await supabase.from("verxa_code_deployments").update({ status: "success", url: `https://${j.url}` }).eq("id", row.id);
          row.status = "success";
          row.url = `https://${j.url}`;
        } else if (["ERROR", "CANCELED"].includes(state)) {
          await supabase.from("verxa_code_deployments").update({ status: "error", error: `Vercel state: ${state}` }).eq("id", row.id);
          row.status = "error";
        }
      } catch {
        /* sync best-effort */
      }
    }
  }

  return Response.json({ deployments: rows }, { status: 200 });
}

/**
 * POST — deploy the current file set to Vercel as a static site.
 * Requires VERCEL_API_TOKEN (and optional VERCEL_TEAM_ID) on the server.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createServerSupabase();
  if (!supabase) return Response.json({ error: "Service unavailable." }, { status: 503 });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return Response.json({ error: "Sign in to build." }, { status: 401 });
  const project = await owns(supabase, userData.user.id, id);
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });

  const headers = vercelHeaders();
  if (!headers) {
    return Response.json(
      { error: "Deployments need a Vercel API token.", hint: "Set VERCEL_API_TOKEN (and optional VERCEL_TEAM_ID) on the server, then retry." },
      { status: 503 },
    );
  }

  const { data: fileRows, error: filesError } = await supabase
    .from("verxa_code_files")
    .select("path,content")
    .eq("project_id", id)
    .order("path");
  if (filesError) return Response.json({ error: "Could not load files." }, { status: 500 });
  // Never upload secrets: .env files stay local, Vercel gets env vars separately.
  const files = ((fileRows ?? []) as { path: string; content: string }[]).filter(
    (f) => !/(^|\/)\.env(\.|$)/.test(f.path) && f.path !== ".env.local",
  );
  if (files.length === 0) return Response.json({ error: "No files to deploy yet." }, { status: 400 });

  // Next.js projects are built by Vercel; static file sets deploy as-is.
  const isNext = files.some((f) => f.path === "package.json" && f.content.includes('"next"')) || files.some((f) => f.path === "app/page.tsx");

  const entries = files.map((f) => {
    const bytes = Buffer.from(f.content, "utf8");
    return { file: f.path, sha: createHash("sha1").update(bytes).digest("hex"), size: bytes.length, bytes };
  });

  const name = `verxa-code-${id.slice(0, 8)}`.toLowerCase();
  try {
    const create = await fetch(`${VERCEL_API}/v13/deployments${teamQuery()}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name,
        target: "production",
        projectSettings: { framework: isNext ? "nextjs" : null },
        files: entries.map((e) => ({ file: e.file, sha: e.sha, size: e.size })),
      }),
      signal: AbortSignal.timeout(30000),
    });
    const created = (await create.json().catch(() => ({}))) as { id?: string; url?: string; error?: { message?: string } };
    if (!create.ok || !created.id) {
      throw new Error(created.error?.message ?? `Vercel rejected the deployment (HTTP ${create.status}).`);
    }

    // Upload file bytes (Vercel skips blobs it already has).
    for (const e of entries) {
      const up = await fetch(`${VERCEL_API}/v13/deployments/${created.id}/files${teamQuery()}`, {
        method: "PUT",
        headers: {
          Authorization: headers.Authorization,
          "Content-Type": "application/octet-stream",
          "x-vercel-digest": e.sha,
          "x-vercel-size": String(e.size),
        },
        body: new Uint8Array(e.bytes) as unknown as BodyInit,
        signal: AbortSignal.timeout(30000),
      });
      if (!up.ok && up.status !== 409) {
        throw new Error(`File upload failed for ${e.file} (HTTP ${up.status}).`);
      }
    }

    const url = created.url ? `https://${created.url}` : null;
    await supabase.from("verxa_code_deployments").insert({
      id: created.id,
      project_id: id,
      url,
      provider: "vercel",
      status: "pending",
    });

    return Response.json({ deployment: { id: created.id, url, status: "pending" } }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Deploy failed.";
    console.error("[code/deploy] failed:", message);
    await supabase.from("verxa_code_deployments").insert({ project_id: id, provider: "vercel", status: "error", error: message.slice(0, 500) });
    return Response.json({ error: message }, { status: 502 });
  }
}
