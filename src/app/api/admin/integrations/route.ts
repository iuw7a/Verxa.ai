import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { INTEGRATIONS } from "@/lib/integrations/registry";
import { OAUTH_PROVIDERS, isProviderConfigured } from "@/lib/integrations/oauth";
import { isEncryptionConfigured } from "@/lib/integrations/crypto";

export const runtime = "nodejs";

/**
 * GET /api/admin/integrations — admin health view.
 * Returns aggregate counts and the audit trail. Column selection is explicit:
 * token ciphertext columns are NEVER selected, so no secret can leak into the
 * admin UI even accidentally.
 */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const { data: connections, error: connErr } = await admin
    .from("verxa_integration_connections")
    .select("provider,status,created_at,updated_at");
  const { data: events, error: evErr } = await admin
    .from("verxa_integration_events")
    .select("provider,event,detail,created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (connErr || evErr) {
    return NextResponse.json(
      { error: "Integration tables missing. Run supabase/integrations.sql first." },
      { status: 500 },
    );
  }

  const byProvider = INTEGRATIONS.map((def) => {
    const rows = (connections ?? []).filter((c) => c.provider === def.id);
    return {
      id: def.id,
      name: def.name,
      enabled: def.enabled,
      configured: isProviderConfigured(def.id),
      providerConfig: OAUTH_PROVIDERS[def.id] ? "present" : "missing",
      totalConnections: rows.length,
      active: rows.filter((r) => r.status === "active").length,
      needsReauth: rows.filter((r) => r.status === "needs_reauth").length,
      revoked: rows.filter((r) => r.status === "revoked").length,
      errors: rows.filter((r) => r.status === "error").length,
    };
  });

  return NextResponse.json({
    health: {
      encryptionKey: isEncryptionConfigured() ? "configured" : "MISSING",
    },
    providers: byProvider,
    recentEvents: events ?? [],
  });
}
