-- Run AFTER schema.sql, leaderboard.sql, dictation.sql and writing.sql.
-- Transactional, repeatable upgrade: persisted practice records feed the leaderboard.
begin;

alter table public.practice_events add column if not exists source_event_key text;
alter table public.practice_events add column if not exists accuracy_eligible boolean not null default true;
create unique index if not exists practice_events_source_key_idx
  on public.practice_events(user_id, source_event_key);
alter table public.daily_learning_stats add column if not exists graded_count integer not null default 0;
alter table public.sentence_dictation_attempts add column if not exists submission_key text;
alter table public.sentence_dictation_attempts add column if not exists first_try_correct boolean;
create unique index if not exists dictation_submission_key_idx
  on public.sentence_dictation_attempts(user_id, submission_key);

-- The existing vocabulary RPC and all new sources share this single aggregate path.
-- AFTER INSERT ensures ON CONFLICT retries cannot update counters twice.
create or replace function public.aggregate_learning_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  local_date date := (timezone('Asia/Shanghai', new.reviewed_at))::date;
  completed integer;
  first_mastery boolean;
  awarded integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  select completed_count into completed from public.daily_learning_stats
    where user_id = new.user_id and stat_date = local_date;
  first_mastery := new.became_mastered and not exists (
    select 1 from public.practice_events
    where user_id = new.user_id and vocabulary_id = new.vocabulary_id
      and became_mastered and id <> new.id
  );
  awarded := case when new.first_try_correct then 10 when new.eventually_correct then 5 else 0 end
    + case when first_mastery then 20 else 0 end
    + case when coalesce(completed,0) = 19 then 20 else 0 end;
  update public.practice_events set earned_points = awarded, became_mastered = first_mastery
    where id = new.id;
  insert into public.daily_learning_stats (
    user_id,stat_date,completed_count,first_try_correct_count,new_mastered_count,points,graded_count
  ) values (
    new.user_id,local_date,1,
    (new.accuracy_eligible and new.first_try_correct)::integer,
    first_mastery::integer,least(300,awarded),new.accuracy_eligible::integer
  ) on conflict (user_id,stat_date) do update set
    completed_count = daily_learning_stats.completed_count + 1,
    first_try_correct_count = daily_learning_stats.first_try_correct_count + excluded.first_try_correct_count,
    new_mastered_count = daily_learning_stats.new_mastered_count + excluded.new_mastered_count,
    points = least(300,daily_learning_stats.points + excluded.points),
    graded_count = daily_learning_stats.graded_count + excluded.graded_count;
  return new;
end;
$$;
drop trigger if exists aggregate_learning_event_after_insert on public.practice_events;
create trigger aggregate_learning_event_after_insert after insert on public.practice_events
  for each row execute function public.aggregate_learning_event();

create or replace function public.record_practice_result(
  p_vocabulary_id text,p_first_try_correct boolean,p_wrong_attempts integer,
  p_eventually_correct boolean,p_became_mastered boolean
) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_wrong_attempts < 0 then raise exception 'Invalid wrong attempt count'; end if;
  insert into public.practice_events (
    user_id,vocabulary_id,first_try_correct,wrong_attempts,eventually_correct,became_mastered,earned_points
  ) values (
    auth.uid(),p_vocabulary_id,p_first_try_correct,p_wrong_attempts,p_eventually_correct,p_became_mastered,0
  );
end;
$$;

-- Private helper: invoked from triggers/backfill only, never accepts a client event.
create or replace function public.record_saved_writing(
  owner_id uuid, attempt_id uuid, payload jsonb, saved_at timestamptz
) returns void language plpgsql security definer set search_path = public as $$
declare
  graded boolean := jsonb_typeof(payload->'fixedCorrect') = 'boolean'
    and payload->>'track' = 'expressions' and payload->>'exercise' like '%:cloze';
  correct boolean := coalesce(payload->'fixedCorrect' = 'true'::jsonb,false);
  first_correct boolean;
  practiced_at timestamptz := saved_at;
