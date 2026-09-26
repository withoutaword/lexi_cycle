-- PostgreSQL integration regression checks. Run AFTER leaderboard-all-practice.sql.
-- All fixtures and aggregate changes are rolled back.
begin;
do $$
declare
  owner_id uuid := gen_random_uuid();
  writing_id uuid := gen_random_uuid();
  cloze_id uuid := gen_random_uuid();
  session_id uuid := gen_random_uuid();
  content jsonb;
  row_stats public.daily_learning_stats;
  leaderboard_accuracy numeric;
begin
  insert into auth.users(id,email) values(owner_id,'regression-' || owner_id::text || '@example.invalid');
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform public.record_practice_result('regression-word',true,0,true,false);
  content := jsonb_build_object(
    'workspaceId','regression-topic:templates:essay','track','templates','exercise','essay',
    'draft',jsonb_build_object('fields',jsonb_build_object('essay','An original essay.'),
      'hintLevel','independent','hintViews',0)
  );
  insert into public.writing_attempts(id,user_id,payload) values(writing_id,owner_id,content);
  -- Same record re-synced: update trigger must be idempotent.
  insert into public.writing_attempts(id,user_id,payload) values(writing_id,owner_id,content)
    on conflict(id) do update set payload=excluded.payload;
  insert into public.writing_drafts(user_id,workspace_id,payload)
    values(owner_id,'regression-draft',content);
  insert into public.sentence_dictation_attempts(
    user_id,session_id,vocabulary_id,dataset,sentence_snapshot,translation_snapshot,
    submitted_answer,normalized_answer,is_correct,accuracy,submission_type,submission_key,first_try_correct
  ) values(owner_id,session_id,'regression-sentence','dictation','A sentence.','一个句子。',
    'A sentence.','a sentence.',true,100,'initial','regression-submission',true);
  insert into public.sentence_dictation_attempts(
    user_id,session_id,vocabulary_id,dataset,sentence_snapshot,translation_snapshot,
    submitted_answer,normalized_answer,is_correct,accuracy,submission_type,submission_key,first_try_correct
  ) values(owner_id,session_id,'regression-sentence','dictation','A sentence.','一个句子。',
    'A sentence.','a sentence.',true,100,'initial','regression-submission',true)
    on conflict(user_id,submission_key) do nothing;
  insert into public.sentence_dictation_attempts(
    user_id,session_id,vocabulary_id,dataset,sentence_snapshot,translation_snapshot,
    submitted_answer,normalized_answer,is_correct,accuracy,submission_type
  ) values(owner_id,session_id,'regression-skipped','dictation','Skipped.','跳过。',
    '','',false,0,'skipped');
  insert into public.writing_attempts(id,user_id,payload) values(cloze_id,owner_id,
    jsonb_build_object('workspaceId','regression-expression','track','expressions','exercise','phrase:cloze',
      'fixedCorrect',false,'firstTryCorrect',false,
      'draft',jsonb_build_object('fields',jsonb_build_object('answer','wrong'),
        'hintLevel','independent','hintViews',0)));
  -- Backfill helpers do not score a previously saved record twice.
  perform public.record_saved_writing(owner_id,writing_id,content,now());
  select * into row_stats from public.daily_learning_stats
    where user_id=owner_id and stat_date=(timezone('Asia/Shanghai',now()))::date;
  if row_stats.completed_count <> 4 or row_stats.graded_count <> 3
    or row_stats.first_try_correct_count <> 2 or row_stats.points <> 25
    or row_stats.new_mastered_count <> 0 then
    raise exception 'Unexpected aggregates: %',row_to_json(row_stats);
  end if;
  select accuracy into leaderboard_accuracy from public.get_learning_leaderboard('today')
    where is_current_user;
  if leaderboard_accuracy is distinct from 66.7 then
    raise exception 'Open writing must not dilute accuracy: %',leaderboard_accuracy;
  end if;
  if public.current_learning_streak(owner_id) <> 1 then
    raise exception 'All valid sources should participate in study streak';
  end if;
end;
$$;
rollback;
