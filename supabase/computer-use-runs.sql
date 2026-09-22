-- Verxa Computer Use web console (runs, activity, confirmations).
-- The website is the primary Computer Use interface: runs are created in
-- the browser, a paired device (the Verxa connector) claims them and
-- executes through the existing /api/desktop/computer-use/step reasoning
-- endpoint. Run once in the Supabase SQL editor. Service-role writes via
-- API routes; users can only read their OWN runs/events/confirmations.
-- Follows the conventions of the other supabase/*.sql files.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------- runs
create table if not exists public.verxa_computer_runs (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  device_id text,
  goal text not null,
  status text not null default 'queued',   -- queued|running|awaiting_confirmation|paused|stopped|done|error
  step int not null default 0,
  summary text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  claimed_at timestamptz,
  finished_at timestamptz,
  frame_requested_at timestamptz,   -- web asked for a screenshot ("View Screen")
  last_frame text,                  -- latest captured frame (data URL, capped)
  last_frame_at timestamptz
);

-- Existing installs: add the screen-preview columns in place.
alter table public.verxa_computer_runs
  add column if not exists frame_requested_at timestamptz,
  add column if not exists last_frame text,
  add column if not exists last_frame_at timestamptz;

alter table public.verxa_computer_runs enable row level security;

drop policy if exists "own_computer_runs" on public.verxa_computer_runs;
create policy "own_computer_runs" on public.verxa_computer_runs
  for select using (auth.uid() = user_id);

create index if not exists verxa_computer_runs_user_idx
  on public.verxa_computer_runs (user_id, created_at desc);
create index if not exists verxa_computer_runs_queue_idx
  on public.verxa_computer_runs (status, created_at) where status = 'queued';

-- ---------------------------------------------------------- activity events
create table if not exists public.verxa_computer_run_events (
  id bigint generated always as identity primary key,
  run_id text not null references public.verxa_computer_runs on delete cascade,
  kind text not null,                      -- step|action|observation|confirmation|done|error|stopped|paused|resumed|info
  label text not null,
  detail text,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.verxa_computer_run_events enable row level security;

drop policy if exists "own_computer_run_events" on public.verxa_computer_run_events;
create policy "own_computer_run_events" on public.verxa_computer_run_events
  for select using (
    exists (
      select 1 from public.verxa_computer_runs r
      where r.id = run_id and r.user_id = auth.uid()
    )
  );

create index if not exists verxa_computer_run_events_run_idx
  on public.verxa_computer_run_events (run_id, id);

-- ------------------------------------------------------------ confirmations
-- High-risk actions the AI wants to perform. The browser user approves or
-- denies; the device polls the decision and never decides on its own
-- (a deny-by-timeout backstop is the only device-side write).
create table if not exists public.verxa_computer_confirmations (
  id uuid primary key default gen_random_uuid(),
  run_id text not null references public.verxa_computer_runs on delete cascade,
  action jsonb not null default '{}'::jsonb,
  reason text not null,
  status text not null default 'pending',  -- pending|approved|denied|expired
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

alter table public.verxa_computer_confirmations enable row level security;

drop policy if exists "own_computer_confirmations" on public.verxa_computer_confirmations;
create policy "own_computer_confirmations" on public.verxa_computer_confirmations
  for select using (
    exists (
      select 1 from public.verxa_computer_runs r
      where r.id = run_id and r.user_id = auth.uid()
    )
  );

create index if not exists verxa_computer_confirmations_run_idx
  on public.verxa_computer_confirmations (run_id, created_at desc);