begin
  if jsonb_typeof(payload->'draft'->'fields') is distinct from 'object' then return; end if;
  if not exists (
    select 1 from jsonb_each_text(payload->'draft'->'fields') f
    where f.key not in ('chosenIdeas','taskType','transferTopic','newPrompt')
      and length(btrim(f.value)) > 0
  ) then return; end if;
  if coalesce(payload->>'track','') not in ('templates','ideas','expressions') then return; end if;
  first_correct := graded and correct and case
    when jsonb_typeof(payload->'firstTryCorrect') = 'boolean'
      then payload->'firstTryCorrect' = 'true'::jsonb
    else payload->'draft'->>'hintLevel' = 'independent'
      and coalesce(payload->'draft'->>'hintViews','0') = '0'
    end;
  -- Historical/local offline records belong to the original submission date.
  if jsonb_typeof(payload->'submittedAt') = 'number' then
    begin
      practiced_at := least(saved_at,to_timestamp((payload->>'submittedAt')::double precision / 1000));
    exception when others then practiced_at := saved_at;
    end;
  end if;
  insert into public.practice_events (
    user_id,vocabulary_id,reviewed_at,first_try_correct,wrong_attempts,
    eventually_correct,became_mastered,earned_points,source_event_key,accuracy_eligible
  ) values (
    owner_id,'writing:' || coalesce(payload->>'workspaceId',attempt_id::text),practiced_at,
    coalesce(first_correct,false),case when graded and not correct then 1 else 0 end,
    case when graded then correct else true end,false,0,
    'writing:' || attempt_id::text,coalesce(graded,false)
  ) on conflict (user_id,source_event_key) do nothing;
end;
$$;
create or replace function public.writing_to_learning_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.record_saved_writing(new.user_id,new.id,new.payload,new.created_at);
  return new;
end;
$$;
drop trigger if exists writing_to_learning_after_insert on public.writing_attempts;
create trigger writing_to_learning_after_insert after insert or update on public.writing_attempts
  for each row execute function public.writing_to_learning_event();

create or replace function public.record_saved_dictation(attempt public.sentence_dictation_attempts)
returns void language plpgsql security definer set search_path = public as $$
begin
  if attempt.submission_type <> 'initial' or length(btrim(attempt.submitted_answer)) = 0 then return; end if;
  insert into public.practice_events (
    user_id,vocabulary_id,reviewed_at,first_try_correct,wrong_attempts,
    eventually_correct,became_mastered,earned_points,source_event_key,accuracy_eligible
  ) values (
    attempt.user_id,'dictation:' || attempt.vocabulary_id,attempt.submitted_at,
    coalesce(attempt.first_try_correct,false) and attempt.is_correct,
    case when attempt.is_correct then 0 else 1 end,attempt.is_correct,false,0,
    'dictation:' || coalesce(attempt.submission_key,
      attempt.session_id::text || ':' || attempt.vocabulary_id || ':' || attempt.submission_type),
    attempt.first_try_correct is not null
  ) on conflict (user_id,source_event_key) do nothing;
end;
$$;
create or replace function public.dictation_to_learning_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.record_saved_dictation(new);
  return new;
end;
$$;
drop trigger if exists dictation_to_learning_after_insert on public.sentence_dictation_attempts;
create trigger dictation_to_learning_after_insert after insert on public.sentence_dictation_attempts
  for each row execute function public.dictation_to_learning_event();

-- Include previously saved records once, without fabricating original dictation accuracy.
do $$ declare w record; d public.sentence_dictation_attempts; begin
  for w in select user_id,id,payload,created_at from public.writing_attempts order by created_at,id loop
    perform public.record_saved_writing(w.user_id,w.id,w.payload,w.created_at);
  end loop;
  for d in select * from public.sentence_dictation_attempts order by submitted_at,id loop
    perform public.record_saved_dictation(d);
  end loop;
end; $$;

-- Saved writing/dictation submissions do not establish spaced vocabulary mastery.
update public.practice_events set became_mastered=false where source_event_key is not null;

-- Rebuild in true chronological order (including historical backfill).
with ordered as (
  select id,row_number() over (
    partition by user_id,(timezone('Asia/Shanghai',reviewed_at))::date order by reviewed_at,id
  ) as sequence from public.practice_events
) update public.practice_events e set earned_points =
  case when e.first_try_correct then 10 when e.eventually_correct then 5 else 0 end
  + case when e.became_mastered then 20 else 0 end
  + case when o.sequence = 20 then 20 else 0 end
