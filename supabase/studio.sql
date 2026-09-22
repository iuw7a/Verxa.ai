-- Barada Studio — per-user media library (metadata; bytes live in
-- verxa_media_assets and are served via /api/media/[id]).
create table if not exists public.verxa_studio_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('image','video')),
  mode text not null default 'generate' check (mode in ('generate','edit','transform','image-to-video','video')),
  prompt text not null default '',
  aspect_ratio text,
  source_asset_id uuid,
  parent_id uuid,
  created_at timestamptz not null default now()
);

alter table public.verxa_studio_media enable row level security;

drop policy if exists "verxa_own_studio_media" on public.verxa_studio_media;
create policy "verxa_own_studio_media" on public.verxa_studio_media
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists verxa_studio_media_user_idx
  on public.verxa_studio_media (user_id, created_at desc);
