# Verxa Email System (Resend)

Production-ready email infrastructure. Central rule: **only
`src/lib/email/service.ts` talks to Resend** — every feature emits events,
never raw sends.

## Secrets (server-only, never in the browser)

| Variable | Where | Purpose |
|---|---|---|
| `RESEND_API_KEY` | `.env.local` + Vercel Production | Sending (required) |
| `RESEND_FROM_DOMAIN` | optional | Sender domain, default `verxa.de` (verified) |
| `RESEND_REPLY_TO` | optional | Default reply-to, default `support@verxa.de` |
| `RESEND_FROM_EMAIL` | optional | Default from, default `notifications@verxa.de` |
| `RESEND_WEBHOOK_SECRET` | Vercel Production (add when created) | Svix verification for `/api/email/webhooks` |
| `INTEGRATION_ENCRYPTION_KEY` | existing | HMAC for unsubscribe tokens |

`RESEND_API_KEY` is referenced only from `src/lib/email/*` and the legacy
`src/lib/email.ts` transport — both server-only. Verified: the key does not
appear in `.next/static` client bundles.

## One-time setup

1. **Database** — run `supabase/email-system.sql` in the Supabase SQL editor.
   Creates `verxa_email_preferences`, `verxa_email_tokens`,
   `verxa_email_rate_limits`, `verxa_login_devices` and extends
   `verxa_email_logs`. The app degrades gracefully until this is done
   (sends still work; tokens/consent/logs are skipped safely).
2. **Webhooks** — Resend Dashboard → Webhooks → add
   `https://verxa.de/api/email/webhooks`, subscribe to
   `email.sent/delivered/delivery_delayed/bounced/complained/opened/clicked/failed`,
   copy the signing secret to `RESEND_WEBHOOK_SECRET` (Production) and redeploy.
   Until then the endpoint answers 503 (delivery tracking off, sending unaffected).
3. **Supabase Auth emails (optional, recommended)** — our Resend flows
   (verification, password reset) work standalone. To avoid *duplicate*
   mails, set Supabase Dashboard → Auth → Email to either disable
   "Confirm email" or route Auth SMTP through Resend.

## Architecture

```
product code → emitEmailEvent(EVENT, {to, vars})
  → EVENT_POLICY (template + sender)
  → sendTransactional / sendMarketing
  → consent gate (marketing only, default-deny)
  → renderTemplate (en/de/ar, RTL for ar, HTML + text)
  → sendRawEmail (Resend, idempotency key) → verxa_email_logs
```

- `src/lib/email/config.ts` — sender identities (`EMAIL_SENDERS`), domain, status.
- `src/lib/email/templates/*.ts` — 83 templates in 7 groups (auth, account,
  product, billing, marketing, legal, support). Each has id, category,
  transactional/marketing kind, sender, localized subjects, block bodies.
- `src/lib/email/events.ts` — 70 events → policy map + `emitEmailEvent`.
- `src/lib/email/tokens.ts` — hashed single-use tokens (verify/reset, TTL
  24h/60min) + stateless HMAC unsubscribe tokens.
- `src/lib/email/rate-limit.ts` — per-address fixed windows (reset 5/h,
  verify 5/h, login 10/d).
- `src/lib/email/preferences.ts` — consent storage + `canSendMarketing`.
- `src/lib/email/webhooks.ts` — Svix verification + log updates.
- `supabase/email-system.sql` — schema.

## User flows

- Sign up → `auth-welcome` + `auth-verify` (`/verify-email?token=`).
- Forgot password → `/forgot-password` → `auth-password-reset-request`
  (60-min single-use link → `/reset-password?token=`) → `auth-password-changed`.
- Sign in → `/api/email/events/login` records the device; only *new*
  devices get `auth-new-login` (30-day cooldown, no refresh spam).
- Settings → Email preferences (server-backed, incl. marketing opt-in).
- Every marketing mail carries a signed `/unsubscribe?token=` link (one-click,
  no login). Transactional/security mails always deliver.
- Admin → Emails tab: Resend/webhook status, template library, consent stats,
  logs, composer, resend. API: `/api/admin/emails?view=config|stats|templates|events`.

## Testing checklist (pre-release)

- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` green
- [ ] Signup → verification mail → click → welcome mail
- [ ] Forgot password → reset → confirm `auth-password-changed`
- [ ] Expired/reused/invalid reset + verify tokens show correct states
- [ ] Rate limits (6th reset request → 429)
- [ ] New-device login mail once; refresh silent
- [ ] Marketing blocked without consent; delivered after opt-in
- [ ] Unsubscribe stops marketing, transactional still arrives
- [ ] API key create/revoke mails; ticket create/reply mails
- [ ] Webhook: send → delivered/bounced reflected in logs
- [ ] Mobile rendering spot-check (Gmail/Apple Mail/Outlook)
