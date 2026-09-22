/** Shared device-auth helpers (imported by approve/deny routes). */
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export async function loadPendingAuth(sessionId: string) {
  const admin = createAdminSupabase();
  if (!admin) return { admin: null, row: null };
  const { data } = await admin
    .from("verxa_desktop_auth")
    .select("id,status,expires_at")
    .eq("session_id", sessionId)
    .maybeSingle();
  return {
    admin,
    row: data as { id: string; status: string; expires_at: string } | null,
  };
}

export function authStale(row: { status: string; expires_at: string }): boolean {
  return (
    row.status === "pending" && new Date(row.expires_at).getTime() < Date.now()
  );
}

export async function signedInUserId(): Promise<string | null> {
  const supabase = await createServerSupabase();
  const { data } = supabase ? await supabase.auth.getUser() : { data: null };
  return data?.user?.id ?? null;
}

/** Shared deny implementation for POST /api/desktop/auth/deny. */
export async function denyDesktopAuth(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    session_id?: string;
  } | null;
  const sessionId = body?.session_id ?? "";
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session." }, { status: 400 });
  }
  const userId = await signedInUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { admin, row } = await loadPendingAuth(sessionId);
  if (!admin || !row) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }
  await admin
    .from("verxa_desktop_auth")
    .update({ status: "denied" })
    .eq("id", row.id)
    .eq("status", "pending");
  return NextResponse.json({ ok: true });
}
