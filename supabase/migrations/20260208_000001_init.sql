-- Initial schema for automnator (Supabase optional backend)
-- Safe to apply manually with Supabase CLI or SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  content text not null default '',
  language text not null check (language in ('en', 'pt-BR')),
  status text not null check (status in ('draft', 'scheduled', 'published')),
  prompt_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  draft_id uuid not null references public.drafts(id) on delete cascade,
  run_at timestamptz not null,
  timezone text not null,
  approval_state text not null check (approval_state in ('pending', 'approved', 'rejected')),
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed', 'canceled')),
  executed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  draft_id uuid not null references public.drafts(id) on delete cascade,
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  provider text not null check (provider in ('linkedin')),
  provider_post_id text not null,
  url text,
  published_at timestamptz not null
);

create table if not exists public.action_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  schedule_id uuid references public.schedules(id) on delete set null,
  type text not null check (type in ('publish', 'fetch_analytics')),
  status text not null check (status in ('ok', 'error')),
  message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_drafts_user_updated
  on public.drafts(user_id, updated_at desc);

create index if not exists idx_schedules_due
  on public.schedules(status, approval_state, run_at asc);

create index if not exists idx_posts_user_published
  on public.posts(user_id, published_at desc);

create index if not exists idx_action_logs_user_created
  on public.action_logs(user_id, created_at desc);

alter table public.users enable row level security;
alter table public.drafts enable row level security;
alter table public.schedules enable row level security;
alter table public.posts enable row level security;
alter table public.action_logs enable row level security;

-- Policies assume users are linked by email in auth.jwt() for custom auth setups.
-- In many Supabase projects you'll map to auth.uid(); adjust as needed.

create policy if not exists users_select_own_email on public.users
  for select
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create policy if not exists users_insert_own_email on public.users
  for insert
  with check (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create policy if not exists drafts_owner_all on public.drafts
  for all
  using (
    exists (
      select 1 from public.users u
      where u.id = drafts.user_id
      and lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = drafts.user_id
      and lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

create policy if not exists schedules_owner_all on public.schedules
  for all
  using (
    exists (
      select 1 from public.users u
      where u.id = schedules.user_id
      and lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = schedules.user_id
      and lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

create policy if not exists posts_owner_select on public.posts
  for select
  using (
    exists (
      select 1 from public.users u
      where u.id = posts.user_id
      and lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

create policy if not exists action_logs_owner_select on public.action_logs
  for select
  using (
    exists (
      select 1 from public.users u
      where u.id = action_logs.user_id
      and lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_drafts_updated_at on public.drafts;
create trigger trg_drafts_updated_at
before update on public.drafts
for each row
execute function public.set_updated_at();

drop trigger if exists trg_schedules_updated_at on public.schedules;
create trigger trg_schedules_updated_at
before update on public.schedules
for each row
execute function public.set_updated_at();

-- Optional claim helper for worker execution in SQL backends.
create or replace function public.claim_due_schedules(p_now timestamptz, p_limit int)
returns setof public.schedules
language plpgsql
security definer
set search_path = public
as $$
declare
begin
  return query
  with due as (
    select s.id
    from public.schedules s
    where s.status = 'queued'
      and s.approval_state = 'approved'
      and s.run_at <= p_now
    order by s.run_at asc
    limit greatest(1, p_limit)
    for update skip locked
  )
  update public.schedules s
  set status = 'running',
      updated_at = now()
  from due
  where s.id = due.id
  returning s.*;
end;
$$;
