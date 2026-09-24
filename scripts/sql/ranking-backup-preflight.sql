-- READ ONLY. Run with an explicit --project-ref before selecting a backup target.
-- Only aggregate/catalog evidence; never returns session tokens or user rows.
-- This is NOT a backup and NOT restore-success evidence.
begin transaction read only;
select jsonb_build_object(
  'checkedAt', current_timestamp,
  'serverVersion', current_setting('server_version'),
  'databaseBytes', pg_database_size(current_database()),
  'authUsers', (select count(*) from auth.users),
  'authIdentities', (select count(*) from auth.identities),
  'authSessions', (select count(*) from auth.sessions),
  'authRefreshTokens', (select count(*) from auth.refresh_tokens),
  'players', (select count(*) from private.players),
  'bestScores', (select count(*) from private.best_scores),
  'runs', (select count(*) from private.runs),
  'reports', (select count(*) from private.nickname_reports),
  'rateBuckets', (select count(*) from private.rate_buckets),
  'pendingDeletions', (select count(*) from private.deletion_receipts where status='pending_auth_delete'),
  'completedDeletions', (select count(*) from private.deletion_receipts where status='complete'),
  'migrationVersions', (select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),
  'profileReferencesAuth', exists (
    select 1 from pg_constraint where contype='f'
      and conrelid='private.players'::regclass and confrelid='auth.users'::regclass
  ),
  'authTableCount', (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='auth' and c.relkind='r'),
  'backupOrRestoreExecuted', false
) as backup_preflight;
commit;
