import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/code/projects/[id]/files — file list with timestamps (tree source). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
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
    .select("path,content,previous_content,updated_at")
    .eq("project_id", id)
    .order("path");

  if (error) {
    console.error("[code/files] GET failed:", error);
    return NextResponse.json({ error: "Could not load files." }, { status: 500 });
  }

  return NextResponse.json(
    {
      files: ((data ?? []) as { path: string; content: string; previous_content: string | null; updated_at: string }[]).map(
        (f) => ({ path: f.path, content: f.content, previousContent: f.previous_content, updatedAt: f.updated_at }),
      ),
    },
    { status: 200 },
  );
}
