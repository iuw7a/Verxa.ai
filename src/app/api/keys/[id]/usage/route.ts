import { NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { apiJson } from "@/lib/api-auth";

export const runtime = "nodejs";

/** GET /api/keys/:id/usage — last 30 days of daily usage for one key. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabase();
  if (!supabase) return apiJson(500, { error: "Auth not configured." });
  const { data } = await supabase.auth.getUser();
  if (!data.user) return apiJson(401, { error: "Not signed in." });

  const admin = createAdminSupabase();
  if (!admin) return apiJson(500, { error: "Service key not configured." });

  const { id } = await params;

  const { data: owned } = await admin
    .from("verxa_api_keys")
    .select("id")
    .eq("id", id)
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (!owned) return apiJson(404, { error: "Key not found." });

  const since = new Date(Date.now() - 30 * 86400_000)
    .toISOString()
    .slice(0, 10);
  const { data: rows, error } = await admin
    .from("verxa_api_usage")
    .select("day,requests,tokens_in,tokens_out")
    .eq("key_id", id)
    .gte("day", since)
    .order("day", { ascending: true });

  if (error) return apiJson(500, { error: error.message });

  const days = rows ?? [];
  const totals = days.reduce(
    (acc, d) => ({
      requests: acc.requests + d.requests,
      tokensIn: acc.tokensIn + d.tokens_in,
      tokensOut: acc.tokensOut + d.tokens_out,
    }),
    { requests: 0, tokensIn: 0, tokensOut: 0 },
  );

  return apiJson(200, { days, totals });
}
