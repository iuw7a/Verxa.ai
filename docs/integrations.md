# Verxa — Plugin & OAuth Integration System

Google (Gmail · Calendar · Drive) is live. This guide covers setup, local
development, production configuration, and how to add more providers later.

---

## 1. Google Cloud configuration

1. Google Cloud Console → **APIs & Services → Library** — enable:
   * **Gmail API**
   * **Google Calendar API**
   * **Google Drive API**
2. **APIs & Services → OAuth consent screen**
   * User type: External (or Internal for a Workspace)
   * Add the scopes the app requests (see §4)
   * While in *Testing*, add your Google account under **Test users** —
     otherwise Google shows "App not verified" and blocks the grant.
3. **Credentials → OAuth 2.0 Client ID** (Web application):
   * Authorized redirect URI (production):
     `https://verxa.de/api/integrations/google/callback`
   * Authorized redirect URI (local dev):
     `http://localhost:3000/api/integrations/google/callback`

## 2. Environment variables

| Variable | Where | Value |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `.env.local` + Vercel | your OAuth client id |
| `GOOGLE_CLIENT_SECRET` | `.env.local` + Vercel (**secret**) | from Google Console |
| `GOOGLE_REDIRECT_URI` | optional | only needed to override the default (`<origin>/api/integrations/google/callback`) |
| `INTEGRATION_ENCRYPTION_KEY` | `.env.local` + Vercel (**secret**) | 64 hex chars — `openssl rand -hex 32` |

Never commit real values — `.env.example` holds placeholders only.

## 3. Local development

```bash
npm run dev
# → http://localhost:3000/plugins
```

Sign in → **Plugins → Google → Connect** → approve on Google → you land back
on `/plugins` with `?connected=google` and the card shows **Connected**.

## 4. Scopes requested (minimum by design)

* `gmail.readonly` — read emails
* `gmail.metadata` — sender/subject/labels
* `calendar.readonly` — read events
* `drive.readonly` — find files
* `userinfo.email` — display the connected account

No send/modify/delete scopes. Any future send/draft-send feature must add the
scope deliberately AND require explicit user confirmation in the UI.

## 5. Architecture

```
src/lib/integrations/
  oauth.ts      # provider registry (endpoints, scopes) + code exchange/refresh/revoke
  crypto.ts     # AES-256-GCM token encryption (INTEGRATION_ENCRYPTION_KEY)
  store.ts      # user-scoped connections; the only module touching ciphertext
  registry.ts   # client-safe catalog (cards, tools, categories)
  detect.ts     # chat message → integration tool mapping
  tools/gmail.ts# Gmail tool implementations (list/search/read)
supabase/integrations.sql   # tables + RLS (verxa_integration_connections / _events)
src/app/api/integrations/
  route.ts                       # GET catalog + connection status
  [provider]/connect/route.ts    # start OAuth (state cookie, CSRF)
  [provider]/callback/route.ts   # validate state → exchange → encrypt → store
  [provider]/disconnect/route.ts # revoke + delete
  [provider]/tools/[tool]/route.ts  # secure tool execution
  [provider]/ai-gate/route.ts    # AI connection check
src/app/plugins/page.tsx        # Plugins UI (search, categories, modal)
```

## 6. Add a new OAuth provider (e.g. GitHub)

1. `src/lib/integrations/oauth.ts` — add an `OAUTH_PROVIDERS` entry
   (auth/token/revoke URLs, default scopes) and its env credentials in
   `getProviderCredentials` (e.g. `GITHUB_CLIENT_ID/SECRET`).
2. `src/lib/integrations/registry.ts` — add an `INTEGRATIONS` entry
   (name, category, permissions, tools).
3. Routes: nothing — connect/callback/disconnect are generic and just work.
4. Tools: add `src/lib/integrations/tools/<provider>.ts` and a `case` in the
   tools route.

## 7. Add a new AI tool to an integration

1. Implement it in `src/lib/integrations/tools/<provider>.ts` (server-only,
   takes an access token, returns plain data).
2. Register a `case "<provider>:<tool>"` in
   `src/app/api/integrations/[provider]/tools/[tool]/route.ts`.
3. List it in the integration's `tools` array in `registry.ts`.
4. Optional: teach `detect.ts` when the chat should trigger it.

## 8. Security model (summary)

* Client secret + tokens live server-side only; the browser never sees any.
* Tokens encrypted at rest (AES-256-GCM); DB stores ciphertext only.
* OAuth `state` in an HttpOnly cookie; callback verifies equality (CSRF).
* Every route re-verifies the Supabase session; rows are RLS-owner-scoped.
* Expired access tokens auto-refresh via refresh token; `invalid_grant`
  marks the connection `revoked`/`needs_reauth` instead of failing hard.
* Disconnect revokes at Google and deletes the row; audit events are
  append-only and contain no tokens or email content.
* Admin view exposes counts/statuses/events only — token columns are never
  selected anywhere in admin code.

## 9. Deploy checklist (production)

1. Vercel env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `INTEGRATION_ENCRYPTION_KEY` (Production + Preview).
2. Google Console: production redirect URI authorized (§1.3).
3. OAuth consent screen published (or users added as test users).
4. Redeploy → test the full flow: Connect → consent → callback → Connected →
   "check my gmail" in chat → Disconnect.
