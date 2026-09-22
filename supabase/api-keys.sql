-- Verxa AI — API keys & usage (verxa_ prefix, safe alongside other apps)
create extension if not exists "pgcrypto";

-- Hashed API keys. The raw key is NEVER stored — only a SHA-256 hash, a
-- short prefix for display, and a lookup hash for constant-time matching.
create table if not exists public.verxa_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null default 'Untitled key',
  key_prefix text not null,
  key_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

-- Aggregated usage per key per day (requests, tokens in/out).
create table if not exists public.verxa_api_usage (
  key_id uuid not null references public.verxa_api_keys on delete cascade,
  day date not null default current_date,
  requests integer not null default 0,
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  primary key (key_id, day)
);

alter table public.verxa_api_keys enable row level security;
alter table public.verxa_api_usage enable row level security;

drop policy if exists "verxa_own_api_keys" on public.verxa_api_keys;
create policy "verxa_own_api_keys" on public.verxa_api_keys
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "verxa_own_api_usage" on public.verxa_api_usage;
create policy "verxa_own_api_usage" on public.verxa_api_usage
  for all using (
    exists (select 1 from public.verxa_api_keys k where k.id = key_id and k.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.verxa_api_keys k where k.id = key_id and k.user_id = auth.uid())
  );

create index if not exists verxa_api_keys_user_idx on public.verxa_api_keys (user_id);
create index if not exists verxa_api_usage_key_day_idx on public.verxa_api_usage (key_id, day);

-- Atomic usage bump (avoids read-modify-write races).
create or replace function public.verxa_bump_api_usage(
  p_key_id uuid,
  p_tokens_in integer,
  p_tokens_out integer
) returns void as $$
begin
  insert into public.verxa_api_usage (key_id, day, requests, tokens_in, tokens_out)
  values (p_key_id, current_date, 1, p_tokens_in, p_tokens_out)
  on conflict (key_id, day) do update set
    requests = public.verxa_api_usage.requests + 1,
    tokens_in = public.verxa_api_usage.tokens_in + excluded.tokens_in,
    tokens_out = public.verxa_api_usage.tokens_out + excluded.tokens_out;
end;
$$ language plpgsql security definer;
