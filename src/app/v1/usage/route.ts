import { NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import { apiJson, authenticateApiRequest } from "@/lib/api-auth";

export const runtime = "nodejs";

/** GET /v1/usage — usage stats for the caller's key. */
export async function GET(_req: NextRequest) {
  const auth = await authenticateApiRequest(_req);
  if (!auth.ok) {
    return apiJson(auth.status, {
      error: { code: auth.code, message: auth.message },
    });
  }
  const { ctx } = auth;

  if (ctx.keyId.startsWith("session:")) {
    return apiJson(200, {
      plan: ctx.plan,
      limits: ctx.limits,
      days: [],
      totals: { requests: 0, tokens_in: 0, tokens_out: 0 },
      note: "Session-based call — stats are tracked per API key.",
    });
  }

  const admin = createAdminSupabase();
  if (!admin) {
    return apiJson(500, {
      error: { code: "server_config", message: "Service key not configured." },
    });
  }

  const since = new Date(Date.now() - 30 * 86400_000)
    .toISOString()
    .slice(0, 10);
  const { data: rows } = await admin
    .from("verxa_api_usage")
    .select("day,requests,tokens_in,tokens_out")
    .eq("key_id", ctx.keyId)
    .gte("day", since)
    .order("day", { ascending: true });

  const days = rows ?? [];
  const totals = days.reduce(
    (acc, d) => ({
      requests: acc.requests + d.requests,
      tokens_in: acc.tokens_in + d.tokens_in,
      tokens_out: acc.tokens_out + d.tokens_out,
    }),
    { requests: 0, tokens_in: 0, tokens_out: 0 },
  );

  return apiJson(200, {
    plan: ctx.plan,
    limits: ctx.limits,
    days,
    totals,
  });
}
