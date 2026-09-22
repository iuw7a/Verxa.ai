import { NextRequest, NextResponse } from "next/server";
import { OAUTH_PROVIDERS, exchangeCodeForTokens, getProviderCredentials, getRedirectUri } from "@/lib/integrations/oauth";
import { getAuthenticatedUserId, logIntegrationEvent, upsertConnection } from "@/lib/integrations/store";

export const runtime = "nodejs";

/**
 * GET /api/integrations/:provider/callback
 * OAuth redirect target. Validates state (CSRF), exchanges the code for
 * tokens server-side, encrypts them, stores the connection, and redirects to
 * /plugins with a status flag. Tokens never appear in any URL or cookie.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await params;
  const origin = req.nextUrl.origin;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const oauthError = req.nextUrl.searchParams.get("error");
  const cookieName = `verxa_oauth_state_${providerId}`;
  const cookieState = req.cookies.get(cookieName)?.value;

  const fail = (reason: string) => {
    const url = new URL("/plugins", origin);
    url.searchParams.set("error", reason);
    const res = NextResponse.redirect(url);
    res.cookies.delete(cookieName);
    return res;
  };

  // User denied the consent screen.
  if (oauthError) {
    const userId = await getAuthenticatedUserId();
    if (userId) {
      await logIntegrationEvent(userId, providerId, "auth_error", `user denied: ${oauthError}`);
    }
    return fail(oauthError === "access_denied" ? "denied" : "provider_error");
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) return fail("session_expired");

  // CSRF: state must exist in the cookie AND match the callback value.
  if (!code || !state || !cookieState || cookieState !== state) {
    await logIntegrationEvent(userId, providerId, "auth_error", "invalid or missing state");
    return fail("invalid_state");
  }

  const provider = OAUTH_PROVIDERS[providerId];
  const creds = getProviderCredentials(providerId);
  if (!provider || !creds) return fail("not_configured");

  const result = await exchangeCodeForTokens(provider, creds, code, getRedirectUri(providerId, origin));
  if (!result.ok) {
    await logIntegrationEvent(userId, providerId, "auth_error", `exchange failed: ${result.errorCode}`);
    return fail(result.errorCode === "invalid_grant" ? "invalid_code" : "exchange_failed");
  }

  // Google returns the granted scope string; parse to a list.
  const scopes = (result.tokens.scope ?? "")
    .split(/[\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Account label: fetch the email from Google's userinfo endpoint (display only).
  let accountLabel: string | null = null;
  if (providerId === "google") {
    try {
      const ui = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${result.tokens.accessToken}` },
        cache: "no-store",
      });
      if (ui.ok) {
        const j = (await ui.json()) as { email?: string };
        accountLabel = j.email ?? null;
      }
    } catch {
      /* display-only — ignore */
    }
  }

  try {
    await upsertConnection({
      userId,
      provider: providerId,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.tokens.expiresIn,
      scopes,
      accountLabel,
    });
    await logIntegrationEvent(userId, providerId, "connect", `${scopes.length} scopes granted`);
  } catch {
    return fail("storage_failed");
  }

  const url = new URL("/plugins", origin);
  url.searchParams.set("connected", providerId);
  const res = NextResponse.redirect(url);
  res.cookies.delete(cookieName);
  return res;
}
