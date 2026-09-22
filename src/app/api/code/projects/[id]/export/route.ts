import JSZip from "jszip";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/code/projects/[id]/export — streams all project files as a ZIP. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
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

  const { data, error } = await supabase
    .from("verxa_code_files")
    .select("path,content")
    .eq("project_id", id)
    .order("path");
  if (error) return Response.json({ error: "Could not load files." }, { status: 500 });

  const rows = ((data ?? []) as { path: string; content: string }[]);
  if (rows.length === 0) return Response.json({ error: "No files to export yet." }, { status: 404 });

  const zip = new JSZip();
  for (const f of rows) zip.file(f.path, f.content);
  const buf = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });

  const safe = (project as { title: string }).title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "verxa-site";
  // BodyInit accepts Uint8Array (BodyInit = ArrayBufferView). Cast for TS DOM lib.
  return new Response(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safe}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
