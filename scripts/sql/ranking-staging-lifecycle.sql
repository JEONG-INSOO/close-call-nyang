-- STAGING ONLY: tadokcpealpwjfyjovuy (nyang-staging). Never execute on production.
-- Run the ENTIRE file in one SQL Editor/database session. It creates random Auth
-- stubs and synthetic rows, tests expiry/moderation RPC behavior, then ROLLBACKs.
-- Confirm the selected Dashboard project ref before execution. This file's GUC
-- markers are intent guards; they cannot prove which remote project is selected.
begin;
set local nyang.verification_environment = 'staging';
set local nyang.verified_project_ref = 'tadokcpealpwjfyjovuy';

do $nyang_lifecycle$
declare
  v_rules text := 'nyang-lifecycle-' || pg_catalog.gen_random_uuid()::text;
  v_active uuid := pg_catalog.gen_random_uuid();
  v_hidden uuid := pg_catalog.gen_random_uuid();
  v_banned uuid := pg_catalog.gen_random_uuid();
  v_expired uuid := pg_catalog.gen_random_uuid();
  v_active_public uuid;
  v_hidden_public uuid;
  v_banned_public uuid;
  v_run uuid := pg_catalog.gen_random_uuid();
  v_board jsonb;
  v_error text;
begin
  if pg_catalog.current_setting('nyang.verification_environment', true) is distinct from 'staging'
    or pg_catalog.current_setting('nyang.verified_project_ref', true) is distinct from 'tadokcpealpwjfyjovuy'
  then raise exception 'STAGING_LIFECYCLE_TARGET_NOT_CONFIRMED'; end if;
  if current_user is distinct from (
    select pg_catalog.pg_get_userbyid(c.relowner)
    from pg_catalog.pg_class c where c.oid = pg_catalog.to_regclass('private.players')
  ) then raise exception 'STAGING_LIFECYCLE_REQUIRES_MIGRATION_OWNER'; end if;
  if exists (
    select 1 from pg_catalog.pg_trigger
    where not tgisinternal and tgrelid in (
      'auth.users'::regclass, 'private.players'::regclass,
      'private.best_scores'::regclass, 'private.runs'::regclass
    )
  ) then raise exception 'STAGING_LIFECYCLE_UNREVIEWED_TRIGGER'; end if;

  insert into auth.users (id) values (v_active), (v_hidden), (v_banned), (v_expired);
  insert into private.players (user_id, nickname)
    values (v_active, '검증활성'), (v_hidden, '검증숨김'), (v_banned, '검증정지'), (v_expired, '검증만료');
  select public_id into strict v_active_public from private.players where user_id = v_active;
  select public_id into strict v_hidden_public from private.players where user_id = v_hidden;
  select public_id into strict v_banned_public from private.players where user_id = v_banned;
  insert into private.best_scores (user_id, rules_version, score, source_run_id)
    values (v_active, v_rules, 100, pg_catalog.gen_random_uuid()),
      (v_hidden, v_rules, 200, pg_catalog.gen_random_uuid()),
      (v_banned, v_rules, 300, pg_catalog.gen_random_uuid());
  update private.players set status = 'hidden' where user_id = v_hidden;
  update private.players set status = 'banned' where user_id = v_banned;

  v_board := public.rank_get_board(v_active, v_rules);
  if pg_catalog.jsonb_array_length(v_board->'entries') is distinct from 1
    or v_board#>>'{entries,0,publicId}' is distinct from v_active_public::text
    or v_board#>>'{entries,0,rank}' is distinct from '1'
    or v_board#>'{me,publicId}' is distinct from pg_catalog.to_jsonb(v_active_public::text)
  then raise exception 'STAGING_LIFECYCLE_ACTIVE_BOARD_ASSERTION'; end if;
  if exists (
    select 1 from pg_catalog.jsonb_array_elements(v_board->'entries') item(entry)
    where item.entry->>'publicId' in (v_hidden_public::text, v_banned_public::text)
  ) then raise exception 'STAGING_LIFECYCLE_MODERATED_ROW_VISIBLE'; end if;

  v_error := null;
  begin
    perform public.rank_get_board(v_banned, v_rules);
  exception when sqlstate 'P0001' then
    get stacked diagnostics v_error = message_text;
  end;
  if v_error is distinct from 'FORBIDDEN' then raise exception 'STAGING_LIFECYCLE_BANNED_READ_NOT_BLOCKED'; end if;

  v_error := null;
  begin
    perform public.rank_start_run(v_hidden, v_rules, '{}'::jsonb, 1, 1);
  exception when sqlstate 'P0001' then
    get stacked diagnostics v_error = message_text;
  end;
  if v_error is distinct from 'FORBIDDEN' then raise exception 'STAGING_LIFECYCLE_HIDDEN_WRITE_NOT_BLOCKED'; end if;

  v_error := null;
  begin
    perform public.rank_start_run(v_banned, v_rules, '{}'::jsonb, 1, 2);
  exception when sqlstate 'P0001' then
    get stacked diagnostics v_error = message_text;
  end;
  if v_error is distinct from 'FORBIDDEN' then raise exception 'STAGING_LIFECYCLE_BANNED_WRITE_NOT_BLOCKED'; end if;

  insert into private.runs (id, user_id, engine_run_id, seed, rules_version, state_json,
    status, issued_at, last_accepted_at, expires_at)
  values (v_run, v_expired, 3, 1, v_rules, '{}'::jsonb,
    'active', pg_catalog.clock_timestamp() - interval '25 hours',
    pg_catalog.clock_timestamp() - interval '25 hours', pg_catalog.clock_timestamp() - interval '1 second');
  v_error := null;
  begin
    perform public.rank_get_run(v_expired, v_run);
  exception when sqlstate 'P0001' then
    get stacked diagnostics v_error = message_text;
  end;
  if v_error is distinct from 'EXPIRED' then raise exception 'STAGING_LIFECYCLE_EXPIRED_RUN_NOT_REJECTED'; end if;

  raise notice 'NYANG_STAGING_LIFECYCLE_ASSERTIONS_PASSED';
end;
$nyang_lifecycle$;

rollback;

select pg_catalog.jsonb_build_object(
  'check', 'staging_lifecycle_fixture', 'assertionsPassed', true,
  'fixtureBased', true, 'moderation', 'active-visible-hidden-and-banned-filtered',
  'protectedWrites', 'hidden-and-banned-rejected', 'expiredRun', 'rejected',
  'rollbackCompleted', true,
  'intentGucsCleared', coalesce(pg_catalog.current_setting('nyang.verification_environment', true), '') = ''
    and coalesce(pg_catalog.current_setting('nyang.verified_project_ref', true), '') = '',
  'taskComplete', false
) as staging_lifecycle_assertions;
