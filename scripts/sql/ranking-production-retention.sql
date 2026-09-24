-- PRODUCTION ONLY: --linked --project-ref fgojrxmpxpzdiwsktjsx
-- Before executing, confirm hosted Auth jwt_expiry=3600 and inspect eligible rows.
-- This registers a daily job; it does not call cleanup immediately.
-- Do not copy this environment-specific operation into shared migrations.
begin;
do $$
begin
  if current_user <> 'postgres' then raise exception 'RETENTION_REQUIRES_OWNER'; end if;
  if current_setting('cron.timezone', true) is null or
     current_setting('cron.timezone', true) not in ('GMT', 'UTC') then
    raise exception 'RETENTION_REQUIRES_UTC_CRON';
  end if;
  if (select md5(trim(regexp_replace(prosrc, '\s+', ' ', 'g')))
      from pg_proc where oid = 'private.rank_cleanup(integer)'::regprocedure)
      is distinct from 'ffc7b98ec0020d9112df197875bbd2ff' then
    raise exception 'RETENTION_FUNCTION_REVIEW_REQUIRED';
  end if;
end;
$$;
create extension if not exists pg_cron with schema pg_catalog;
do $$
begin
  if exists (select 1 from cron.job where jobname = 'nyang-production-rank-cleanup'
    and (command <> 'select private.rank_cleanup(3600)' or username <> 'postgres'
      or database <> current_database())) then
    raise exception 'RETENTION_JOB_CONFLICT';
  end if;
end;
$$;
select cron.schedule('nyang-production-rank-cleanup', '15 3 * * *',
  'select private.rank_cleanup(3600)');
commit;
select jobid, jobname, schedule, active, username, database
from cron.job where jobname = 'nyang-production-rank-cleanup';
