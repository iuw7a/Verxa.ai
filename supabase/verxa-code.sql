-- Verxa Code — Phase 1 schema (Supabase Postgres, RLS).
-- Maps the spec models: Project, ProjectFile, ChatMessage, Deployment + AgentLog.
-- Uses auth.users as User source of truth (no duplicate User table).

create extension if not exists "pgcrypto";

create table if not exists public.verxa_code_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null default 'Untitled project',
  prompt text not null default '',
  status text not null default 'draft' check (status in ('draft','building','ready','error')),
  preview_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.verxa_code_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.verxa_code_projects on delete cascade,
  path text not null,
  content text not null default '',
  previous_content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(project_id, path)
);

create table if not exists public.verxa_code_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.verxa_code_projects on delete cascade,
  role text not null check (role in ('user','assistant','tool')),
  content text not null default '',
  tool_name text,
  tool_input jsonb,
  tool_output text,
  duration_ms integer,
  token_count integer,
  created_at timestamptz default now()
);

create table if not exists public.verxa_code_deployments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.verxa_code_projects on delete cascade,
  url text,
  provider text not null default 'vercel',
  status text not null default 'pending' check (status in ('pending','success','error')),
  error text,
  created_at timestamptz default now()
);

create table if not exists public.verxa_code_agent_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.verxa_code_projects on delete cascade,
  tool_name text not null,
  input jsonb,
  output text,
  duration_ms integer,
  token_count integer,
  created_at timestamptz default now()
);

alter table public.verxa_code_projects enable row level security;
alter table public.verxa_code_files enable row level security;
alter table public.verxa_code_messages enable row level security;
alter table public.verxa_code_deployments enable row level security;
alter table public.verxa_code_agent_logs enable row level security;

drop policy if exists "verxa_code_own_projects" on public.verxa_code_projects;
create policy "verxa_code_own_projects" on public.verxa_code_projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "verxa_code_own_files" on public.verxa_code_files;
create policy "verxa_code_own_files" on public.verxa_code_files
  for all using (
    exists (select 1 from public.verxa_code_projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.verxa_code_projects p where p.id = project_id and p.user_id = auth.uid())
  );

drop policy if exists "verxa_code_own_messages" on public.verxa_code_messages;
create policy "verxa_code_own_messages" on public.verxa_code_messages
  for all using (
    exists (select 1 from public.verxa_code_projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.verxa_code_projects p where p.id = project_id and p.user_id = auth.uid())
  );

drop policy if exists "verxa_code_own_deployments" on public.verxa_code_deployments;
create policy "verxa_code_own_deployments" on public.verxa_code_deployments
  for all using (
    exists (select 1 from public.verxa_code_projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.verxa_code_projects p where p.id = project_id and p.user_id = auth.uid())
  );

drop policy if exists "verxa_code_own_agent_logs" on public.verxa_code_agent_logs;
create policy "verxa_code_own_agent_logs" on public.verxa_code_agent_logs
  for all using (
    exists (select 1 from public.verxa_code_projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.verxa_code_projects p where p.id = project_id and p.user_id = auth.uid())
  );

create index if not exists verxa_code_projects_user_idx on public.verxa_code_projects (user_id, updated_at desc);
create index if not exists verxa_code_files_project_idx on public.verxa_code_files (project_id);
create index if not exists verxa_code_messages_project_idx on public.verxa_code_messages (project_id, created_at);
create index if not exists verxa_code_deployments_project_idx on public.verxa_code_deployments (project_id);
create index if not exists verxa_code_agent_logs_project_idx on public.verxa_code_agent_logs (project_id, created_at);
