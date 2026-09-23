-- STAGING ONLY: tadokcpealpwjfyjovuy (nyang-staging). Never execute on production.
-- Execute this entire file in ONE database connection/batch, including ROLLBACK.
-- The caller must verify the actual API/CLI project ref, then replace the marker
-- below with these two transaction-local declarations:
-- SET LOCAL nyang.verification_environment = 'staging';
-- SET LOCAL nyang.verified_project_ref = 'tadokcpealpwjfyjovuy';
-- These settings express explicit intent, NOT independent proof of the remote ref.
-- Without them the file fails closed. Run as the trusted migration owner.
--
-- Creates 101 new random UUID Auth stubs/profiles/best rows and a unique rulesVersion.
-- No existing records are updated/deleted, no UPSERT, no real Auth session created.
-- FK stubs use only auth.users.id; this is NOT an anonymous-signup or replay test.
-- UUID collisions abort rather than replace data. All inserted rows are rolled back.
-- Unexpected non-internal triggers block execution until independently reviewed.
-- A failed assertion aborts the transaction. The caller MUST rollback/release the
-- connection on any error; never retry a partial file or COMMIT this transaction.
-- No generated IDs, nicknames, or existing user data are emitted.
begin;
-- CALLER_VERIFIED_STAGING_CONTEXT

do $nyang_rank_fixture$
declare
  v_rules_version text := 'nyang-staging-fixture-' || pg_catalog.gen_random_uuid()::text;
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
  then
    raise exception 'STAGING_FIXTURE_TARGET_NOT_CONFIRMED';
  end if;
  if current_user is distinct from (
    select pg_catalog.pg_get_userbyid(c.relowner)
    from pg_catalog.pg_class c
    where c.oid = pg_catalog.to_regclass('private.players')
  ) then
    raise exception 'STAGING_FIXTURE_REQUIRES_MIGRATION_OWNER';
  end if;
  if exists (select 1 from private.best_scores where rules_version = v_rules_version) then
    raise exception 'STAGING_FIXTURE_RULES_COLLISION';
  end if;
  if exists (
    select 1 from pg_catalog.pg_trigger
    where not tgisinternal and tgrelid in (
      'auth.users'::regclass, 'private.players'::regclass, 'private.best_scores'::regclass
    )
  ) then
    raise exception 'STAGING_FIXTURE_UNREVIEWED_TRIGGER';
  end if;

  for v_i in 1..101 loop
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

  if (select count(*) from private.best_scores where rules_version = v_rules_version) <> 101 then
    raise exception 'STAGING_FIXTURE_ROW_COUNT';
  end if;
  v_board := public.rank_get_board(v_user_ids[101], v_rules_version);
  if v_board->>'rulesVersion' is distinct from v_rules_version
    or pg_catalog.jsonb_array_length(v_board->'entries') is distinct from 100 then
    raise exception 'STAGING_FIXTURE_TOP100_COUNT_OR_VERSION';
  end if;
  if v_board#>>'{entries,0,rank}' is distinct from '1'
    or v_board#>>'{entries,1,rank}' is distinct from '1'
    or v_board#>>'{entries,2,rank}' is distinct from '3'
    or v_board#>>'{entries,99,rank}' is distinct from '100' then
    raise exception 'STAGING_FIXTURE_SHARED_RANK_1_1_3';
  end if;
  if v_board#>>'{entries,0,publicId}' is distinct from v_public_ids[1]::text
    or v_board#>>'{entries,1,publicId}' is distinct from v_public_ids[2]::text then
    raise exception 'STAGING_FIXTURE_EQUAL_SCORE_ACHIEVED_AT_ORDER';
  end if;
  if v_board#>>'{me,publicId}' is distinct from v_public_ids[101]::text
    or v_board#>>'{me,rank}' is distinct from '101'
    or v_board#>>'{me,score}' is distinct from '901'
    or v_board#>'{me,isMe}' is distinct from 'true'::jsonb then
    raise exception 'STAGING_FIXTURE_ME_OUTSIDE_TOP100';
  end if;
  if exists (
    select 1 from pg_catalog.jsonb_array_elements(v_board->'entries') as item(entry)
    where item.entry->>'publicId' = v_public_ids[101]::text
      or item.entry->'isMe' is distinct from 'false'::jsonb
      or item.entry ? 'userId'
  ) then
    raise exception 'STAGING_FIXTURE_TOP100_IDENTITY_BOUNDARY';
  end if;
  if v_board->'me' ? 'userId' then
    raise exception 'STAGING_FIXTURE_PRIVATE_ID_EXPOSED';
  end if;

  v_public_board := public.rank_get_board(null, v_rules_version);
  if v_public_board->'me' is distinct from 'null'::jsonb
    or pg_catalog.jsonb_array_length(v_public_board->'entries') is distinct from 100
    or v_public_board->'entries' is distinct from v_board->'entries' then
    raise exception 'STAGING_FIXTURE_PUBLIC_BOARD_CONSISTENCY';
  end if;
  raise notice 'NYANG_STAGING_RANK_FIXTURE_ASSERTIONS_PASSED';
end;
$nyang_rank_fixture$;

rollback;

-- The caller must execute the whole batch and stop on any earlier SQL error.
-- Emit evidence after ROLLBACK so clients returning only the final result see it.
select pg_catalog.jsonb_build_object(
  'check', 'staging_synthetic_ranking_fixture', 'assertionsPassed', true,
  'fixtureBased', true, 'replayVerified', false, 'fixturePlayers', 101,
  'sharedRanks', pg_catalog.jsonb_build_array(1, 1, 3),
  'topCount', 100, 'meOutsideTopRank', 101,
  'rollbackCompleted', true,
  'intentGucsCleared',
    coalesce(pg_catalog.current_setting('nyang.verification_environment', true), '') = ''
    and coalesce(pg_catalog.current_setting('nyang.verified_project_ref', true), '') = '',
  'taskComplete', false
) as staging_fixture_assertions;
