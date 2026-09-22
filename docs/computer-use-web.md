# Verxa Computer Use (web-only, embedded)

Computer Use lives only in the website — embedded in the landing page (`/`)
and in `/chat` via the "Computer Use" toggle. There is no separate
`/computer-use` route: users never leave the page. The desktop connector is
only the executor on the user's machine — it runs silently in the tray. All
authorization is server-side and tied to the account; nothing is stored only
in `localStorage`, and the UI never reports a connection the backend did not
confirm.

## One-time setup

1. **Database** — run `supabase/computer-use-runs.sql` in the Supabase SQL
   editor (creates `verxa_computer_runs`, `verxa_computer_run_events`,
   `verxa_computer_confirmations`). `supabase/desktop.sql` must already be
   applied (device auth, sessions, consent).
2. **Vercel env** — no new variables. The existing `NVIDIA_API_KEY` /
   `XKIRO_API_KEY` power the reasoning step endpoint.

## The flow

```
Website → Permission → Authorized computer → Session
```

1. **First open**: the embedded console opens the permission dialog — *"Allow
   Verxa to use your computer?"* → **Allow Computer Use** writes the real
   server consent record (`verxa_desktop_computer_use.enabled = true`).
   *Not Now* changes nothing. Returning users with enabled consent and a
   live device session never see the dialog again (server state decides).
2. **Connect a computer**: install the connector (Downloads), run it once and
   click *Open Verxa* — it shows a code and opens
   `/desktop/login?session=…`. Approving there creates the device session
   (`verxa_desktop_sessions`). The console polls `/api/desktop/devices` and
   flips to **Connected** by itself; disconnected/revoked states show the
   re-authorize panel instead.
3. **Session**: the composer creates a run
   (`POST /api/desktop/computer-use/runs`). The connector claims it
   (`POST …/runs/claim`, desktop token only), then executes the existing
   agent loop against the existing reasoning endpoint
   (`POST /api/desktop/computer-use/step` — server owns the consent gate).
   Activity streams back (`POST …/runs/[id]/events`), confirmations appear in
   the web console (`POST …/runs/[id]/confirm` — the device may only deny),
   and stop/pause/resume apply within ~2.5 s
   (`POST …/runs/[id]/control`).
4. **Revoke**: the embedded console and *Settings → Security* list the authorized
   computers with per-device revoke (`/api/desktop/devices/revoke`).
   Revoking never deletes history; it kills the session token.
   Turning Computer Use off (`consent.enabled = false`) blocks every new
   session immediately — the step endpoint enforces it.

## Architecture map

```
src/app/page.tsx                        landing toggle (App/Computer Use)
src/app/chat/*                          chat toggle via Composer button
src/components/computer-use/*           dialog, composer, timeline, devices
src/lib/computer-use-web.ts              client types + fetch helpers
src/lib/computer-use-runs.ts             server helpers (ownership, consent)
src/app/api/desktop/computer-use/runs/   runs, claim, [id], events, control, confirm
desktop/src/main/computer/runs.ts        connector worker (claim → agent → events)
desktop/src/main/computer/agent.ts       unchanged loop (observe → step → execute)
```

## Security model

* Consent + capability toggles live server-side; the device can never grant
  itself anything (`step` and `claim` both re-check `enabled`).
* Runs are owner-scoped on every route (`loadOwnedRun`); browsers never write
  activity events; devices can never approve their own confirmations.
* Stop is authoritative: the run row flips to `stopped`, pending
  confirmations expire, and the device applies it on its next poll; the
  desktop ESC key still stops locally, instantly.
* Terminal states are never overwritten by late events.
