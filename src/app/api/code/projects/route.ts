import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { parseCreateProjectInput, titleFromCodePrompt, type CodeProject } from "@/lib/code-types";

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

function toProject(row: ProjectRow): CodeProject {
  return {
    id: row.id,
    title: row.title,
    prompt: row.prompt,
    status: row.status,
    previewUrl: row.preview_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** GET /api/code/projects — real list from Supabase, typed empty state when signed out or empty. */
export async function GET() {
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ projects: [] as CodeProject[] }, { status: 200 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ projects: [] as CodeProject[], signedIn: false }, { status: 200 });

  const { data, error } = await supabase
    .from("verxa_code_projects")
    .select("id,title,prompt,status,preview_url,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[code/projects] GET failed:", error);
    const missingTable =
      error.code === "42P01" || /relation .* does not exist/i.test(error.message);
    return NextResponse.json(
      {
        error: "Could not load projects.",
        code: error.code ?? null,
        hint: missingTable
          ? "Table verxa_code_projects is missing. Run supabase/verxa-code.sql in the Supabase SQL editor."
          : null,
      },
      { status: 500 },
    );
  }
  return NextResponse.json(
    { projects: ((data ?? []) as ProjectRow[]).map(toProject), signedIn: true },
    { status: 200 },
  );
}

/** POST /api/code/projects — creates a Project record, returns it typed. Phase 2 will redirect to /code/[id]. */
export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Sign in to build." }, { status: 401 });

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseCreateProjectInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await supabase
    .from("verxa_code_projects")
    .insert({
      user_id: userData.user.id,
      title: titleFromCodePrompt(parsed.prompt),
      prompt: parsed.prompt,
      status: "draft",
    })
    .select("id,title,prompt,status,preview_url,created_at,updated_at")
    .single();

  if (error || !data) {
    console.error("[code/projects] POST failed:", error);
    const code = error?.code ?? null;
    const missingTable =
      code === "42P01" || (error && /relation .* does not exist/i.test(error.message));
    const rlsDenied = code === "42501";
    return NextResponse.json(
      {
        error: "Could not create project.",
        code,
        hint: missingTable
          ? "Table verxa_code_projects is missing. Run supabase/verxa-code.sql in the Supabase SQL editor, then retry."
          : rlsDenied
            ? "Database refused the insert (RLS). Check the verxa_code_projects policies for auth.uid() = user_id."
            : null,
      },
      { status: 500 },
    );
  }
  // Store the initial prompt as the first chat message (best-effort:
  // the project itself is already created, so a message failure must not
  // fail the request — the project page refetches and shows the prompt).
  const { error: msgError } = await supabase.from("verxa_code_messages").insert({
    project_id: (data as ProjectRow).id,
    role: "user",
    content: parsed.prompt,
  });
  if (msgError) console.error("[code/projects] initial message failed:", msgError);

  return NextResponse.json({ project: toProject(data as ProjectRow) }, { status: 201 });
}
