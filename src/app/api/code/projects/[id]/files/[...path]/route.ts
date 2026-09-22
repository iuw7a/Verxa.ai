import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  ico: "image/x-icon",
  txt: "text/plain; charset=utf-8",
};

/**
 * GET /api/code/projects/[id]/files/[...path] — serves a stored file so the
 * preview iframe renders the generated site. Owner-only (RLS via user check).
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string; path: string[] }> }) {
  const { id, path } = await ctx.params;
  const rel = (path ?? []).join("/");
  if (!rel || rel.length > 200 || rel.includes("..") || rel.startsWith("/")) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Sign in to build." }, { status: 401 });

  const { data: project } = await supabase
    .from("verxa_code_projects")
    .select("id")
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const { data, error } = await supabase
    .from("verxa_code_files")
    .select("content")
    .eq("project_id", id)
    .eq("path", rel)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "File not found." }, { status: 404 });

  const ext = rel.split(".").pop()?.toLowerCase() ?? "";
  const contentType = MIME[ext] ?? "text/plain; charset=utf-8";
  return new Response((data as { content: string }).content, {
    status: 200,
    headers: { "Content-Type": contentType, "Cache-Control": "no-store" },
  });
}
