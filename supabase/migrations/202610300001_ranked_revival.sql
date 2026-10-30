-- Forward-only: retain all historical scores and first-fall receipts.
begin;
alter table private.runs add column parent_run_id uuid unique references private.runs(id) on delete set null;

create or replace function private.rank_checkpoint(p_run private.runs)
returns jsonb language sql set search_path = '' as $$
  select pg_catalog.jsonb_build_object(
    'runId', p_run.id, 'engineRunId', p_run.engine_run_id, 'seed', p_run.seed,
    'rulesVersion', p_run.rules_version, 'issuedAt', p_run.issued_at, 'expiresAt', p_run.expires_at,
    'userId', p_run.user_id, 'state', p_run.state_json, 'acceptedSeq', p_run.accepted_seq,
    'lastDigest', p_run.last_digest, 'totalTicks', p_run.total_ticks,
    'status', p_run.status, 'receipt', p_run.receipt_json, 'parentRunId', p_run.parent_run_id);
$$;

create or replace function private.rank_check_state(
  p_state jsonb, p_engine_run_id integer, p_seed bigint, p_total_ticks bigint, p_terminal boolean
) returns void language plpgsql set search_path = '' as $$
declare v_distance numeric; v_protection numeric;
begin
  if p_terminal is null or pg_catalog.jsonb_typeof(p_state) is distinct from 'object'
    or p_state->>'screen' is distinct from (case when p_terminal then 'result' else 'playing' end)
    or pg_catalog.jsonb_typeof(p_state->'run') is distinct from 'object'
    or p_state#>'{run,id}' is distinct from pg_catalog.to_jsonb(p_engine_run_id)
    or p_state#>'{run,seed}' is distinct from pg_catalog.to_jsonb(p_seed)
    or pg_catalog.jsonb_typeof(p_state#>'{run,reviveUsed}') is distinct from 'boolean'
    or pg_catalog.jsonb_typeof(p_state#>'{run,protectionSeconds}') is distinct from 'number'
    or p_state#>'{run,stepIndex}' is distinct from pg_catalog.to_jsonb(p_total_ticks)
    or p_state->'resumeTo' is distinct from 'null'::jsonb
    or p_state->'countdownSeconds' is distinct from '0'::jsonb
    or p_state->'adSeconds' is distinct from '0'::jsonb
    or pg_catalog.jsonb_typeof(p_state#>'{run,distanceM}') is distinct from 'number'
    or pg_catalog.jsonb_typeof(p_state#>'{run,elapsedSeconds}') is distinct from 'number'
  then perform private.rank_fail('PROOF_REJECTED'); end if;
  v_distance := (p_state#>>'{run,distanceM}')::numeric;
  v_protection := (p_state#>>'{run,protectionSeconds}')::numeric;
  if v_distance < 0 or pg_catalog.floor(v_distance) > 9007199254740991
    or (p_state#>>'{run,elapsedSeconds}')::numeric < 0
    or v_protection < 0 or v_protection > 1.5
    or (p_state#>'{run,reviveUsed}' = 'false'::jsonb and v_protection <> 0)
  then perform private.rank_fail('PROOF_REJECTED'); end if;
end;
$$;

create function public.rank_start_revived_run(p_user_id uuid, p_parent_run_id uuid, p_initial_state jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_parent private.runs; v_child private.runs; v_now timestamptz;
begin
  perform private.rank_require_player(p_user_id);
  perform 1 from private.players where user_id = p_user_id for update;
  select * into v_parent from private.runs where id = p_parent_run_id and user_id = p_user_id for update;
  if not found then perform private.rank_fail('FORBIDDEN'); end if;
  v_now := pg_catalog.clock_timestamp();
  if v_parent.status <> 'finalized' or v_parent.state_json#>'{run,reviveUsed}' is distinct from 'false'::jsonb
    then perform private.rank_fail('PROOF_REJECTED'); end if;
  if v_now >= v_parent.finalized_at + interval '24 hours' then perform private.rank_fail('EXPIRED'); end if;
  select * into v_child from private.runs where parent_run_id = p_parent_run_id;
  if found then return private.rank_checkpoint(v_child); end if;
  perform private.rank_check_state(p_initial_state, v_parent.engine_run_id, v_parent.seed, 0, false);
  if p_initial_state#>'{run,reviveUsed}' is distinct from 'true'::jsonb
    or p_initial_state#>'{run,protectionSeconds}' is distinct from '1.5'::jsonb
    or p_initial_state#>'{run,angleRad}' is distinct from '0'::jsonb
    or p_initial_state#>'{run,angularVelocity}' is distinct from '0'::jsonb
    or p_initial_state#>'{run,distanceM}' is distinct from v_parent.state_json#>'{run,distanceM}'
    or p_initial_state#>'{run,elapsedSeconds}' is distinct from v_parent.state_json#>'{run,elapsedSeconds}'
    or p_initial_state#>'{run,rng}' is distinct from v_parent.state_json#>'{run,rng}'
    then perform private.rank_fail('PROOF_REJECTED'); end if;
  insert into private.runs(user_id, parent_run_id, engine_run_id, seed, rules_version, state_json,
    issued_at, last_accepted_at, expires_at)
    values(p_user_id, p_parent_run_id, v_parent.engine_run_id, v_parent.seed, v_parent.rules_version, p_initial_state,
      v_now, v_now, v_now + interval '24 hours') returning * into v_child;
  return private.rank_checkpoint(v_child);
end;
$$;
revoke all on function public.rank_start_revived_run(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.rank_start_revived_run(uuid,uuid,jsonb) to service_role;

create or replace function public.rank_get_board(p_user_id uuid, p_rules_version text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_board jsonb;
begin
  if p_user_id is not null then perform private.rank_check_subject(p_user_id); end if;
  if p_rules_version is null or pg_catalog.char_length(p_rules_version) not between 1 and 128 then
    perform private.rank_fail('INVALID_INPUT'); end if;
  with best as materialized (
    select distinct on (user_id) user_id, score, achieved_at from private.best_scores
    order by user_id, score desc, achieved_at asc, rules_version asc
  ), ranked as materialized (
    select p.user_id, p.public_id, p.nickname, b.score, b.achieved_at,
      rank() over (order by b.score desc) as place
    from best b join private.players p on p.user_id = b.user_id where p.status = 'active'
  ), decorated as materialized (
    select user_id, score, achieved_at, public_id,
      pg_catalog.jsonb_build_object('publicId', public_id, 'nickname', nickname,
        'score', score, 'rank', place, 'achievedAt', achieved_at,
        'isMe', (user_id = p_user_id) is true) as entry from ranked
  ), top_rows as (select * from decorated order by score desc, achieved_at asc, public_id asc limit 30)
  select pg_catalog.jsonb_build_object(
    'entries', coalesce((select pg_catalog.jsonb_agg(entry order by score desc, achieved_at asc, public_id asc) from top_rows), '[]'::jsonb),
    'me', (select entry from decorated where user_id = p_user_id),
    'rulesVersion', p_rules_version, 'fetchedAt', pg_catalog.clock_timestamp()) into v_board;
  return v_board;
end;
$$;

create or replace function public.rank_finalize_run(p_user_id uuid, p_run_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_run private.runs; v_now timestamptz; v_score bigint; v_best bigint;
  v_previous bigint; v_rank bigint; v_receipt jsonb;
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
  v_score := pg_catalog.floor((v_run.state_json#>>'{run,distanceM}')::numeric)::bigint;
  select max(score) into v_previous from private.best_scores where user_id = p_user_id;
  insert into private.best_scores as existing(user_id, rules_version, score, achieved_at, source_run_id)
    values(p_user_id, v_run.rules_version, v_score, v_now, v_run.id)
    on conflict(user_id, rules_version) do update set score = excluded.score,
      achieved_at = excluded.achieved_at, source_run_id = excluded.source_run_id where excluded.score > existing.score;
  select max(score) into v_best from private.best_scores where user_id = p_user_id;
  select 1 + count(*) into v_rank from (
    select b.user_id from private.best_scores b join private.players p on p.user_id = b.user_id
    where p.status = 'active' group by b.user_id having max(b.score) > v_best
  ) higher;
  v_receipt := pg_catalog.jsonb_build_object('runId', v_run.id, 'score', v_score,
    'bestScore', v_best, 'rank', v_rank, 'improved', v_previous is null or v_score > v_previous);
  update private.runs set status = 'finalized', receipt_json = v_receipt, finalized_at = v_now where id = v_run.id;
  return v_receipt;
end;
$$;
commit;
