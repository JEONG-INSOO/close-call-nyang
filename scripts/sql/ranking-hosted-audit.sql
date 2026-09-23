-- READ ONLY. Run after the intended CLI migration, as its trusted migration owner.
-- Returns one JSON document; no user rows, credentials, function bodies, or cleanup.
-- Precondition: supabase_migrations.schema_migrations exists. Missing migration
-- history must fail this audit, not be silently treated as a successful deploy.
-- Expected invariants:
--   * Exactly six private tables, RLS enabled, no policies; FORCE RLS is not required.
--   * anon/authenticated/service_role have NO direct table or column privileges.
--   * Twelve public RPCs are SECURITY DEFINER; only service_role has EXECUTE.
--   * Eight private helpers have no client/service EXECUTE; only cleanup is DEFINER.
--   * All routines use an explicitly empty search_path and have a trusted owner.
--   * No PUBLIC grants on the private schema/tables or the twenty routines.
--   * Owners should be the intended migration owner, not an app/client role.
-- Checks are catalog evidence only: not REST, concurrency, replay, or cleanup tests.
with
expected_tables(name) as (
  values ('players'), ('best_scores'), ('runs'), ('nickname_reports'),
         ('deletion_receipts'), ('rate_buckets')
),
expected_routines(signature, category, expected_definer, needs_runs_type) as (
  values
    ('public.rank_upsert_profile(uuid,text)', 'rpc', true, false),
    ('public.rank_get_profile(uuid)', 'rpc', true, false),
    ('public.rank_get_board(uuid,text)', 'rpc', true, false),
    ('public.rank_start_run(uuid,text,jsonb,bigint,integer)', 'rpc', true, false),
    ('public.rank_get_run(uuid,uuid)', 'rpc', true, false),
    ('public.rank_commit_chunk(uuid,uuid,integer,text,jsonb,integer,boolean)', 'rpc', true, false),
    ('public.rank_finalize_run(uuid,uuid)', 'rpc', true, false),
    ('public.rank_get_deletion_status(uuid)', 'rpc', true, false),
    ('public.rank_delete_player_data(uuid)', 'rpc', true, false),
    ('public.rank_complete_deletion(uuid)', 'rpc', true, false),
    ('public.rank_record_report(uuid,uuid,text)', 'rpc', true, false),
    ('public.rank_limit(text,integer,integer)', 'rpc', true, false),
    ('private.rank_fail(text,bigint)', 'helper', false, false),
    ('private.rank_check_subject(uuid)', 'helper', false, false),
    ('private.rank_lock_subject(uuid)', 'helper', false, false),
    ('private.rank_require_player(uuid)', 'helper', false, false),
    ('private.rank_check_state(jsonb,integer,bigint,bigint,boolean)', 'helper', false, false),
    ('private.rank_checkpoint(private.runs)', 'helper', false, true),
    ('private.rank_ack(private.runs)', 'helper', false, true),
    ('private.rank_cleanup(integer)', 'helper', true, false)
),
audit_roles(name) as (
  values ('anon'), ('authenticated'), ('service_role')
),
private_schema as (
  select n.oid, n.nspname, n.nspowner, n.nspacl
  from pg_catalog.pg_namespace n where n.nspname = 'private'
),
table_objects as (
  select e.name, c.oid, c.relkind, c.relowner, c.relacl,
         c.relrowsecurity, c.relforcerowsecurity
  from expected_tables e
  left join private_schema n on true
  left join pg_catalog.pg_class c
    on c.relnamespace = n.oid and c.relname = e.name
),
routine_objects as (
  select e.*, p.oid, p.proowner, p.proacl, p.prosecdef, p.proconfig
  from expected_routines e
  left join pg_catalog.pg_proc p on p.oid = case
    when e.needs_runs_type and pg_catalog.to_regtype('private.runs') is null then null
    else pg_catalog.to_regprocedure(e.signature)
  end
),
table_report as (
  select t.name,
    pg_catalog.jsonb_build_object(
      'name', 'private.' || t.name, 'exists', t.oid is not null,
      'relationKind', t.relkind,
      'owner', pg_catalog.pg_get_userbyid(t.relowner),
      'ownedByAuditingRole', t.relowner = (select oid from pg_catalog.pg_roles where rolname = current_user),
      'rlsEnabled', t.relrowsecurity, 'forceRls', t.relforcerowsecurity,
      'policyCount', (select count(*) from pg_catalog.pg_policy where polrelid = t.oid),
      'publicTableGrantCount', (
        select count(*) from pg_catalog.aclexplode(coalesce(t.relacl, pg_catalog.acldefault('r', t.relowner))) a
        where a.grantee = 0
      ),
      'publicColumnGrantCount', (
        select count(*) from pg_catalog.pg_attribute col
        cross join lateral pg_catalog.aclexplode(col.attacl) a
        where col.attrelid = t.oid and not col.attisdropped and a.grantee = 0
      ),
      'roles', (
        select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
          'role', r.name,
          'anyTablePrivilege', pg_catalog.has_table_privilege(r.name, t.oid,
            'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER'),
          'anyColumnPrivilege', pg_catalog.has_any_column_privilege(r.name, t.oid,
            'SELECT, INSERT, UPDATE, REFERENCES')
        ) order by r.name) from audit_roles r
      )
    ) as evidence
  from table_objects t
),
routine_report as (
  select f.signature, f.category,
    pg_catalog.jsonb_build_object(
      'signature', f.signature, 'category', f.category, 'exists', f.oid is not null,
      'owner', pg_catalog.pg_get_userbyid(f.proowner),
      'ownedByAuditingRole', f.proowner = (select oid from pg_catalog.pg_roles where rolname = current_user),
      'securityDefiner', f.prosecdef, 'expectedSecurityDefiner', f.expected_definer,
      -- Show setting names only: unexpected custom settings could hold secrets.
      'configurationNames', (
        select coalesce(pg_catalog.jsonb_agg(pg_catalog.split_part(setting, '=', 1) order by setting), '[]'::jsonb)
        from pg_catalog.unnest(f.proconfig) setting
      ),
      'emptySearchPath', 'search_path=""' = any(coalesce(f.proconfig, array[]::text[])),
      'publicExecuteGrantCount', (
        select count(*) from pg_catalog.aclexplode(coalesce(f.proacl, pg_catalog.acldefault('f', f.proowner))) a
        where a.grantee = 0 and a.privilege_type = 'EXECUTE'
      ),
      'roles', (
        select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
          'role', r.name,
          'execute', pg_catalog.has_function_privilege(r.name, f.oid, 'EXECUTE'),
          'expectedExecute', f.category = 'rpc' and r.name = 'service_role'
        ) order by r.name) from audit_roles r
      )
    ) as evidence
  from routine_objects f
)
select pg_catalog.jsonb_build_object(
  'schemaVersion', 1,
  'evidenceType', 'read_only_hosted_catalog',
  'taskComplete', false,
  'checkedAt', pg_catalog.clock_timestamp(),
  'auditingRole', current_user,
  'expectedMigrationVersion', '202609210001',
  'expectedMigrationPresent', exists (
    select 1 from supabase_migrations.schema_migrations where version = '202609210001'
  ),
  'migrationVersions', (
    select coalesce(pg_catalog.jsonb_agg(m.version order by m.version), '[]'::jsonb)
    from supabase_migrations.schema_migrations m
  ),
  'privateSchema', (
    select pg_catalog.jsonb_build_object(
      'owner', pg_catalog.pg_get_userbyid(n.nspowner),
      'publicGrantCount', (
        select count(*) from pg_catalog.aclexplode(coalesce(n.nspacl, pg_catalog.acldefault('n', n.nspowner))) a
        where a.grantee = 0
      ),
      'roles', (
        select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
          'role', r.name,
          'usage', pg_catalog.has_schema_privilege(r.name, n.oid, 'USAGE'),
          'create', pg_catalog.has_schema_privilege(r.name, n.oid, 'CREATE')
        ) order by r.name) from audit_roles r
      )
    ) from private_schema n
  ),
  'tables', (select pg_catalog.jsonb_agg(evidence order by name) from table_report),
  'rpcs', (select pg_catalog.jsonb_agg(evidence order by signature) from routine_report where category = 'rpc'),
  'helpers', (select pg_catalog.jsonb_agg(evidence order by signature) from routine_report where category = 'helper'),
  'unexpectedPrivateRelations', (
    select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'name', c.relname, 'kind', c.relkind, 'owner', pg_catalog.pg_get_userbyid(c.relowner)
    ) order by c.relname), '[]'::jsonb)
    from pg_catalog.pg_class c join private_schema n on n.oid = c.relnamespace
    where c.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
      and not exists (select 1 from table_objects e where e.oid = c.oid)
  ),
  'unexpectedRankingRoutines', (
    select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'schema', n.nspname, 'signature', p.oid::regprocedure::text,
      'owner', pg_catalog.pg_get_userbyid(p.proowner)
    ) order by n.nspname, p.proname, p.oid), '[]'::jsonb)
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.proname like 'rank\_%' escape '\'
      and not exists (select 1 from routine_objects e where e.oid = p.oid)
  )
) as ranking_hosted_catalog_audit;
