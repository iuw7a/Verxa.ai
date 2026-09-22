# Verxa AI — Mobile (Expo)

Native-feeling React Native app for verxa.de, built with Expo SDK 57 + Expo Router.
Runs entirely in **Expo Go** — no custom development build required.

## Run on your phone (tunnel — works from any network)

```bash
cd mobile
npx expo start --tunnel
```

Scan the QR code printed in the terminal with:

- **iOS**: the Camera app → opens in Expo Go
- **Android**: the Expo Go app → "Scan QR code"

The tunnel URL (`*.exp.direct`) means your phone does **not** need to be on the same
Wi-Fi as this computer — mobile data or any other network works.

LAN mode (same Wi-Fi only) is also available via `npx expo start`.

## Requirements

- Node 18+
- [Expo Go](https://expo.dev/go) installed on your phone (App Store / Play Store)
- First tunnel start may prompt to install `@expo/ngrok` — already installed here

## What's inside

| Area | Implementation |
|---|---|
| Auth | Real Supabase sign-in/sign-up — same accounts as verxa.de |
| Chat | Streaming via verxa.de `POST /api/chat` (SSE), markdown, code blocks, images, sources |
| History | Cloud-synced through `verxa_chats` / `verxa_messages` (shared with web) |
| Library | Real `/api/studio` media library (saved images/videos), share + delete |
| Plugins | Real `/api/integrations` (connected/available, status, permissions) |
| Learn | Topic explanations through the chat API |
| Plans / Account / Settings | Reads the signed-in profile from Supabase |
| Generation modes | Composer switch: Chat · Image · Video (real backend generation) |
| Keyboard | `KeyboardAvoidingView` per-platform + safe-area insets; composer never hidden |

## Configuration

`src/lib/config.ts` points `API_BASE` at `https://www.verxa.de` so Expo Go over
tunnel works with zero setup. Supabase URL/key are loaded from `.env`
(`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).

To develop against a local web server instead, set `API_BASE` to your machine's
LAN IP — but note tunnel + localhost do not mix; use verxa.de or a deployed URL.

## Troubleshooting

- **QR opens but bundle is slow the first time**: the dev bundle (~15 MB) is built
  on demand; subsequent loads are cached and fast.
- **"Channel not available" / stale app**: press `r` in the Expo terminal to
  restart the server, then reload the app in Expo Go.
- **Tunnel hangs**: restart with `npx expo start --tunnel --clear`; a new
  `*.exp.direct` URL is issued each start.
- **Sign-in fails**: confirm the Supabase env vars are present in `mobile/.env`.

## Project layout

```
src/
  app/            Expo Router routes
    _layout.tsx   Root: providers + drawer navigator
    (drawer)/     index (home), chat, search, library, projects,
                  plugins, plans, learn, codex, account, settings, auth
  components/     ui.tsx (design system), drawer, chat (bubble/composer/view), logo
  lib/            theme, config, supabase, api (SSE client), cloud (chat sync), store
  providers/      app-provider (auth + chats + library state)
```
