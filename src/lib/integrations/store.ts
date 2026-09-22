import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/admin";
import {
  OAUTH_PROVIDERS,
  getProviderCredentials,
  refreshAccessToken,
  type OAuthProviderConfig,
} from "@/lib/integrations/oauth";
import { decryptToken, encryptToken } from "@/lib/integrations/crypto";

/**
 * Server-side connection store: the ONLY module that touches token ciphertext.
 * Every function is user-scoped by the authenticated Supabase session — one
 * user can never read or affect another user's connections.
 */

export type ConnectionStatus = "active" | "needs_reauth" | "revoked" | "error";

export type ConnectionRow = {
  id: string;
  user_id: string;
  provider: string;
  scopes: string[];
  account_label: string | null;
  status: ConnectionStatus;
  status_message: string | null;
  access_token_enc: string | null;
  refresh_token_enc: string | null;
  expires_at: string | null;
  last_refreshed_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Shape returned to the frontend — contains NO token material, ever. */
export type PublicConnection = {
  provider: string;
  status: ConnectionStatus;
  scopes: string[];
  accountLabel: string | null;
  connectedAt: string;
  expiresAt: string | null;
};

export function toPublicConnection(row: ConnectionRow): PublicConnection {
  return {
    provider: row.provider,
    status: row.status,
    scopes: row.scopes ?? [],
    accountLabel: row.account_label,
    connectedAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export async function getConnection(userId: string, provider: string): Promise<ConnectionRow | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("verxa_integration_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  return (data as ConnectionRow) ?? null;
}

export async function listConnections(userId: string): Promise<ConnectionRow[]> {
  const supabase = await createServerSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("verxa_integration_connections")
    .select("*")
    .eq("user_id", userId);
  return (data as ConnectionRow[]) ?? [];
}

export type UpselectInput = {
  userId: string;
  provider: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresIn?: number | null;
  scopes: string[];
  accountLabel?: string | null;
};

/** Upsert a connection with freshly exchanged tokens (encrypted before insert). */
export async function upsertConnection(input: UpselectInput): Promise<void> {
  const admin = createAdminSupabase();
  if (!admin) throw new Error("Database not configured.");
  const expiresAt = input.expiresIn
    ? new Date(Date.now() + input.expiresIn * 1000).toISOString()
    : null;
  const { error } = await admin
    .from("verxa_integration_connections")
    .upsert(
      {
        user_id: input.userId,
        provider: input.provider,
        scopes: input.scopes,
        account_label: input.accountLabel ?? null,
        status: "active",
        status_message: null,
        access_token_enc: encryptToken(input.accessToken),
        refresh_token_enc: input.refreshToken ? encryptToken(input.refreshToken) : null,
        expires_at: expiresAt,
        last_refreshed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    );
  if (error) throw error;
}

export async function setConnectionStatus(
  userId: string,
  provider: string,
  status: ConnectionStatus,
  message?: string,
): Promise<void> {
  const admin = createAdminSupabase();
  if (!admin) return;
  await admin
    .from("verxa_integration_connections")
    .update({
      status,
      status_message: message ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", provider);
}

/** Deletes the connection row after best-effort provider-side revocation. */
export async function deleteConnection(userId: string, provider: string): Promise<void> {
  const row = await getConnection(userId, provider);
  if (row?.access_token_enc) {
    try {
      const provider0 = OAUTH_PROVIDERS[provider];
      const { revokeToken } = await import("@/lib/integrations/oauth");
      if (provider0) await revokeToken(provider0, decryptToken(row.access_token_enc));
    } catch {
      /* best-effort — the local row is removed regardless */
    }
  }
  const supabase = await createServerSupabase();
  if (!supabase) return;
  await supabase
    .from("verxa_integration_connections")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);
}

export async function logIntegrationEvent(
  userId: string | null,
  provider: string,
  event: "connect" | "disconnect" | "auth_error" | "token_refresh" | "refresh_failed" | "revoked" | "scope_warning",
  detail?: string,
): Promise<void> {
  // Never log tokens or message content — detail is a short status string only.
  const admin = createAdminSupabase();
  if (!admin) return;
  await admin.from("verxa_integration_events").insert({
    user_id: userId,
    provider,
    event,
    detail: detail?.slice(0, 300) ?? null,
  });
}

/* ------------------------------------------------------------------ */
/* Fresh-token resolution with automatic refresh                       */
/* ------------------------------------------------------------------ */

export type ResolveResult =
  | { ok: true; accessToken: string; row: ConnectionRow }
  | { ok: false; reason: "not_connected" | "no_token" | "reauth_required"; message: string };

/**
 * Returns a valid access token for the user's connection, refreshing it if
 * expired. Marks the connection `needs_reauth` on irrevocable failures.
 */
export async function resolveAccessToken(
  userId: string,
  providerId: string,
): Promise<ResolveResult> {
  const row = await getConnection(userId, providerId);
  if (!row) {
    return { ok: false, reason: "not_connected", message: `Connect ${providerId} first.` };
  }
  if (!row.access_token_enc) {
    return { ok: false, reason: "no_token", message: "The stored credential is missing. Reconnect the integration." };
  }

  const notExpired =
    row.expires_at && new Date(row.expires_at).getTime() > Date.now() + 60_000;
  if (notExpired || !row.expires_at) {
    try {
      return { ok: true, accessToken: decryptToken(row.access_token_enc), row };
    } catch {
      await setConnectionStatus(userId, providerId, "error", "Stored credential could not be decrypted (key changed?). Reconnect.");
      return { ok: false, reason: "no_token", message: "Stored credential is unreadable. Reconnect the integration." };
    }
  }

  // Expired → try refresh.
  const provider = OAUTH_PROVIDERS[providerId];
  const creds = getProviderCredentials(providerId);
  if (!provider || !creds || !row.refresh_token_enc) {
    await setConnectionStatus(userId, providerId, "needs_reauth", "Session expired. Please reconnect.");
    await logIntegrationEvent(userId, providerId, "refresh_failed", "no refresh token / provider not configured");
    return { ok: false, reason: "reauth_required", message: "Session expired. Please reconnect the integration." };
  }

  try {
    const refreshToken = decryptToken(row.refresh_token_enc);
    const result = await refreshAccessToken(provider, creds, refreshToken);
    if (!result.ok) {
      const revoked = result.errorCode === "invalid_grant";
      await setConnectionStatus(
        userId,
        providerId,
        revoked ? "revoked" : "needs_reauth",
        result.description,
      );
      await logIntegrationEvent(userId, providerId, revoked ? "revoked" : "refresh_failed", result.errorCode);
      return { ok: false, reason: "reauth_required", message: result.description };
    }
    // Persist refreshed access token (refresh token typically not re-issued).
    const admin = createAdminSupabase();
    const expiresAt = result.tokens.expiresIn
      ? new Date(Date.now() + result.tokens.expiresIn * 1000).toISOString()
      : null;
    if (admin) {
      await admin
        .from("verxa_integration_connections")
        .update({
          access_token_enc: encryptToken(result.tokens.accessToken),
          expires_at: expiresAt,
          last_refreshed_at: new Date().toISOString(),
          status: "active",
          status_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("provider", providerId);
    }
    await logIntegrationEvent(userId, providerId, "token_refresh");
    const fresh = await getConnection(userId, providerId);
    return fresh
      ? { ok: true, accessToken: result.tokens.accessToken, row: fresh }
      : { ok: false, reason: "no_token", message: "Connection vanished mid-refresh." };
  } catch {
    await setConnectionStatus(userId, providerId, "error", "Token refresh failed unexpectedly.");
    await logIntegrationEvent(userId, providerId, "refresh_failed", "exception");
    return { ok: false, reason: "reauth_required", message: "Could not refresh the connection. Reconnect it." };
  }
}

/** Authenticated user id from cookies, or null. Used by every API route. */
export async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}
