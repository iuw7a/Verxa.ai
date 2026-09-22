import "server-only";

/**
 * Reusable OAuth 2.0 (authorization-code) provider architecture.
 *
 * Adding a new provider = adding one entry to PROVIDERS (metadata) with its
 * auth/token/refresh endpoints and default scopes. Everything else — connect
 * route, callback route, token exchange, encrypted storage, refresh, revoke —
 * is generic and provider-agnostic.
 */

export type OAuthScopeSpec = {
  scope: string; // provider scope string
  label: string; // human-readable permission label for the UI
};

export type OAuthProviderConfig = {
  id: string; // 'google', 'github', ...
  name: string;
  authUrl: string;
  tokenUrl: string;
  revokeUrl?: string;
  /** Extra query params for the authorization URL (e.g. Google's access_type). */
  authParams?: Record<string, string>;
  /** Scopes requested by default for this provider's base connection. */
  defaultScopes: OAuthScopeSpec[];
  /** Optional per-tool extra scopes (kept minimal by design). */
  extraScopes?: OAuthScopeSpec[];
  /** How the provider returns granted scopes on the token response. */
  scopeResponseField?: "scope" | "scopes";
};

export const OAUTH_PROVIDERS: Record<string, OAuthProviderConfig> = {
  google: {
    id: "google",
    name: "Google",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    authParams: {
      access_type: "offline", // refresh token
      prompt: "consent", // force refresh token issuance on reconnect
      include_granted_scopes: "true",
    },
    // Minimum viable scopes: read-only Gmail metadata/messages, calendar and
    // drive file access. NO gmail.modify / gmail.send — sending requires
    // explicit user confirmation per draft and a future scope decision.
    defaultScopes: [
      {
        scope: "https://www.googleapis.com/auth/gmail.readonly",
        label: "Read your email (Gmail, read-only)",
      },
      {
        scope: "https://www.googleapis.com/auth/gmail.metadata",
        label: "Read email metadata (sender, subject, labels)",
      },
      {
        scope: "https://www.googleapis.com/auth/calendar.readonly",
        label: "Read your calendars and events (read-only)",
      },
      {
        scope: "https://www.googleapis.com/auth/drive.readonly",
        label: "See and download your Google Drive files (read-only)",
      },
      {
        scope: "https://www.googleapis.com/auth/userinfo.email",
        label: "Know which Google account you connected",
      },
    ],
    scopeResponseField: "scope",
  },
};

export type ProviderCredentials = { clientId: string; clientSecret: string };

/** Reads provider credentials from env only. Never hardcode, never return to client. */
export function getProviderCredentials(providerId: string): ProviderCredentials | null {
  const map: Record<string, [string | undefined, string | undefined]> = {
    google: [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET],
  };
  const [clientId, clientSecret] = map[providerId] ?? [undefined, undefined];
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function isProviderConfigured(providerId: string): boolean {
  return getProviderCredentials(providerId) !== null;
}

/**
 * Resolves the redirect URI for a provider: explicit env override
 * (GOOGLE_REDIRECT_URI) or derived from the request origin.
 */
export function getRedirectUri(providerId: string, origin: string): string {
  const overrides: Record<string, string | undefined> = {
    google: process.env.GOOGLE_REDIRECT_URI,
  };
  return overrides[providerId] ?? `${origin.replace(/\/+$/, "")}/api/integrations/${providerId}/callback`;
}

export type TokenSet = {
  accessToken: string;
  refreshToken?: string | null;
  expiresIn?: number | null; // seconds
  scope?: string | null;
};

export type TokenEndpointResult =
  | { ok: true; tokens: TokenSet }
  | { ok: false; status: number; errorCode: string; description: string };

/** Standard OAuth2 authorization-code exchange. Server-side only. */
export async function exchangeCodeForTokens(
  provider: OAuthProviderConfig,
  creds: ProviderCredentials,
  code: string,
  redirectUri: string,
): Promise<TokenEndpointResult> {
  try {
    const body = new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });
    const res = await fetch(provider.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body,
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string | string[];
      error?: string;
      error_description?: string;
    };
    if (!res.ok || !json.access_token) {
      return {
        ok: false,
        status: res.status,
        errorCode: json.error ?? "token_exchange_failed",
        description: json.error_description ?? `Token exchange failed (HTTP ${res.status}).`,
      };
    }
    return {
      ok: true,
      tokens: {
        accessToken: json.access_token,
        refreshToken: json.refresh_token ?? null,
        expiresIn: json.expires_in ?? null,
        scope: Array.isArray(json.scope) ? json.scope.join(" ") : (json.scope ?? null),
      },
    };
  } catch {
    return { ok: false, status: 502, errorCode: "network_error", description: "Could not reach the provider's token endpoint." };
  }
}

/** Refresh an expired access token. Server-side only. */
export async function refreshAccessToken(
  provider: OAuthProviderConfig,
  creds: ProviderCredentials,
  refreshToken: string,
): Promise<TokenEndpointResult> {
  try {
    const body = new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    const res = await fetch(provider.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body,
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
      scope?: string | string[];
      error?: string;
      error_description?: string;
    };
    if (!res.ok || !json.access_token) {
      const invalidGrant = json.error === "invalid_grant";
      return {
        ok: false,
        status: res.status,
        errorCode: invalidGrant ? "invalid_grant" : (json.error ?? "refresh_failed"),
        description: invalidGrant
          ? "The connection was revoked or expired. Please reconnect."
          : (json.error_description ?? `Token refresh failed (HTTP ${res.status}).`),
      };
    }
    return {
      ok: true,
      tokens: {
        accessToken: json.access_token,
        refreshToken: null, // providers usually don't re-issue refresh tokens
        expiresIn: json.expires_in ?? null,
        scope: Array.isArray(json.scope) ? json.scope.join(" ") : (json.scope ?? null),
      },
    };
  } catch {
    return { ok: false, status: 502, errorCode: "network_error", description: "Could not reach the provider's token endpoint." };
  }
}

/** Best-effort server-side revocation so the provider forgets the grant. */
export async function revokeToken(provider: OAuthProviderConfig, accessToken: string): Promise<boolean> {
  if (!provider.revokeUrl) return false;
  try {
    const res = await fetch(provider.revokeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: accessToken }),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}
