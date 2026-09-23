-- STAGING ONLY: tadokcpealpwjfyjovuy (nyang-staging). Never run on production.
-- Run as the migration owner in ONE connection/batch, with ROLLBACK before the final result.
-- After verifying the actual request target, the caller must replace the marker
-- below with SET LOCAL nyang.verification_environment = 'staging'; and
-- SET LOCAL nyang.verified_project_ref = 'tadokcpealpwjfyjovuy';.
-- Intent GUCs are not independent proof of project identity; the target ref is
-- checked separately by the caller. Missing declarations fail closed.
--
-- Tests actual SQL permission failures under SET LOCAL ROLE, not just catalog ACLs.
-- All table statements affect ZERO rows even if unexpectedly allowed:
-- SELECT LIMIT 0 / INSERT SELECT WHERE false / UPDATE WHERE false / DELETE WHERE false.
-- This includes best_scores INSERT/UPDATE for anon/authenticated/service_role.
-- Public RPC probes use typed NULL arguments, rejected by existing body validation
-- if an EXECUTE grant is accidentally present. Only SQLSTATE 42501 counts as denial.
-- Unexpected success or a different error fails the assertion. No cleanup call,
-- truncation, generated Auth users, real data changes, or service secrets involved.
-- Unexpected non-internal table triggers block even these zero-row statements.
-- A failing batch aborts its transaction; caller must rollback/release on error.
begin;
set local nyang.verification_environment = 'staging';
set local nyang.verified_project_ref = 'tadokcpealpwjfyjovuy';

do $nyang_permission_negatives$
declare
  v_owner_role text := current_user;
  v_role text;
  v_table text;
  v_column text;
  v_sql text;
  v_denied boolean;
  v_table_checks integer := 0;
  v_rpc_checks integer := 0;
begin
  if pg_catalog.current_setting('nyang.verification_environment', true) is distinct from 'staging'
    or pg_catalog.current_setting('nyang.verified_project_ref', true) is distinct from 'tadokcpealpwjfyjovuy'
  then
    raise exception 'STAGING_PERMISSION_TARGET_NOT_CONFIRMED';
  end if;
  if current_user is distinct from (
    select pg_catalog.pg_get_userbyid(c.relowner)
    from pg_catalog.pg_class c where c.oid = pg_catalog.to_regclass('private.players')
  ) then
    raise exception 'STAGING_PERMISSION_REQUIRES_MIGRATION_OWNER';
  end if;
  if exists (
    select 1 from pg_catalog.pg_trigger
    where not tgisinternal and tgrelid in (
      'private.players'::regclass, 'private.best_scores'::regclass, 'private.runs'::regclass,
      'private.nickname_reports'::regclass, 'private.deletion_receipts'::regclass,
      'private.rate_buckets'::regclass
    )
  ) then
    raise exception 'STAGING_PERMISSION_UNREVIEWED_TRIGGER';
  end if;

  foreach v_role in array array['anon', 'authenticated', 'service_role'] loop
    for v_table, v_column in
      select * from (values
        ('players', 'nickname'), ('best_scores', 'score'), ('runs', 'total_ticks'),
        ('nickname_reports', 'reason'), ('deletion_receipts', 'status'), ('rate_buckets', 'count')
      ) as targets(table_name, mutable_column)
    loop
      foreach v_sql in array array[
        pg_catalog.format('select 1 from private.%I limit 0', v_table),
        pg_catalog.format('insert into private.%I select * from private.%I where false', v_table, v_table),
        pg_catalog.format('update private.%I set %I = %I where false', v_table, v_column, v_column),
        pg_catalog.format('delete from private.%I where false', v_table)
      ] loop
        v_denied := false;
        begin
          execute pg_catalog.format('set local role %I', v_role);
          begin
            execute v_sql;
          exception when insufficient_privilege then
            v_denied := true;
          end;
          execute pg_catalog.format('set local role %I', v_owner_role);
        exception when others then
          execute pg_catalog.format('set local role %I', v_owner_role);
          raise exception 'STAGING_TABLE_PERMISSION_UNEXPECTED_ERROR';
        end;
        if not v_denied then
          raise exception 'STAGING_TABLE_PERMISSION_UNEXPECTED_SUCCESS';
        end if;
        v_table_checks := v_table_checks + 1;
      end loop;
    end loop;
  end loop;

  foreach v_role in array array['anon', 'authenticated'] loop
    foreach v_sql in array array[
      'select public.rank_upsert_profile(null::uuid, null::text)',
      'select public.rank_get_profile(null::uuid)',
      'select public.rank_get_board(null::uuid, null::text)',
      'select public.rank_start_run(null::uuid, null::text, null::jsonb, null::bigint, null::integer)',
      'select public.rank_get_run(null::uuid, null::uuid)',
      'select public.rank_commit_chunk(null::uuid, null::uuid, null::integer, null::text, null::jsonb, null::integer, null::boolean)',
      'select public.rank_finalize_run(null::uuid, null::uuid)',
      'select public.rank_get_deletion_status(null::uuid)',
      'select public.rank_delete_player_data(null::uuid)',
      'select public.rank_complete_deletion(null::uuid)',
      'select public.rank_record_report(null::uuid, null::uuid, null::text)',
      'select public.rank_limit(null::text, null::integer, null::integer)'
    ] loop
      v_denied := false;
      begin
        execute pg_catalog.format('set local role %I', v_role);
        begin
          execute v_sql;
        exception when insufficient_privilege then
          v_denied := true;
        end;
        execute pg_catalog.format('set local role %I', v_owner_role);
      exception when others then
        execute pg_catalog.format('set local role %I', v_owner_role);
        raise exception 'STAGING_RPC_PERMISSION_UNEXPECTED_ERROR';
      end;
      if not v_denied then
        raise exception 'STAGING_RPC_PERMISSION_UNEXPECTED_SUCCESS';
      end if;
      v_rpc_checks := v_rpc_checks + 1;
    end loop;
  end loop;

  if v_table_checks <> 72 or v_rpc_checks <> 24 or current_user <> v_owner_role then
    raise exception 'STAGING_PERMISSION_CHECK_COUNT_OR_ROLE';
  end if;
  raise notice 'NYANG_STAGING_PERMISSION_96_ASSERTIONS_PASSED';
end;
$nyang_permission_negatives$;

rollback;

-- The caller must execute the whole batch and stop on any earlier SQL error.
-- Emit evidence after ROLLBACK so clients returning only the final result see it.
select pg_catalog.jsonb_build_object(
  'check', 'staging_sql_permission_negatives', 'assertionsPassed', true,
  'tableDenials', 72, 'rpcDenials', 24, 'expectedSqlstate', '42501',
  'tableRowsAffected', 0, 'rollbackCompleted', true,
  'intentGucsCleared',
    coalesce(pg_catalog.current_setting('nyang.verification_environment', true), '') = ''
    and coalesce(pg_catalog.current_setting('nyang.verified_project_ref', true), '') = '',
  'taskComplete', false
) as staging_permission_assertions;
