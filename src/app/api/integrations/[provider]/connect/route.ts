import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { OAUTH_PROVIDERS, getProviderCredentials, getRedirectUri, isProviderConfigured } from "@/lib/integrations/oauth";
import { getAuthenticatedUserId, logIntegrationEvent } from "@/lib/integrations/store";
import { getIntegration } from "@/lib/integrations/registry";

export const runtime = "nodejs";

/**
 * GET /api/integrations/:provider/connect
 * Starts the OAuth authorization-code flow:
 *  1. must be signed in (Verxa session cookie)
 *  2. provider must exist, be enabled, and have server-side credentials
 *  3. sets an HttpOnly, SameSite=Lax, 10-minute state cookie (CSRF protection)
 *  4. 302-redirects to the provider's consent screen
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await params;
  const origin = req.nextUrl.origin;

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    // Not signed in → send to sign-in, then bounce back here.
    const url = new URL("/chat", origin);
    url.searchParams.set("authRequired", "1");
    url.searchParams.set("after", `/api/integrations/${providerId}/connect`);
    return NextResponse.redirect(url);
  }

  const provider = OAUTH_PROVIDERS[providerId];
  const def = getIntegration(providerId);
  if (!provider || !def?.enabled) {
    return NextResponse.redirect(new URL("/plugins?error=unknown_integration", origin));
  }
  if (!isProviderConfigured(providerId)) {
    await logIntegrationEvent(userId, providerId, "auth_error", "provider not configured (missing env credentials)");
    return NextResponse.redirect(new URL("/plugins?error=not_configured", origin));
  }

  const creds = getProviderCredentials(providerId)!;
  const redirectUri = getRedirectUri(providerId, origin);
  const state = randomBytes(24).toString("base64url");

  const authUrl = new URL(provider.authUrl);
  authUrl.searchParams.set("client_id", creds.clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set(
    "scope",
    provider.defaultScopes.map((s) => s.scope).join(" "),
  );
  authUrl.searchParams.set("state", state);
  for (const [k, v] of Object.entries(provider.authParams ?? {})) {
    authUrl.searchParams.set(k, v);
  }

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set(`verxa_oauth_state_${providerId}`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
