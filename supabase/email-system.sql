-- Verxa email system (Resend) — run once in the Supabase SQL editor.
-- Convention matches the other supabase/*.sql files. All tables are
-- service-role owned; users can only read/update their OWN rows.
-- The application degrades gracefully if a table is missing, but run this
-- file for full functionality (logs, consent, tokens, rate limits).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- preferences
create table if not exists public.verxa_email_preferences (
  user_id text primary key,
  email text,
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  marketing_consent_source text,
  marketing_unsubscribed_at timestamptz,
  product_updates boolean not null default true,
  newsletters boolean not null default false,
  tips_tutorials boolean not null default false,
  new_features boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.verxa_email_preferences enable row level security;

drop policy if exists "own_prefs_select" on public.verxa_email_preferences;
create policy "own_prefs_select" on public.verxa_email_preferences
  for select using (auth.uid()::text = user_id);

drop policy if exists "own_prefs_update" on public.verxa_email_preferences;
create policy "own_prefs_update" on public.verxa_email_preferences
  for update using (auth.uid()::text = user_id);

drop policy if exists "own_prefs_insert" on public.verxa_email_preferences;
create policy "own_prefs_insert" on public.verxa_email_preferences
  for insert with check (auth.uid()::text = user_id);

create index if not exists verxa_email_preferences_email_idx
  on public.verxa_email_preferences (email);

-- -------------------------------------------------------------------- tokens
-- Single-use hashed tokens: email verification, password reset, email change.
-- RAW TOKENS ARE NEVER STORED — only sha256 hashes.
create table if not exists public.verxa_email_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  email text not null,
  purpose text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  attempts int not null default 0,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.verxa_email_tokens enable row level security;
-- No public policies: service role only (token endpoints run server-side).

create index if not exists verxa_email_tokens_hash_idx
  on public.verxa_email_tokens (token_hash);
create index if not exists verxa_email_tokens_email_purpose_idx
  on public.verxa_email_tokens (email, purpose);

-- ---------------------------------------------------------------- rate limits
create table if not exists public.verxa_email_rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 1,
  updated_at timestamptz not null default now(),
  primary key (key, window_start)
);

alter table public.verxa_email_rate_limits enable row level security;
-- No public policies: service role only.

-- ------------------------------------------------------------- login devices
-- Known devices per user for new-device login notifications.
create table if not exists public.verxa_login_devices (
  user_id uuid not null references auth.users on delete cascade,
  device_hash text not null,
  user_agent text,
  ip text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  last_notified_at timestamptz,
  primary key (user_id, device_hash)
);

alter table public.verxa_login_devices enable row level security;
-- No public policies: service role only.

-- ------------------------------------------------------- extend email logs
-- The legacy verxa_email_logs table keeps working; these columns power the
-- new delivery tracking + webhook updates. All nullable / safe to add.
alter table public.verxa_email_logs
  add column if not exists event text,
  add column if not exists kind text,
  add column if not exists locale text,
  add column if not exists resend_id text,
  add column if not exists idempotency_key text,
  add column if not exists opened_at timestamptz,
  add column if not exists clicked_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists bounced_at timestamptz,
  add column if not exists complained_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists verxa_email_logs_resend_id_idx
  on public.verxa_email_logs (resend_id);
create index if not exists verxa_email_logs_template_idx
  on public.verxa_email_logs (template);
create index if not exists verxa_email_logs_status_idx
  on public.verxa_email_logs (status);
