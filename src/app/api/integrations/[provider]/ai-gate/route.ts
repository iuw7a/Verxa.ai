import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, resolveAccessToken } from "@/lib/integrations/store";

export const runtime = "nodejs";

/**
 * GET /api/integrations/:provider/ai-gate
 * The AI calls this (server-to-server via the chat route) to learn whether
 * the current user's connection is usable BEFORE running a tool. Returns a
 * compact verdict the model can act on; never any token material.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await params;
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ usable: false, reason: "not_connected", userMessage: "Sign in to let Verxa use your integrations." });
  }
  const resolved = await resolveAccessToken(userId, providerId);
  if (resolved.ok) {
    return NextResponse.json({
      usable: true,
      account: resolved.row.account_label,
      scopes: resolved.row.scopes,
    });
  }
  return NextResponse.json({
    usable: false,
    reason: resolved.reason,
    userMessage: resolved.message,
  });
}