from ordered o where o.id = e.id;
insert into public.daily_learning_stats (
  user_id,stat_date,completed_count,first_try_correct_count,new_mastered_count,points,graded_count
) select user_id,(timezone('Asia/Shanghai',reviewed_at))::date,
  count(*)::integer,count(*) filter (where accuracy_eligible and first_try_correct)::integer,
  count(*) filter (where became_mastered)::integer,least(300,sum(earned_points))::integer,
  count(*) filter (where accuracy_eligible)::integer
from public.practice_events group by user_id,(timezone('Asia/Shanghai',reviewed_at))::date
on conflict (user_id,stat_date) do update set
  completed_count=excluded.completed_count,first_try_correct_count=excluded.first_try_correct_count,
  new_mastered_count=excluded.new_mastered_count,points=excluded.points,graded_count=excluded.graded_count;

revoke all on function public.aggregate_learning_event() from public;
revoke all on function public.writing_to_learning_event() from public;
revoke all on function public.dictation_to_learning_event() from public;
revoke all on function public.record_saved_writing(uuid,uuid,jsonb,timestamptz) from public;
revoke all on function public.record_saved_dictation(public.sentence_dictation_attempts) from public;
revoke all on function public.record_practice_result(text,boolean,integer,boolean,boolean) from public;
grant execute on function public.record_practice_result(text,boolean,integer,boolean,boolean) to authenticated;

create or replace function public.get_learning_leaderboard(p_period text default 'week')
returns table (
  rank bigint,
  nickname text,
  points bigint,
  completed_count bigint,
  new_mastered_count bigint,
  accuracy numeric,
  study_streak integer,
  is_current_user boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select case p_period
      when 'today' then (timezone('Asia/Shanghai', now()))::date
      when 'week' then date_trunc('week', timezone('Asia/Shanghai', now()))::date
      when 'all' then null::date
      else date_trunc('week', timezone('Asia/Shanghai', now()))::date
    end as start_date
  ), activity as (
    select e.user_id, max(e.reviewed_at) as last_scored_at
    from public.practice_events e
    cross join bounds b
    where b.start_date is null
      or (timezone('Asia/Shanghai', e.reviewed_at))::date >= b.start_date
    group by e.user_id
  ), totals as (
    select p.user_id, p.nickname,
      coalesce(sum(d.points), 0)::bigint as historical_points,
      coalesce(sum(d.completed_count), 0)::bigint as completed_count,
      coalesce(sum(d.graded_count), 0)::bigint as graded_count,
      coalesce(sum(d.first_try_correct_count), 0)::bigint as first_correct,
      coalesce(sum(d.new_mastered_count), 0)::bigint as new_mastered_count
    from public.profiles p
    cross join bounds b
    left join public.daily_learning_stats d on d.user_id = p.user_id
      and (b.start_date is null or d.stat_date >= b.start_date)
    where p.leaderboard_enabled
    group by p.user_id, p.nickname
  ), scored as (
    select t.*, a.last_scored_at,
      case when p_period = 'all' then historical_points
      else round(
        least(completed_count, 100) * 2
        + case when graded_count = 0 then 0 else
            (first_correct::numeric / graded_count)
            * least(graded_count::numeric / 40, 1)
            * 300
          end
        + least(new_mastered_count, 20) * 15
      )::bigint end as points,
      case when graded_count = 0 then 0
        else first_correct::numeric / graded_count end as accuracy_ratio
    from totals t
    left join activity a on a.user_id = t.user_id
  ), ranked as (
    select dense_rank() over (
      order by points desc, new_mastered_count desc,
        accuracy_ratio desc, completed_count desc, last_scored_at asc nulls last
    ) as rank, *
    from scored
  )
  select r.rank, r.nickname, r.points, r.completed_count, r.new_mastered_count,
    case when r.graded_count = 0 then 0
      else round(r.first_correct::numeric * 100 / r.graded_count, 1) end as accuracy,
    public.current_learning_streak(r.user_id) as study_streak,
    r.user_id = auth.uid() as is_current_user
  from ranked r
  order by r.rank, r.nickname;
$$;

revoke all on function public.get_learning_leaderboard(text) from public;
grant execute on function public.get_learning_leaderboard(text) to authenticated;
commit;
