import { NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  generateApiKey,
  hashApiKey,
  keyDisplayPrefix,
  planLimitsFor,
} from "@/lib/api-keys";
import { apiJson } from "@/lib/api-auth";
import { emitEmailEvent } from "@/lib/email/events";

export const runtime = "nodejs";

/** GET /api/keys — list the signed-in user's keys. */
export async function GET() {
  const supabase = await createServerSupabase();
  if (!supabase) return apiJson(500, { error: "Auth not configured." });
  const { data } = await supabase.auth.getUser();
  if (!data.user) return apiJson(401, { error: "Not signed in." });

  const admin = createAdminSupabase();
  if (!admin) return apiJson(500, { error: "Service key not configured." });

  const { data: keys, error } = await admin
    .from("verxa_api_keys")
    .select("id,name,key_prefix,created_at,last_used_at,revoked_at")
    .eq("user_id", data.user.id)
    .order("created_at", { ascending: false });

  if (error) return apiJson(500, { error: error.message });

  const { data: sub } = await admin
    .from("verxa_subscriptions")
    .select("plan,status")
    .eq("user_id", data.user.id)
    .eq("status", "active")
    .maybeSingle();

  return apiJson(200, {
    keys: keys ?? [],
    plan: sub?.plan === "pro" ? "pro" : "free",
  });
}

/** POST /api/keys — create a key. The raw key is returned exactly once. */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  if (!supabase) return apiJson(500, { error: "Auth not configured." });
  const { data } = await supabase.auth.getUser();
  if (!data.user) return apiJson(401, { error: "Not signed in." });

  const admin = createAdminSupabase();
  if (!admin) return apiJson(500, { error: "Service key not configured." });

  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = (body.name ?? "").trim().slice(0, 60) || "Untitled key";

  const { data: sub } = await admin
    .from("verxa_subscriptions")
    .select("plan,status")
    .eq("user_id", data.user.id)
    .eq("status", "active")
    .maybeSingle();
  const plan = sub?.plan === "pro" ? "pro" : "free";
  const limits = planLimitsFor(plan);

  const { count } = await admin
    .from("verxa_api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", data.user.id)
    .is("revoked_at", null);

  if ((count ?? 0) >= limits.maxKeys) {
    return apiJson(403, {
      error:
        plan === "free"
          ? `The Free plan allows ${limits.maxKeys} active API key. Upgrade to Pro for unlimited keys.`
          : `You reached the limit of ${limits.maxKeys} active keys.`,
      code: "key_limit_reached",
      plan,
      maxKeys: limits.maxKeys,
    });
  }

  const raw = generateApiKey();
  const { data: inserted, error } = await admin
    .from("verxa_api_keys")
    .insert({
      user_id: data.user.id,
      name,
      key_prefix: keyDisplayPrefix(raw),
      key_hash: hashApiKey(raw),
    })
    .select("id,name,key_prefix,created_at")
    .single();

  if (error) return apiJson(500, { error: error.message });

  if (data.user.email) {
    void emitEmailEvent("API_KEY_CREATED", {
      to: data.user.email,
      userId: data.user.id,
      vars: {
        email: data.user.email,
        keyName: name,
        keyPrefix: keyDisplayPrefix(raw),
        timestamp: new Date().toISOString(),
      },
    });
  }

  return apiJson(201, { key: { ...inserted }, secret: raw, plan });
}
