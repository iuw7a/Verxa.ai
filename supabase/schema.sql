-- Verxa AI — verxa_-prefixed schema (safe alongside other apps in this project)
create extension if not exists "pgcrypto";

create table if not exists public.verxa_profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  username text unique,
  email text,
  bio text,
  location text,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists public.verxa_chats (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  title text not null default 'New chat',
  preview text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.verxa_messages (
  id text primary key,
  chat_id text references public.verxa_chats on delete cascade,
  role text not null,
  content text not null,
  sources jsonb,
  search_unavailable boolean,
  created_at timestamptz default now()
);

create table if not exists public.verxa_memories (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  content text not null,
  enabled boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.verxa_personalization (
  user_id uuid primary key references auth.users on delete cascade,
  custom_instructions text,
  tone text default 'friendly',
  response_length text default 'medium',
  personality jsonb default '{}'::jsonb
);

alter table public.verxa_profiles enable row level security;
alter table public.verxa_chats enable row level security;
alter table public.verxa_messages enable row level security;
alter table public.verxa_memories enable row level security;
alter table public.verxa_personalization enable row level security;

drop policy if exists "verxa_own_profile" on public.verxa_profiles;
create policy "verxa_own_profile" on public.verxa_profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "verxa_own_chats" on public.verxa_chats;
create policy "verxa_own_chats" on public.verxa_chats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "verxa_own_messages" on public.verxa_messages;
create policy "verxa_own_messages" on public.verxa_messages
  for all using (
    exists (select 1 from public.verxa_chats c where c.id = chat_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.verxa_chats c where c.id = chat_id and c.user_id = auth.uid())
  );

drop policy if exists "verxa_own_memories" on public.verxa_memories;
create policy "verxa_own_memories" on public.verxa_memories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "verxa_own_personalization" on public.verxa_personalization;
create policy "verxa_own_personalization" on public.verxa_personalization
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_verxa_new_user()
returns trigger as $$
begin
  insert into public.verxa_profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_verxa_auth_user_created on auth.users;
create trigger on_verxa_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_verxa_new_user();

-- Helpful indexes for sync queries
create index if not exists verxa_chats_user_idx on public.verxa_chats (user_id);
create index if not exists verxa_messages_chat_idx on public.verxa_messages (chat_id);
create index if not exists verxa_memories_user_idx on public.verxa_memories (user_id);
