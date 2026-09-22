import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, deleteConnection, logIntegrationEvent } from "@/lib/integrations/store";

export const runtime = "nodejs";

/**
 * POST /api/integrations/:provider/disconnect
 * Revokes the grant at the provider (best-effort), deletes the local
 * connection row, and logs the event. Owner-scoped by session — a user can
 * only ever disconnect their own connections.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await params;
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to manage integrations." }, { status: 401 });
  }
  await deleteConnection(userId, providerId);
  await logIntegrationEvent(userId, providerId, "disconnect");
  return NextResponse.json({ ok: true });
}
