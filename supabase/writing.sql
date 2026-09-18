-- Execute in Supabase SQL Editor to enable cross-device writing drafts and history.
create table if not exists public.writing_drafts (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  workspace_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, workspace_id)
);
create table if not exists public.writing_attempts (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists writing_attempts_user_time_idx on public.writing_attempts(user_id, created_at desc);
alter table public.writing_drafts enable row level security;
alter table public.writing_attempts enable row level security;
drop policy if exists "own writing drafts" on public.writing_drafts;
create policy "own writing drafts" on public.writing_drafts for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "own writing attempts" on public.writing_attempts;
create policy "own writing attempts" on public.writing_attempts for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select,insert,update,delete on public.writing_drafts to authenticated;
grant select,insert,update,delete on public.writing_attempts to authenticated;
