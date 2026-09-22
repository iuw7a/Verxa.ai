import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import type { CodeProject } from "@/lib/code-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProjectRow = {
  id: string;
  title: string;
  prompt: string;
  status: CodeProject["status"];
  preview_url: string | null;
  created_at: string;
  updated_at: string;
};

/** GET /api/code/projects/[id] — single project, RLS ensures ownership. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Sign in to build." }, { status: 401 });

  const { data, error } = await supabase
    .from("verxa_code_projects")
    .select("id,title,prompt,status,preview_url,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[code/projects/[id]] GET failed:", error);
    return NextResponse.json({ error: "Could not load project." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const row = data as ProjectRow;
  return NextResponse.json(
    {
      project: {
        id: row.id,
        title: row.title,
        prompt: row.prompt,
        status: row.status,
        previewUrl: row.preview_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      } satisfies CodeProject,
    },
    { status: 200 },
  );
}
