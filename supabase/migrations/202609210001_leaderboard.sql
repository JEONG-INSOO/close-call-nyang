-- Server-only leaderboard persistence. Apply with the Supabase migration owner.
-- The Edge service verifies Auth and bounded deterministic replay before calling RPCs.
-- No public/anon/authenticated table access, policy, or executable RPC is provided.
-- This file is not evidence of hosted RLS/concurrency verification (required in P02-T03).
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.players (
  user_id uuid primary key references auth.users(id) on delete cascade,
  public_id uuid not null unique default pg_catalog.gen_random_uuid(),
  nickname text not null,
  status text not null default 'active' check (status in ('active', 'hidden', 'banned')),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);
-- Deliberately NOT unique: distinct players can use the same display nickname.
create table private.best_scores (
  user_id uuid not null references private.players(user_id) on delete cascade,
  rules_version text not null,
  score bigint not null check (score between 0 and 9007199254740991),
  achieved_at timestamptz not null default pg_catalog.now(),
  source_run_id uuid not null,
  primary key (user_id, rules_version)
);
-- No FK from source_run_id: the earned best survives short-lived proof retention.
create index best_scores_board on private.best_scores (rules_version, score desc, achieved_at);

create table private.runs (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references private.players(user_id) on delete cascade,
  engine_run_id integer not null check (engine_run_id > 0),
  seed bigint not null check (seed between 1 and 4294967295),
  rules_version text not null,
  state_json jsonb not null check (pg_catalog.jsonb_typeof(state_json) = 'object'),
  accepted_seq integer not null default -1 check (accepted_seq >= -1),
  last_digest text,
  total_ticks bigint not null default 0 check (total_ticks between 0 and 9007199254740991),
  status text not null default 'active' check (status in ('active', 'terminal', 'finalized')),
  issued_at timestamptz not null default pg_catalog.now(),
  last_accepted_at timestamptz not null default pg_catalog.now(),
  expires_at timestamptz not null,
  receipt_json jsonb,
  finalized_at timestamptz,
  check ((accepted_seq = -1 and last_digest is null and total_ticks = 0) or
    (accepted_seq >= 0 and last_digest ~ '^[0-9a-f]{64}$' and total_ticks > 0)),
  check ((status = 'finalized' and receipt_json is not null and finalized_at is not null) or
    (status <> 'finalized' and receipt_json is null and finalized_at is null))
);
create unique index runs_one_open_per_player on private.runs (user_id)
  where status in ('active', 'terminal');
create index runs_idle_retention on private.runs (expires_at) where status in ('active', 'terminal');
create index runs_receipt_retention on private.runs (finalized_at) where status = 'finalized';

create table private.nickname_reports (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  reporter_user_id uuid not null references private.players(user_id) on delete cascade,
  target_public_id uuid not null references private.players(public_id) on delete cascade,
  reason text not null check (reason in ('inappropriate', 'impersonation', 'other')),
  created_at timestamptz not null default pg_catalog.now(),
  unique (reporter_user_id, target_public_id)
);
create index nickname_reports_retention on private.nickname_reports (created_at);
create index nickname_reports_target on private.nickname_reports (target_public_id);

create table private.deletion_receipts (
  -- Intentionally no auth FK: the tombstone must outlive Auth deletion and old JWTs.
  user_id uuid primary key,
  created_at timestamptz not null default pg_catalog.now(),
  completed_at timestamptz,
  status text not null default 'pending_auth_delete'
    check (status in ('pending_auth_delete', 'complete')),
  check ((status = 'complete' and completed_at is not null) or
    (status = 'pending_auth_delete' and completed_at is null))
);
create index deletion_receipts_retention on private.deletion_receipts (completed_at)
  where status = 'complete';

create table private.rate_buckets (
  -- Edge supplies scope:user UUID, or scope:daily-salted IP hash. Never raw IP.
  key text primary key check (pg_catalog.char_length(key) between 1 and 256),
  window_start timestamptz not null,
  count integer not null check (count >= 0)
);
create index rate_buckets_retention on private.rate_buckets (window_start);

