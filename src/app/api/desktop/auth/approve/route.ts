import { NextRequest, NextResponse } from "next/server";
import {
  authStale,
  loadPendingAuth,
  signedInUserId,
} from "@/lib/desktop-auth";

export const runtime = "nodejs";

/**
 * POST /api/desktop/auth/approve — signed-in browser user approves the
 * pairing. Requires login (prevents link-holder denial/approval abuse).
 */
export async function POST(req: NextRequest) {
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
  if (authStale(row) || row.status === "expired") {
    await admin
      .from("verxa_desktop_auth")
      .update({ status: "expired" })
      .eq("id", row.id);
    return NextResponse.json({ error: "Session expired." }, { status: 410 });
  }
  if (row.status !== "pending") {
    return NextResponse.json({ error: `Already ${row.status}.` }, { status: 409 });
  }

  const { error } = await admin
    .from("verxa_desktop_auth")
    .update({ status: "approved", approved_user_id: userId })
    .eq("id", row.id)
    .eq("status", "pending");
  if (error) {
    return NextResponse.json({ error: "Approval failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
