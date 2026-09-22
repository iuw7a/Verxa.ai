-- Verxa Desktop (device auth, sessions, onboarding, analytics, releases).
-- Run once in the Supabase SQL editor. Service-role writes via API routes;
-- users can only read their OWN sessions/onboarding. Follows the conventions
-- of the other supabase/*.sql files.

create extension if not exists pgcrypto;

-- ------------------------------------------------- one-time device auth codes
-- Browser login flow: desktop shows a user code, user approves at
-- https://verxa.de/desktop/login?session=... within 10 minutes.
create table if not exists public.verxa_desktop_auth (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  code_hash text not null unique,
  user_code text not null,
  device_id text not null,
  device_secret_hash text not null,
  device_name text,
  os text,
  app_version text,
  ip text,
  status text not null default 'pending',
  approved_user_id uuid references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

alter table public.verxa_desktop_auth enable row level security;
-- No public policies: service role only (all endpoints run server-side).

create index if not exists verxa_desktop_auth_session_idx
  on public.verxa_desktop_auth (session_id);
create index if not exists verxa_desktop_auth_device_idx
  on public.verxa_desktop_auth (device_id);

-- ------------------------------------------------------- desktop sessions
-- Long-lived device sessions. Raw tokens are NEVER stored — sha256 only.
create table if not exists public.verxa_desktop_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  device_id text not null,
  device_name text,
  os text,
  app_version text,
  ip text,
  location text,
  token_hash text not null unique,
  status text not null default 'active',
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, device_id)
);

alter table public.verxa_desktop_sessions enable row level security;

drop policy if exists "own_desktop_sessions" on public.verxa_desktop_sessions;
create policy "own_desktop_sessions" on public.verxa_desktop_sessions
  for select using (auth.uid() = user_id);

create index if not exists verxa_desktop_sessions_token_idx
  on public.verxa_desktop_sessions (token_hash);
create index if not exists verxa_desktop_sessions_user_idx
  on public.verxa_desktop_sessions (user_id);

-- ------------------------------------------------------------ onboarding
create table if not exists public.verxa_desktop_onboarding (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text,
  company_name text,
  use_cases text[] not null default '{}',
  discovery_source text,
  previous_ai text,
  first_launch_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.verxa_desktop_onboarding enable row level security;

drop policy if exists "own_desktop_onboarding" on public.verxa_desktop_onboarding;
create policy "own_desktop_onboarding" on public.verxa_desktop_onboarding
  for select using (auth.uid() = user_id);

-- -------------------------------------------------------- usage analytics
-- Privacy-conscious: event names from a server allowlist, no chat contents,
-- no tokens, no passwords. detail is a small free-form jsonb (no PII).
create table if not exists public.verxa_desktop_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade,
  device_id text,
  event text not null,
  app_version text,
  os text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.verxa_desktop_events enable row level security;
-- No public policies: service role only.

create index if not exists verxa_desktop_events_event_time_idx
  on public.verxa_desktop_events (event, created_at desc);
create index if not exists verxa_desktop_events_user_idx
  on public.verxa_desktop_events (user_id);

-- --------------------------------------------------------------- feedback
create table if not exists public.verxa_desktop_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  rating text,
  category text not null default 'general',
  message text not null,
  app_version text,
  os text,
  created_at timestamptz not null default now()
);

alter table public.verxa_desktop_feedback enable row level security;
-- No public policies: service role only (submitted via API).

create index if not exists verxa_desktop_feedback_time_idx
  on public.verxa_desktop_feedback (created_at desc);

-- ------------------------------------------------- computer use consent
-- Server-side consent record for Computer Use. The step endpoint refuses to
-- reason unless the user enabled it here — the desktop client can never
-- grant itself permission. Granular toggles mirror Settings → Computer Use.
create table if not exists public.verxa_desktop_computer_use (
  user_id uuid primary key references auth.users on delete cascade,
  enabled boolean not null default false,
  safe_mode boolean not null default true,
  screen_access boolean not null default true,
  mouse_control boolean not null default true,
  keyboard_control boolean not null default true,
  app_control boolean not null default true,
  allowed_displays text not null default 'all',
  granted_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.verxa_desktop_computer_use enable row level security;

drop policy if exists "own_computer_use" on public.verxa_desktop_computer_use;
create policy "own_computer_use" on public.verxa_desktop_computer_use
  for select using (auth.uid() = user_id);

-- ------------------------------------------------------- releases
-- Source of truth for /api/desktop/version + auto-updates. The release
-- script inserts a row per published installer (is_current=true).
create table if not exists public.verxa_desktop_releases (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  platform text not null default 'win',
  download_url text not null,
  sha256 text,
  sha512 text,
  size_bytes bigint,
  release_date timestamptz not null default now(),
  min_version text,
  notes text,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique (version, platform)
);

alter table public.verxa_desktop_releases enable row level security;
-- No public policies: service role only (public reads go through the API).
