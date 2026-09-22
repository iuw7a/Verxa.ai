import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { parseCodeMessageInput, type CodeMessage } from "@/lib/code-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MessageRow = {
  id: string;
  role: CodeMessage["role"];
  content: string;
  created_at: string;
};

async function ownsProject(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabase>>>,
  userId: string,
  projectId: string,
) {
  const { data, error } = await supabase
    .from("verxa_code_projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return false;
  return true;
}

/** GET /api/code/projects/[id]/messages — chat history, oldest first. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Sign in to build." }, { status: 401 });
  if (!(await ownsProject(supabase, userData.user.id, id))) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("verxa_code_messages")
    .select("id,role,content,created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    console.error("[code/messages] GET failed:", error);
    return NextResponse.json({ error: "Could not load messages." }, { status: 500 });
  }

  const messages: CodeMessage[] = ((data ?? []) as MessageRow[]).map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  }));
  return NextResponse.json({ messages }, { status: 200 });
}

/** POST /api/code/projects/[id]/messages — append a user message. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Sign in to build." }, { status: 401 });
  if (!(await ownsProject(supabase, userData.user.id, id))) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = parseCodeMessageInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await supabase
    .from("verxa_code_messages")
    .insert({ project_id: id, role: "user", content: parsed.content })
    .select("id,role,content,created_at")
    .single();

  if (error || !data) {
    console.error("[code/messages] POST failed:", error);
    return NextResponse.json({ error: "Could not send message." }, { status: 500 });
  }

  const row = data as MessageRow;
  const message: CodeMessage = { id: row.id, role: row.role, content: row.content, createdAt: row.created_at };

  await supabase
    .from("verxa_code_projects")
    .update({ updated_at: new Date().toISOString(), status: "building" })
    .eq("id", id);

  return NextResponse.json({ message }, { status: 201 });
}
