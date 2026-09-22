import { NextResponse } from "next/server";
import { INTEGRATIONS } from "@/lib/integrations/registry";
import { getAuthenticatedUserId, listConnections, toPublicConnection } from "@/lib/integrations/store";
import { isProviderConfigured } from "@/lib/integrations/oauth";

export const runtime = "nodejs";

/**
 * GET /api/integrations
 * Catalog + the signed-in user's connection status for each integration.
 * Responses contain metadata only — never tokens or provider credentials.
 */
export async function GET() {
  const userId = await getAuthenticatedUserId();
  const connections = userId ? await listConnections(userId) : [];

  return NextResponse.json({
    integrations: INTEGRATIONS.map((def) => {
      const conn = connections.find((c) => c.provider === def.id);
      return {
        id: def.id,
        name: def.name,
        tagline: def.tagline,
        description: def.description,
        icon: def.icon,
        category: def.category,
        authType: def.authType,
        permissions: def.permissions,
        tools: def.tools,
        enabled: def.enabled,
        configured: isProviderConfigured(def.id),
        connection: conn ? toPublicConnection(conn) : null,
      };
    }),
  });
}
