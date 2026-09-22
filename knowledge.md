# Project Knowledge

## Overview

Verxa AI (`verxa.de`) is a private Next.js web application for chat, AI media generation, integrations, account management, and Verxa Code. The primary application lives in `src/`; additional repository directories include mobile, desktop/browser-agent related code, design assets, scripts, and Supabase SQL.

## Key locations

- `src/app/` — Next.js App Router pages, layouts, authentication pages, product areas, and API route handlers.
- `src/app/api/` — server endpoints for chat, code projects/agents, media generation, email, integrations, admin operations, desktop/computer-use flows, API keys, and support.
- `src/components/` — reusable UI organized by feature (`chat`, `code`, `account`, `computer-use`, `mobile`, `layout`, etc.).
- `src/providers/` — application-wide React providers, including auth and workspace state.
- `src/lib/` — server/client utilities, Supabase/database access, API auth, email services, code-agent logic, and computer-use logic.
- `src/app/globals.css` — Tailwind v4 import plus shared design tokens, components, responsive shell styles, and animations.
- `public/` — static assets.
- `supabase/` — database schema and SQL setup files.
- `tsconfig.json` — strict TypeScript configuration with `@/*` mapped to `src/*`.

## Commands

Use npm because the repository includes `package-lock.json`.

```bash
npm install       # install dependencies
npm run dev       # start Next.js with Turbopack at http://localhost:3000
npm run lint      # run ESLint / Next.js rules
npm run build     # create a production build
npm start         # serve the production build after npm run build
```

There is currently no test script in `package.json`. TypeScript is configured with `noEmit`; use the project build as the primary compile/type validation unless a focused test setup is added.

## Conventions and gotchas

- Follow the Next.js App Router model: pages and layouts are in `src/app`, and API endpoints use `route.ts` files.
- Components are server components by default; add `"use client"` only where browser state, effects, event handlers, or client-only libraries require it.
- Use strict TypeScript and the `@/` alias for imports from `src`.
- Match the existing dark, restrained visual system and shared CSS primitives before introducing new styles. Tailwind CSS 4 is wired through `postcss.config.mjs`.
- Supabase access, authentication, API authorization, email, and external-service calls should remain in the established `src/lib` and API-route layers rather than being embedded in presentation components.
- Environment values are required for backend integrations and local development; configure them from the repository's environment example and never commit secrets.
- `tsconfig.json` excludes `mobile`, `Wan2.2`, `designs`, and `supabase` from the main TypeScript project, so changes in those areas may need their own validation.
- The app uses responsive/mobile shell patterns with safe-area handling and `100dvh`; preserve these when changing full-screen layouts.
- Prefer existing dependencies and shared components (`lucide-react`, Supabase clients, `clsx`, `tailwind-merge`, and existing UI primitives) over adding new libraries.
