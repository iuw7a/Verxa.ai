-- Verxa AI — Plugin & OAuth Integration System
-- verxa_-prefixed, additive-only, safe to run alongside the existing schema.
--
-- Security model:
--   * Access/refresh tokens are AES-256-GCM encrypted by the app BEFORE insert.
--     The DB only ever stores ciphertext; no token is ever readable via SQL or API.
--   * RLS: a row is visible/manageable ONLY by its owner (auth.uid() = user_id).
--     Admin surfaces use the service-role key and deliberately select non-secret
--     columns only (counts, statuses, error codes) — never token material.
--   * verxa_integration_events is insert-only for users (audit trail).

-- ---------------------------------------------------------------- connections
create table if not exists public.verxa_integration_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  provider text not null,                       -- 'google', 'github', ...
  scopes text[] not null default '{}',          -- granted scopes (from provider)
  account_label text,                           -- e.g. user's Google email (display only)
  status text not null default 'active'
    check (status in ('active', 'needs_reauth', 'revoked', 'error')),
  status_message text,                          -- human-readable detail for UI
  access_token_enc text,                        -- AES-256-GCM ciphertext (never plaintext)
  refresh_token_enc text,                       -- AES-256-GCM ciphertext (never plaintext)
  expires_at timestamptz,                       -- access-token expiry
  last_refreshed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists verxa_integration_connections_user_idx
  on public.verxa_integration_connections (user_id);

-- --------------------------------------------------------------- audit events
-- Security-relevant events: connect, disconnect, auth_error, token_refresh,
-- refresh_failed, revocation. NEVER contains tokens or message content.
create table if not exists public.verxa_integration_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete set null,
  provider text not null,
  event text not null
    check (event in ('connect','disconnect','auth_error','token_refresh','refresh_failed','revoked','scope_warning')),
  detail text,                                  -- short, non-sensitive detail only
  created_at timestamptz not null default now()
);

create index if not exists verxa_integration_events_provider_idx
  on public.verxa_integration_events (provider, created_at desc);

alter table public.verxa_integration_connections enable row level security;
alter table public.verxa_integration_events enable row level security;

drop policy if exists "verxa_integrations_owner_all" on public.verxa_integration_connections;
create policy "verxa_integrations_owner_all" on public.verxa_integration_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Users may INSERT audit events for themselves, and SELECT their own; no
-- update/delete (append-only). Service role bypasses RLS for admin aggregates.
drop policy if exists "verxa_integration_events_owner_select" on public.verxa_integration_events;
create policy "verxa_integration_events_owner_select" on public.verxa_integration_events
  for select using (auth.uid() = user_id);

drop policy if exists "verxa_integration_events_owner_insert" on public.verxa_integration_events;
create policy "verxa_integration_events_owner_insert" on public.verxa_integration_events
  for insert with check (auth.uid() = user_id);
