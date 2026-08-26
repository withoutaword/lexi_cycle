-- Run once in the Supabase SQL Editor.
create table if not exists public.user_vocabulary (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  category text not null default 'My Vocabulary',
  category_zh text,
  concept_group text,
  lemma text not null,
  sentence text not null,
  translation text not null,
  answer text not null,
  target_type text not null check (target_type in ('word', 'phrase')),
  aliases text[] not null default '{}',
  confusion_group text,
  tags text[] not null default '{}',
  difficulty integer not null default 1,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.learning_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  vocabulary_id text not null,
  status text not null check (status in ('new','learning','review','mastered')),
  total_reviews integer not null default 0,
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  first_try_correct_count integer not null default 0,
  streak integer not null default 0,
  last_reviewed_at bigint,
  next_review_at bigint,
  last_wrong_attempts integer,
  ease double precision,
  updated_at timestamptz not null default now(),
  primary key (user_id, vocabulary_id)
);

alter table public.user_vocabulary enable row level security;
alter table public.learning_progress enable row level security;

create policy "users manage own vocabulary" on public.user_vocabulary
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "users manage own progress" on public.learning_progress
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.user_vocabulary to authenticated;
grant select, insert, update, delete on public.learning_progress to authenticated;
