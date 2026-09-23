-- STAGING ONLY: tadokcpealpwjfyjovuy (nyang-staging). Never execute on production.
-- Execute this entire file in ONE database connection/batch, including ROLLBACK.
-- The fixture creates 31 Auth stubs and rolls every row back.
begin;
set local nyang.verification_environment = 'staging';
set local nyang.verified_project_ref = 'tadokcpealpwjfyjovuy';

do $nyang_rank_fixture$
declare
  v_rules_version text := 'nyang-staging-top30-' || pg_catalog.gen_random_uuid()::text;
  v_user_ids uuid[] := array[]::uuid[];
  v_public_ids uuid[] := array[]::uuid[];
  v_user_id uuid;
  v_public_id uuid;
  v_board jsonb;
  v_public_board jsonb;
  v_achieved_at timestamptz := pg_catalog.clock_timestamp();
  v_i integer;
begin
  if pg_catalog.current_setting('nyang.verification_environment', true) is distinct from 'staging'
    or pg_catalog.current_setting('nyang.verified_project_ref', true) is distinct from 'tadokcpealpwjfyjovuy'
  then raise exception 'STAGING_TOP30_TARGET_NOT_CONFIRMED'; end if;
  if current_user is distinct from (
    select pg_catalog.pg_get_userbyid(c.relowner)
    from pg_catalog.pg_class c where c.oid = pg_catalog.to_regclass('private.players')
  ) then raise exception 'STAGING_TOP30_REQUIRES_MIGRATION_OWNER'; end if;

  for v_i in 1..31 loop
    v_user_id := pg_catalog.gen_random_uuid();
    insert into auth.users (id) values (v_user_id);
    insert into private.players (user_id, nickname)
      values (v_user_id, '검증냥대리') returning public_id into v_public_id;
    insert into private.best_scores (user_id, rules_version, score, achieved_at, source_run_id)
      values (v_user_id, v_rules_version,
        case when v_i <= 2 then 1000 else 1002 - v_i end,
        v_achieved_at + v_i * interval '1 second', pg_catalog.gen_random_uuid());
    v_user_ids := pg_catalog.array_append(v_user_ids, v_user_id);
    v_public_ids := pg_catalog.array_append(v_public_ids, v_public_id);
  end loop;

  v_board := public.rank_get_board(v_user_ids[31], v_rules_version);
  if pg_catalog.jsonb_array_length(v_board->'entries') is distinct from 30
    or v_board#>>'{entries,0,rank}' is distinct from '1'
    or v_board#>>'{entries,1,rank}' is distinct from '1'
    or v_board#>>'{entries,2,rank}' is distinct from '3'
    or v_board#>>'{entries,29,rank}' is distinct from '30'
    or v_board#>>'{me,publicId}' is distinct from v_public_ids[31]::text
    or v_board#>>'{me,rank}' is distinct from '31'
    or v_board#>>'{me,score}' is distinct from '971'
    or v_board#>'{me,isMe}' is distinct from 'true'::jsonb
  then raise exception 'STAGING_TOP30_BOUNDARY_ASSERTION'; end if;
  if exists (
    select 1 from pg_catalog.jsonb_array_elements(v_board->'entries') as item(entry)
    where item.entry->>'publicId' = v_public_ids[31]::text or item.entry ? 'userId'
  ) then raise exception 'STAGING_TOP30_IDENTITY_BOUNDARY'; end if;

  v_public_board := public.rank_get_board(null, v_rules_version);
  if v_public_board->'me' is distinct from 'null'::jsonb
    or pg_catalog.jsonb_array_length(v_public_board->'entries') is distinct from 30
    or v_public_board->'entries' is distinct from v_board->'entries'
  then raise exception 'STAGING_TOP30_PUBLIC_CONSISTENCY'; end if;
  raise notice 'NYANG_STAGING_TOP30_ASSERTIONS_PASSED';
end;
$nyang_rank_fixture$;

rollback;

select pg_catalog.jsonb_build_object(
  'check', 'staging_top30_fixture', 'assertionsPassed', true,
  'fixtureBased', true, 'replayVerified', false, 'fixturePlayers', 31,
  'sharedRanks', pg_catalog.jsonb_build_array(1, 1, 3),
  'topCount', 30, 'meOutsideTopRank', 31,
  'rollbackCompleted', true,
  'intentGucsCleared', coalesce(pg_catalog.current_setting('nyang.verification_environment', true), '') = ''
    and coalesce(pg_catalog.current_setting('nyang.verified_project_ref', true), '') = '',
  'taskComplete', false
) as staging_top30_assertions;
