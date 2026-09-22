import { NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { apiJson } from "@/lib/api-auth";
import { emitEmailEvent } from "@/lib/email/events";

export const runtime = "nodejs";

/** DELETE /api/keys?id=... — revoke (soft) or hard-delete one of my keys. */
export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabase();
  if (!supabase) return apiJson(500, { error: "Auth not configured." });
  const { data } = await supabase.auth.getUser();
  if (!data.user) return apiJson(401, { error: "Not signed in." });

  const admin = createAdminSupabase();
  if (!admin) return apiJson(500, { error: "Service key not configured." });

  const id = req.nextUrl.searchParams.get("id") ?? "";
  const mode = req.nextUrl.searchParams.get("mode") ?? "revoke";
  if (!id) return apiJson(400, { error: "Missing key id." });

  // RLS-equivalent check: the key must belong to the caller.
  const { data: owned } = await admin
    .from("verxa_api_keys")
    .select("id,name,key_prefix")
    .eq("id", id)
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (!owned) return apiJson(404, { error: "Key not found." });
  const meta = owned as { name?: string; key_prefix?: string };

  if (mode === "delete") {
    const { error } = await admin
      .from("verxa_api_keys")
      .delete()
      .eq("id", id)
      .eq("user_id", data.user.id);
    if (error) return apiJson(500, { error: error.message });
    if (data.user.email) {
      void emitEmailEvent("API_KEY_REVOKED", {
        to: data.user.email,
        userId: data.user.id,
        vars: {
          email: data.user.email,
          keyName: meta.name ?? "API key",
          keyPrefix: meta.key_prefix ?? "",
          timestamp: new Date().toISOString(),
        },
      });
    }
    return apiJson(200, { ok: true, mode: "delete" });
  }

  const { error } = await admin
    .from("verxa_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", data.user.id)
    .is("revoked_at", null);
  if (error) return apiJson(500, { error: error.message });
  if (data.user.email) {
    void emitEmailEvent("API_KEY_REVOKED", {
      to: data.user.email,
      userId: data.user.id,
      vars: {
        email: data.user.email,
        keyName: meta.name ?? "API key",
        keyPrefix: meta.key_prefix ?? "",
        timestamp: new Date().toISOString(),
      },
    });
  }
  return apiJson(200, { ok: true, mode: "revoke" });
}