alter table private.players enable row level security;
alter table private.best_scores enable row level security;
alter table private.runs enable row level security;
alter table private.nickname_reports enable row level security;
alter table private.deletion_receipts enable row level security;
alter table private.rate_buckets enable row level security;
revoke all on table private.players, private.best_scores, private.runs,
  private.nickname_reports, private.deletion_receipts, private.rate_buckets
  from public, anon, authenticated, service_role;

create function private.rank_fail(p_code text, p_expected_seq bigint default null)
returns void language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = 'P0001', message = p_code,
    detail = pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
      'code', p_code, 'expectedSeq', p_expected_seq))::text;
end;
$$;

create function private.rank_check_subject(p_user_id uuid)
returns void language plpgsql set search_path = '' as $$
begin
  if p_user_id is null then perform private.rank_fail('UNAUTHORIZED'); end if;
  if exists (select 1 from private.deletion_receipts where user_id = p_user_id) then
    perform private.rank_fail('FORBIDDEN');
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    perform private.rank_fail('UNAUTHORIZED');
  end if;
  if exists (select 1 from private.players where user_id = p_user_id and status = 'banned') then
    perform private.rank_fail('FORBIDDEN');
  end if;
end;
$$;

create function private.rank_lock_subject(p_user_id uuid)
returns void language plpgsql set search_path = '' as $$
begin
  if p_user_id is null then perform private.rank_fail('UNAUTHORIZED'); end if;
  -- Serialize even before a profile exists: upsert cannot race deletion/tombstones.
  -- All subject mutations use the same lock order: advisory subject, player, run.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  perform private.rank_check_subject(p_user_id);
end;
$$;

create function private.rank_require_player(p_user_id uuid)
returns void language plpgsql set search_path = '' as $$
declare v_status text;
begin
  perform private.rank_lock_subject(p_user_id);
  -- Keep moderation status stable until the run/report transaction commits.
  -- SHARE is compatible with report target KEY SHARE; it avoids cross-report
  -- deadlocks while preventing an operator status UPDATE during this mutation.
  select status into v_status from private.players where user_id = p_user_id for share;
  if not found then perform private.rank_fail('PROFILE_REQUIRED'); end if;
  if v_status <> 'active' then perform private.rank_fail('FORBIDDEN'); end if;
end;
$$;

