-- Invite-flow visits: who entered through /invite/* links.
-- Run once in the Supabase SQL editor.

create table if not exists public.verxa_invite_visits (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'admin',
  display_name text,
  device text check (device is null or device in ('mobile', 'desktop')),
  last_step text not null default 'entered',
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.verxa_invite_visits enable row level security;

-- Service role (admin API) bypasses RLS; no public access.
drop policy if exists "no public access" on public.verxa_invite_visits;

create index if not exists verxa_invite_visits_created_idx
  on public.verxa_invite_visits (created_at desc);