create function private.rank_check_state(
  p_state jsonb, p_engine_run_id integer, p_seed bigint, p_total_ticks bigint, p_terminal boolean
) returns void language plpgsql set search_path = '' as $$
declare v_distance numeric;
begin
  -- Defense in depth only; the service's canonical replay verifies the full kernel.
  if p_terminal is null or pg_catalog.jsonb_typeof(p_state) is distinct from 'object'
    or p_state->>'screen' is distinct from (case when p_terminal then 'result' else 'playing' end)
    or pg_catalog.jsonb_typeof(p_state->'run') is distinct from 'object'
    or p_state#>'{run,id}' is distinct from pg_catalog.to_jsonb(p_engine_run_id)
    or p_state#>'{run,seed}' is distinct from pg_catalog.to_jsonb(p_seed)
    or p_state#>'{run,reviveUsed}' is distinct from 'false'::jsonb
    or p_state#>'{run,protectionSeconds}' is distinct from '0'::jsonb
    or p_state#>'{run,stepIndex}' is distinct from pg_catalog.to_jsonb(p_total_ticks)
    or p_state->'resumeTo' is distinct from 'null'::jsonb
    or p_state->'countdownSeconds' is distinct from '0'::jsonb
    or p_state->'adSeconds' is distinct from '0'::jsonb
    or pg_catalog.jsonb_typeof(p_state#>'{run,distanceM}') is distinct from 'number'
    or pg_catalog.jsonb_typeof(p_state#>'{run,elapsedSeconds}') is distinct from 'number'
  then perform private.rank_fail('PROOF_REJECTED'); end if;
  v_distance := (p_state#>>'{run,distanceM}')::numeric;
  if v_distance < 0 or pg_catalog.floor(v_distance) > 9007199254740991
    or (p_state#>>'{run,elapsedSeconds}')::numeric < 0 then
    perform private.rank_fail('PROOF_REJECTED');
  end if;
end;
$$;

create function private.rank_checkpoint(p_run private.runs)
returns jsonb language sql set search_path = '' as $$
  select pg_catalog.jsonb_build_object(
    'runId', p_run.id, 'engineRunId', p_run.engine_run_id, 'seed', p_run.seed,
    'rulesVersion', p_run.rules_version, 'issuedAt', p_run.issued_at, 'expiresAt', p_run.expires_at,
    'userId', p_run.user_id, 'state', p_run.state_json, 'acceptedSeq', p_run.accepted_seq,
    'lastDigest', p_run.last_digest, 'totalTicks', p_run.total_ticks,
    'status', p_run.status, 'receipt', p_run.receipt_json);
$$;

create function private.rank_ack(p_run private.runs)
returns jsonb language sql set search_path = '' as $$
  select pg_catalog.jsonb_build_object('acceptedSeq', p_run.accepted_seq,
    'totalTicks', p_run.total_ticks, 'terminal', p_run.status in ('terminal', 'finalized'),
    'expiresAt', p_run.expires_at);
$$;

create function public.rank_upsert_profile(p_user_id uuid, p_nickname text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_player private.players;
begin
  perform private.rank_lock_subject(p_user_id);
  -- Moderation/blocklist remains authoritative in the Edge handler.
  if p_nickname is null or pg_catalog.char_length(p_nickname) not between 2 and 12
    or p_nickname ~ '[^가-힣A-Za-z0-9 ]' or p_nickname <> pg_catalog.btrim(p_nickname)
    or p_nickname like '%  %' then perform private.rank_fail('NICKNAME_REJECTED'); end if;
  select * into v_player from private.players where user_id = p_user_id for update;
  if found and v_player.status <> 'active' then perform private.rank_fail('FORBIDDEN'); end if;
  insert into private.players (user_id, nickname) values (p_user_id, p_nickname)
    on conflict (user_id) do update set nickname = excluded.nickname, updated_at = pg_catalog.clock_timestamp()
    returning * into v_player;
  return pg_catalog.jsonb_build_object('publicId', v_player.public_id,
    'nickname', v_player.nickname, 'updatedAt', v_player.updated_at);
end;
$$;

create function public.rank_get_profile(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_profile jsonb;
begin
  perform private.rank_check_subject(p_user_id);
  select pg_catalog.jsonb_build_object('publicId', public_id, 'nickname', nickname, 'updatedAt', updated_at)
    into v_profile from private.players where user_id = p_user_id;
  return v_profile;
end;
$$;

create function public.rank_get_board(p_user_id uuid, p_rules_version text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_board jsonb;
begin
  if p_user_id is not null then perform private.rank_check_subject(p_user_id); end if;
  if p_rules_version is null or pg_catalog.char_length(p_rules_version) not between 1 and 128 then
    perform private.rank_fail('INVALID_INPUT');
  end if;
  -- One statement/snapshot for list AND me. Filter moderation BEFORE shared rank.
  with ranked as materialized (
    select p.user_id, p.public_id, p.nickname, b.score, b.achieved_at,
      rank() over (order by b.score desc) as place
    from private.best_scores b join private.players p on p.user_id = b.user_id
    where b.rules_version = p_rules_version and p.status = 'active'
  ), decorated as materialized (
    select user_id, score, achieved_at, public_id,
      pg_catalog.jsonb_build_object('publicId', public_id, 'nickname', nickname,
        'score', score, 'rank', place, 'achievedAt', achieved_at,
        'isMe', (user_id = p_user_id) is true) as entry from ranked
  ), top_rows as (
    select * from decorated order by score desc, achieved_at asc, public_id asc limit 100
  ) select pg_catalog.jsonb_build_object(
    'entries', coalesce((select pg_catalog.jsonb_agg(entry order by score desc, achieved_at asc, public_id asc)
      from top_rows), '[]'::jsonb),
    'me', (select entry from decorated where user_id = p_user_id),
    'rulesVersion', p_rules_version, 'fetchedAt', pg_catalog.clock_timestamp()) into v_board;
  return v_board;
end;
$$;

create function public.rank_start_run(
  p_user_id uuid, p_rules_version text, p_initial_state jsonb, p_seed bigint, p_engine_run_id integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_run private.runs; v_now timestamptz;
begin
  perform private.rank_require_player(p_user_id);
  -- This player row lock is intentional in addition to the subject lock.
  perform 1 from private.players where user_id = p_user_id for update;
  if p_rules_version is null or pg_catalog.char_length(p_rules_version) not between 1 and 128
    or p_seed is null or p_seed not between 1 and 4294967295
    or p_engine_run_id is null or p_engine_run_id <= 0 then
    perform private.rank_fail('INVALID_INPUT');
  end if;
  perform private.rank_check_state(p_initial_state, p_engine_run_id, p_seed, 0, false);
  if p_initial_state#>'{run,distanceM}' is distinct from '0'::jsonb
    or p_initial_state#>'{run,elapsedSeconds}' is distinct from '0'::jsonb then
    perform private.rank_fail('PROOF_REJECTED');
  end if;
  v_now := pg_catalog.clock_timestamp();
  delete from private.runs where user_id = p_user_id and status in ('active', 'terminal');
  insert into private.runs (user_id, engine_run_id, seed, rules_version, state_json,
    issued_at, last_accepted_at, expires_at)
    values (p_user_id, p_engine_run_id, p_seed, p_rules_version, p_initial_state,
      v_now, v_now, v_now + interval '24 hours') returning * into v_run;
  return private.rank_checkpoint(v_run);
end;
$$;

create function public.rank_get_run(p_user_id uuid, p_run_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_run private.runs; v_now timestamptz := pg_catalog.clock_timestamp();
begin
  perform private.rank_check_subject(p_user_id);
  if not exists (select 1 from private.players where user_id = p_user_id and status = 'active') then
    perform private.rank_fail('FORBIDDEN');
  end if;
  select * into v_run from private.runs where id = p_run_id and user_id = p_user_id;
  if not found then perform private.rank_fail('FORBIDDEN'); end if;
  if (v_run.status = 'finalized' and v_now >= v_run.finalized_at + interval '7 days')
    or (v_run.status <> 'finalized' and v_now >= v_run.expires_at) then
    perform private.rank_fail('EXPIRED');
  end if;
  return private.rank_checkpoint(v_run);
end;
$$;

create function public.rank_commit_chunk(
  p_user_id uuid, p_run_id uuid, p_expected_seq integer, p_digest text,
  p_state jsonb, p_added_ticks integer, p_terminal boolean
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_run private.runs; v_now timestamptz; v_ticks bigint;
begin
  perform private.rank_require_player(p_user_id);
  if p_expected_seq is null or p_expected_seq < 0 or p_digest is null
    or p_digest !~ '^[0-9a-f]{64}$' or p_added_ticks is null or p_added_ticks not between 0 and 1200
    or p_terminal is null then perform private.rank_fail('INVALID_INPUT'); end if;
  select * into v_run from private.runs where id = p_run_id and user_id = p_user_id for update;
  if not found then perform private.rank_fail('FORBIDDEN'); end if;
  v_now := pg_catalog.clock_timestamp();
  if v_now >= v_run.expires_at then perform private.rank_fail('EXPIRED'); end if;
  -- Check retransmission BEFORE status: the last terminal chunk may be retried.
  -- Returning the stored ack does NOT update timestamps, expiry, or the checkpoint.
  if p_expected_seq = v_run.accepted_seq and p_digest = v_run.last_digest then
    return private.rank_ack(v_run);
  end if;
  if p_expected_seq::bigint <> v_run.accepted_seq::bigint + 1 then
    perform private.rank_fail('OUT_OF_ORDER', v_run.accepted_seq::bigint + 1);
  end if;
  if v_run.status <> 'active' then perform private.rank_fail('PROOF_REJECTED'); end if;
  -- Latest-retry requests use zero added ticks and do not replay the saved chunk.
  -- Only a fresh, correctly ordered chunk must contribute 1..1200 ticks.
  if p_added_ticks < 1 then perform private.rank_fail('INVALID_INPUT'); end if;
  v_ticks := v_run.total_ticks + p_added_ticks;
  if v_ticks > 9007199254740991 then perform private.rank_fail('PROOF_REJECTED'); end if;
  if v_ticks::numeric / 120 > greatest(0::numeric,
    extract(epoch from (v_now - v_run.issued_at)) - 3) + 2 then
    perform private.rank_fail('PROOF_REJECTED');
  end if;
  perform private.rank_check_state(p_state, v_run.engine_run_id, v_run.seed, v_ticks, p_terminal);
  if (p_state#>>'{run,distanceM}')::numeric < (v_run.state_json#>>'{run,distanceM}')::numeric
    or (p_state#>>'{run,elapsedSeconds}')::numeric < (v_run.state_json#>>'{run,elapsedSeconds}')::numeric then
    perform private.rank_fail('PROOF_REJECTED');
  end if;
  update private.runs set accepted_seq = p_expected_seq, last_digest = p_digest,
    state_json = p_state, total_ticks = v_ticks, status = case when p_terminal then 'terminal' else 'active' end,
    last_accepted_at = v_now, expires_at = v_now + interval '24 hours'
    where id = v_run.id returning * into v_run;
  return private.rank_ack(v_run);
end;
$$;

create function public.rank_finalize_run(p_user_id uuid, p_run_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_run private.runs; v_now timestamptz; v_score bigint; v_best bigint;
  v_rank bigint; v_changed integer; v_receipt jsonb;
begin
  perform private.rank_require_player(p_user_id);
  select * into v_run from private.runs where id = p_run_id and user_id = p_user_id for update;
  if not found then perform private.rank_fail('FORBIDDEN'); end if;
  v_now := pg_catalog.clock_timestamp();
  if v_run.status = 'finalized' then
    if v_now >= v_run.finalized_at + interval '7 days' then perform private.rank_fail('EXPIRED'); end if;
    return v_run.receipt_json;
  end if;
  if v_now >= v_run.expires_at then perform private.rank_fail('EXPIRED'); end if;
  if v_run.status <> 'terminal' then perform private.rank_fail('NOT_FINISHED'); end if;
  perform private.rank_check_state(v_run.state_json, v_run.engine_run_id, v_run.seed, v_run.total_ticks, true);
  -- Only trusted replay distance earns a score; never a client-provided score field.
  v_score := pg_catalog.floor((v_run.state_json#>>'{run,distanceM}')::numeric)::bigint;
  insert into private.best_scores as existing (user_id, rules_version, score, achieved_at, source_run_id)
    values (p_user_id, v_run.rules_version, v_score, v_now, v_run.id)
    on conflict (user_id, rules_version) do update set score = excluded.score,
      achieved_at = excluded.achieved_at, source_run_id = excluded.source_run_id
    where excluded.score > existing.score;
  get diagnostics v_changed = row_count;
  select score into v_best from private.best_scores
    where user_id = p_user_id and rules_version = v_run.rules_version;
  with ranked as (
    select b.user_id, rank() over (order by b.score desc) as place
    from private.best_scores b join private.players p on p.user_id = b.user_id
    where b.rules_version = v_run.rules_version and p.status = 'active'
  ) select place into v_rank from ranked where user_id = p_user_id;
  v_receipt := pg_catalog.jsonb_build_object('runId', v_run.id, 'score', v_score,
    'bestScore', v_best, 'rank', v_rank, 'improved', v_changed > 0);
  update private.runs set status = 'finalized', receipt_json = v_receipt, finalized_at = v_now where id = v_run.id;
  -- Keep expires_at unchanged so an unexpired terminal chunk retry has the same ack.
  -- Receipt retry lifetime uses finalized_at separately (not the old idle expiry).
  return v_receipt;
end;
$$;

create function public.rank_get_deletion_status(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_status text;
begin
  -- Only the DELETE handler's cryptographically verified JWT-subject fallback may
  -- use this lookup without getUser. No existing receipt means fallback must deny.
  if p_user_id is null then perform private.rank_fail('UNAUTHORIZED'); end if;
  select status into v_status from private.deletion_receipts where user_id = p_user_id;
  if not found then return null; end if;
  return pg_catalog.jsonb_build_object('status', v_status);
end;
$$;

create function public.rank_delete_player_data(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_public_id uuid; v_status text;
begin
  if p_user_id is null then perform private.rank_fail('UNAUTHORIZED'); end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  select status into v_status from private.deletion_receipts where user_id = p_user_id for update;
  if found then return pg_catalog.jsonb_build_object('status', v_status); end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    perform private.rank_fail('UNAUTHORIZED');
  end if;
  select public_id into v_public_id from private.players where user_id = p_user_id for update;
  insert into private.deletion_receipts (user_id) values (p_user_id);
  delete from private.nickname_reports where reporter_user_id = p_user_id or target_public_id = v_public_id;
  -- Cascades remove best scores and all runs; the tombstone is in this transaction.
  delete from private.players where user_id = p_user_id;
  return pg_catalog.jsonb_build_object('status', 'pending_auth_delete');
end;
$$;

create function public.rank_complete_deletion(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user_id is null then perform private.rank_fail('UNAUTHORIZED'); end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  if not exists (select 1 from private.deletion_receipts where user_id = p_user_id) then
    perform private.rank_fail('UNAUTHORIZED');
  end if;
  -- Never report final success while the anonymous Auth account still exists.
  if exists (select 1 from auth.users where id = p_user_id) then
    perform private.rank_fail('UNAVAILABLE');
  end if;
  update private.deletion_receipts set status = 'complete', completed_at = pg_catalog.clock_timestamp()
    where user_id = p_user_id and status = 'pending_auth_delete';
end;
$$;

create function public.rank_record_report(p_user_id uuid, p_target_public_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.rank_require_player(p_user_id);
  if p_target_public_id is null or p_reason is null
    or p_reason not in ('inappropriate', 'impersonation', 'other') then
    perform private.rank_fail('INVALID_INPUT');
  end if;
  -- Key-share prevents target deletion between validation and FK insertion.
  perform 1 from private.players where public_id = p_target_public_id and user_id <> p_user_id for key share;
  if not found then perform private.rank_fail('INVALID_INPUT'); end if;
  insert into private.nickname_reports (reporter_user_id, target_public_id, reason)
    values (p_user_id, p_target_public_id, p_reason)
    on conflict (reporter_user_id, target_public_id) do nothing;
  -- Counts do not auto-ban. Operator review is a separate authenticated workflow.
end;
$$;

create function public.rank_limit(p_key text, p_window_seconds integer, p_max integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_bucket private.rate_buckets; v_now timestamptz; v_retry integer;
begin
  if p_key is null or pg_catalog.char_length(p_key) not between 1 and 256
    or p_key ~ '[[:cntrl:]]' or p_window_seconds is null or p_window_seconds not between 1 and 86400
    or p_max is null or p_max < 1 then perform private.rank_fail('INVALID_INPUT'); end if;
  -- A no-op UPSERT locks and returns the existing row in the same statement.
  -- INSERT DO NOTHING followed by SELECT could race retention deleting the row.
  insert into private.rate_buckets as existing (key, window_start, count)
    values (p_key, pg_catalog.clock_timestamp(), 0)
    on conflict (key) do update set key = existing.key returning * into v_bucket;
  v_now := pg_catalog.clock_timestamp();
  if v_now >= v_bucket.window_start + pg_catalog.make_interval(secs => p_window_seconds) then
    v_bucket.window_start := v_now; v_bucket.count := 0;
  end if;
  if v_bucket.count >= p_max then
    v_retry := greatest(1, pg_catalog.ceil(extract(epoch from
      (v_bucket.window_start + pg_catalog.make_interval(secs => p_window_seconds) - v_now)))::integer);
    return pg_catalog.jsonb_build_object('allowed', false, 'retryAfterSeconds', v_retry);
  end if;
  update private.rate_buckets set window_start = v_bucket.window_start, count = v_bucket.count + 1 where key = p_key;
  return pg_catalog.jsonb_build_object('allowed', true, 'retryAfterSeconds', 0);
end;
$$;

create function private.rank_cleanup(p_jwt_max_lifetime_seconds integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if p_jwt_max_lifetime_seconds is null or p_jwt_max_lifetime_seconds < 1 then
    perform private.rank_fail('INVALID_INPUT');
  end if;
  delete from private.runs where status in ('active', 'terminal') and expires_at <= v_now;
  delete from private.runs where status = 'finalized' and finalized_at <= v_now - interval '7 days';
  delete from private.nickname_reports where created_at <= v_now - interval '90 days';
  delete from private.rate_buckets where window_start <= v_now - interval '24 hours';
  delete from private.deletion_receipts d where d.status = 'complete'
    and d.completed_at <= v_now - interval '7 days'
    and d.completed_at <= v_now - pg_catalog.make_interval(secs => p_jwt_max_lifetime_seconds)
    and not exists (select 1 from auth.users where id = d.user_id);
end;
$$;

-- PostgreSQL gives PUBLIC function EXECUTE by default; revoke in this transaction.
revoke all on function private.rank_fail(text, bigint) from public, anon, authenticated, service_role;
revoke all on function private.rank_check_subject(uuid) from public, anon, authenticated, service_role;
revoke all on function private.rank_lock_subject(uuid) from public, anon, authenticated, service_role;
revoke all on function private.rank_require_player(uuid) from public, anon, authenticated, service_role;
revoke all on function private.rank_check_state(jsonb, integer, bigint, bigint, boolean) from public, anon, authenticated, service_role;
revoke all on function private.rank_checkpoint(private.runs) from public, anon, authenticated, service_role;
revoke all on function private.rank_ack(private.runs) from public, anon, authenticated, service_role;
revoke all on function private.rank_cleanup(integer) from public, anon, authenticated, service_role;

revoke all on function public.rank_upsert_profile(uuid, text) from public, anon, authenticated;
revoke all on function public.rank_get_profile(uuid) from public, anon, authenticated;
revoke all on function public.rank_get_board(uuid, text) from public, anon, authenticated;
revoke all on function public.rank_start_run(uuid, text, jsonb, bigint, integer) from public, anon, authenticated;
revoke all on function public.rank_get_run(uuid, uuid) from public, anon, authenticated;
revoke all on function public.rank_commit_chunk(uuid, uuid, integer, text, jsonb, integer, boolean) from public, anon, authenticated;
revoke all on function public.rank_finalize_run(uuid, uuid) from public, anon, authenticated;
revoke all on function public.rank_get_deletion_status(uuid) from public, anon, authenticated;
revoke all on function public.rank_delete_player_data(uuid) from public, anon, authenticated;
revoke all on function public.rank_complete_deletion(uuid) from public, anon, authenticated;
revoke all on function public.rank_record_report(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.rank_limit(text, integer, integer) from public, anon, authenticated;

grant execute on function public.rank_upsert_profile(uuid, text) to service_role;
grant execute on function public.rank_get_profile(uuid) to service_role;
grant execute on function public.rank_get_board(uuid, text) to service_role;
grant execute on function public.rank_start_run(uuid, text, jsonb, bigint, integer) to service_role;
grant execute on function public.rank_get_run(uuid, uuid) to service_role;
grant execute on function public.rank_commit_chunk(uuid, uuid, integer, text, jsonb, integer, boolean) to service_role;
grant execute on function public.rank_finalize_run(uuid, uuid) to service_role;
grant execute on function public.rank_get_deletion_status(uuid) to service_role;
grant execute on function public.rank_delete_player_data(uuid) to service_role;
grant execute on function public.rank_complete_deletion(uuid) to service_role;
grant execute on function public.rank_record_report(uuid, uuid, text) to service_role;
grant execute on function public.rank_limit(text, integer, integer) to service_role;

-- Operations (P02-T03, not automatically enabled by this migration):
-- 1. Verify actual Auth JWT maximum lifetime, including any previously issued JWTs.
-- 2. Schedule private.rank_cleanup(ACTUAL_MAX_SECONDS) hourly as migration owner
--    with pg_cron or a trusted direct-DB scheduler. Never clean pending tombstones.
--    Until scheduled, logical expiry is enforced but physical cleanup is pending.
-- 3. Review reports as an operator; UPDATE private.players SET status='hidden' or
--    'banned' only via authenticated operational SQL. No public moderation RPC.
-- 4. Test grants/RLS as anon/authenticated, row-lock races, and cleanup on hosted DB.
-- References: PostgreSQL CREATE FUNCTION (safe search_path / revoke PUBLIC),
-- https://www.postgresql.org/docs/16/sql-createfunction.html
-- https://www.postgresql.org/docs/17/explicit-locking.html
commit;
