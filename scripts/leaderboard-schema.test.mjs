import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

// Static contract regression checks, NOT a PostgreSQL parser, migration run,
// concurrency test, or hosted RLS verification. P02-T03 must apply the migration
// and exercise separate anon/authenticated/service-role sessions on a real DB.
const baseSource = await readFile(new URL('../supabase/migrations/202609210001_leaderboard.sql', import.meta.url), 'utf8');
const top30Source = await readFile(new URL('../supabase/migrations/202609230002_leaderboard_top30.sql', import.meta.url), 'utf8');
const lifecycleFixture = await readFile(new URL('./sql/ranking-staging-lifecycle.sql', import.meta.url), 'utf8');
const source = `${baseSource}\n${top30Source}`;
const sql = source.replace(/--[^\r\n]*/g, '').replace(/\r\n/g, '\n');
const compact = value => value.replace(/\s+/g, ' ').trim();
const flat = compact(sql);
const functions = new Map();
for (const [, name, parameters, declaration, body] of sql.matchAll(/create (?:or replace )?function (\w+\.\w+)\s*\(([^]*?)\)\s*returns ([^]*?) as \$\$([^]*?)\$\$;/g)) {
  functions.set(name, { parameters: compact(parameters), declaration: compact(declaration), body: compact(body) });
}
function routine(name) {
  const value = functions.get(name);
  assert.ok(value, `Missing SQL function ${name}`);
  return value;
}
const body = name => routine(name).body;
const tables = ['players', 'best_scores', 'runs', 'nickname_reports', 'deletion_receipts', 'rate_buckets'];
const rpc = {
  rank_upsert_profile: ['p_user_id uuid, p_nickname text', 'uuid, text', 'jsonb'],
  rank_get_profile: ['p_user_id uuid', 'uuid', 'jsonb'],
  rank_get_board: ['p_user_id uuid, p_rules_version text', 'uuid, text', 'jsonb'],
  rank_start_run: ['p_user_id uuid, p_rules_version text, p_initial_state jsonb, p_seed bigint, p_engine_run_id integer', 'uuid, text, jsonb, bigint, integer', 'jsonb'],
  rank_get_run: ['p_user_id uuid, p_run_id uuid', 'uuid, uuid', 'jsonb'],
  rank_commit_chunk: ['p_user_id uuid, p_run_id uuid, p_expected_seq integer, p_digest text, p_state jsonb, p_added_ticks integer, p_terminal boolean', 'uuid, uuid, integer, text, jsonb, integer, boolean', 'jsonb'],
  rank_finalize_run: ['p_user_id uuid, p_run_id uuid', 'uuid, uuid', 'jsonb'],
  rank_get_deletion_status: ['p_user_id uuid', 'uuid', 'jsonb'],
  rank_delete_player_data: ['p_user_id uuid', 'uuid', 'jsonb'],
  rank_complete_deletion: ['p_user_id uuid', 'uuid', 'void'],
  rank_record_report: ['p_user_id uuid, p_target_public_id uuid, p_reason text', 'uuid, uuid, text', 'void'],
  rank_limit: ['p_key text, p_window_seconds integer, p_max integer', 'text, integer, integer', 'jsonb'],
};

test('static: exact named RPC parameters match the Edge adapter contract', () => {
  assert.deepEqual([...functions.keys()].filter(name => name.startsWith('public.')).sort(),
    Object.keys(rpc).map(name => `public.${name}`).sort());
  for (const [name, [parameters, , result]] of Object.entries(rpc)) {
    const fn = routine(`public.${name}`);
    assert.equal(fn.parameters, parameters, name);
    assert.equal(fn.declaration, `${result} language plpgsql security definer set search_path = ''`, name);
  }
});

test('static: RPC execution is revoked from clients/PUBLIC and granted only to service_role', () => {
  for (const [name, [, types]] of Object.entries(rpc)) {
    assert.ok(flat.includes(`revoke all on function public.${name}(${types}) from public, anon, authenticated;`), name);
    assert.ok(flat.includes(`grant execute on function public.${name}(${types}) to service_role;`), name);
  }
  const grants = [...sql.matchAll(/grant\s+([^;]+);/g)].map(match => compact(match[0]));
  assert.equal(grants.length, Object.keys(rpc).length);
  for (const grant of grants) assert.match(grant, /^grant execute on function public\.rank_.* to service_role;$/);
  assert.match(sql, /^\s*begin;/);
  assert.match(sql, /commit;\s*$/);
});

test('static: private helpers have fixed search paths and revoked execution', () => {
  const helpers = [...functions].filter(([name]) => name.startsWith('private.'));
  assert.equal(helpers.length, 8);
  for (const [name, fn] of helpers) {
    assert.ok(fn.declaration.includes("set search_path = ''"), name);
    const revoke = flat.split(';').find(part => part.includes(`revoke all on function ${name}(`));
    assert.ok(revoke?.endsWith('from public, anon, authenticated, service_role'), name);
  }
  assert.doesNotMatch(sql, /\bexecute\s+(?:format\s*\(|')/i, 'No dynamic SQL');
});

test('static: all six tables are private with RLS and no direct access grant', () => {
  assert.deepEqual([...sql.matchAll(/create table (\w+\.\w+)\s*\(/g)].map(match => match[1]).sort(),
    tables.map(name => `private.${name}`).sort());
  for (const table of tables) assert.ok(sql.includes(`alter table private.${table} enable row level security;`));
  assert.match(flat, /revoke all on table private\.players, private\.best_scores, private\.runs, private\.nickname_reports, private\.deletion_receipts, private\.rate_buckets from public, anon, authenticated, service_role;/);
  assert.doesNotMatch(sql, /create policy|grant .* on (?:table|schema) /i);
  assert.match(sql, /revoke all on schema private from public, anon, authenticated;/);
});

test('static: duplicate nicknames, opaque public IDs and safe nonnegative scores', () => {
  assert.match(sql, /public_id uuid not null unique default pg_catalog\.gen_random_uuid\(\)/);
  assert.match(sql, /nickname text not null,/);
  assert.doesNotMatch(sql, /unique\s*\(\s*nickname\s*\)|nickname[^,\n]*unique/i);
  assert.match(sql, /score bigint not null check \(score between 0 and 9007199254740991\)/);
  assert.match(sql, /primary key \(user_id, rules_version\)/);
  assert.doesNotMatch(sql, /source_run_id uuid[^,\n]*references/);
  assert.match(body('public.rank_upsert_profile'), /on conflict \(user_id\) do update set nickname = excluded.nickname, updated_at =/);
  assert.doesNotMatch(body('public.rank_upsert_profile'), /set .*public_id\s*=/);
});

test('static: list/me share one snapshot; score-only ties precede exact top 30', () => {
  const board = body('public.rank_get_board');
  assert.match(board, /with ranked as materialized/);
  assert.match(board, /rank\(\) over \(order by b\.score desc\) as place/);
  assert.match(board, /where b.rules_version = p_rules_version and p.status = 'active'/);
  assert.match(board, /order by score desc, achieved_at asc, public_id asc limit 30/);
  assert.match(board, /'me', \(select entry from decorated where user_id = p_user_id\)/);
  assert.match(board, /'isMe', \(user_id = p_user_id\) is true/);
  assert.doesNotMatch(board, /'(?:userId|seed|state|receipt|status|token)'/);
  assert.match(board, /'entries'.*'\[\]'::jsonb/);
});

test('static: mutations serialize subject creation/deletion even before a profile exists', () => {
  assert.match(body('private.rank_lock_subject'), /pg_advisory_xact_lock\(pg_catalog.hashtextextended\(p_user_id::text, 0\)\)/);
  assert.match(body('private.rank_lock_subject'), /private.rank_check_subject\(p_user_id\)/);
  for (const name of ['rank_upsert_profile', 'rank_start_run', 'rank_commit_chunk', 'rank_finalize_run', 'rank_record_report']) {
    assert.match(body(`public.${name}`), /private.rank_(?:lock_subject|require_player)\(p_user_id\)/, name);
  }
  assert.match(body('private.rank_require_player'), /private.rank_lock_subject\(p_user_id\)/);
  assert.match(body('private.rank_require_player'), /select status into v_status from private.players where user_id = p_user_id for share/);
  for (const name of ['rank_delete_player_data', 'rank_complete_deletion']) {
    assert.match(body(`public.${name}`), /pg_advisory_xact_lock\(pg_catalog.hashtextextended\(p_user_id::text, 0\)\)/);
  }
});

test('static: start locks player then replaces only their active/terminal run', () => {
  const start = body('public.rank_start_run');
  assert.match(flat, /create unique index runs_one_open_per_player on private.runs \(user_id\) where status in \('active', 'terminal'\)/);
  assert.match(start, /from private.players where user_id = p_user_id for update/);
  assert.ok(start.indexOf('for update') < start.indexOf('delete from private.runs'));
  assert.match(start, /delete from private.runs where user_id = p_user_id and status in \('active', 'terminal'\)/);
  assert.match(start, /private.rank_check_state\(p_initial_state, p_engine_run_id, p_seed, 0, false\)/);
  assert.match(start, /v_now, v_now, v_now \+ interval '24 hours'/);
  assert.doesNotMatch(sql, /'abandoned'/);
});

test('static: checkpoint/ack camelCase keys preserve nullable digest and receipt', () => {
  const checkpoint = body('private.rank_checkpoint');
  assert.deepEqual([...checkpoint.matchAll(/'([A-Za-z]+)'/g)].map(match => match[1]),
    ['runId', 'engineRunId', 'seed', 'rulesVersion', 'issuedAt', 'expiresAt', 'userId', 'state',
      'acceptedSeq', 'lastDigest', 'totalTicks', 'status', 'receipt']);
  assert.match(checkpoint, /'lastDigest', p_run.last_digest/);
  assert.match(checkpoint, /'receipt', p_run.receipt_json/);
  assert.match(body('private.rank_ack'), /'acceptedSeq', p_run.accepted_seq, 'totalTicks', p_run.total_ticks/);
  assert.match(body('private.rank_ack'), /'terminal', p_run.status in \('terminal', 'finalized'\), 'expiresAt', p_run.expires_at/);
});

test('static: chunk locks/rechecks ownership/expiry before newest exact retry', () => {
  const chunk = body('public.rank_commit_chunk');
  assert.match(chunk, /where id = p_run_id and user_id = p_user_id for update/);
  assert.match(chunk, /if v_now >= v_run.expires_at then perform private.rank_fail\('EXPIRED'\)/);
  const duplicate = chunk.indexOf('if p_expected_seq = v_run.accepted_seq and p_digest = v_run.last_digest');
  const mutation = chunk.indexOf('update private.runs set');
  assert.ok(duplicate > chunk.indexOf("private.rank_fail('EXPIRED')"));
  assert.ok(duplicate < chunk.indexOf("if v_run.status <> 'active'"));
  assert.ok(duplicate < mutation);
  assert.match(chunk.slice(duplicate, mutation), /^if .* then return private.rank_ack\(v_run\); end if;/);
  assert.match(chunk, /p_expected_seq::bigint <> v_run.accepted_seq::bigint \+ 1/);
  assert.match(chunk, /private.rank_fail\('OUT_OF_ORDER', v_run.accepted_seq::bigint \+ 1\)/);
});

test('static: bounded chunk DB clock budget and checkpoint renewal are atomic', () => {
  const chunk = body('public.rank_commit_chunk');
  assert.match(chunk, /p_added_ticks not between 0 and 1200/);
  assert.match(chunk, /if p_added_ticks < 1 then perform private.rank_fail\('INVALID_INPUT'\)/);
  assert.ok(chunk.indexOf('return private.rank_ack(v_run)') < chunk.indexOf('if p_added_ticks < 1'));
  assert.match(chunk, /v_ticks > 9007199254740991/);
  assert.match(chunk, /v_ticks::numeric \/ 120 > greatest\(0::numeric, extract\(epoch from \(v_now - v_run.issued_at\)\) - 3\) \+ 2/);
  assert.match(chunk, /update private.runs set accepted_seq = p_expected_seq, last_digest = p_digest, state_json = p_state, total_ticks = v_ticks, status = case when p_terminal then 'terminal' else 'active' end, last_accepted_at = v_now, expires_at = v_now \+ interval '24 hours'/);
  assert.equal((chunk.match(/update private\.runs/g) ?? []).length, 1);
});

test('static: checkpoint rejects revival, wrong identity/step count and unsafe score', () => {
  const check = body('private.rank_check_state');
  for (const field of ['id', 'seed', 'stepIndex', 'reviveUsed', 'protectionSeconds']) assert.ok(check.includes(`'{run,${field}}'`));
  assert.match(check, /p_state#>'\{run,reviveUsed\}' is distinct from 'false'::jsonb/);
  assert.match(check, /p_state#>'\{run,protectionSeconds\}' is distinct from '0'::jsonb/);
  assert.match(check, /case when p_terminal then 'result' else 'playing' end/);
  assert.match(check, /pg_catalog.floor\(v_distance\) > 9007199254740991/);
});

test('static: checkpoint IF condition parenthesizes CASE to protect its internal THEN', () => {
  // PL/pgSQL reads IF through THEN: parentheses keep the SQL CASE's THEN
  // inside the expression. This guards the observed hosted parse regression,
  // but still does not replace applying the migration to real PostgreSQL.
  const check = body('private.rank_check_state');
  assert.match(check, /p_state->>'screen' is distinct from \(case when p_terminal then 'result' else 'playing' end\)/);
  assert.doesNotMatch(check, /is distinct from case\b/);
});

test('static: terminal finalize returns stored receipt and updates only strict max best', () => {
  const finalize = body('public.rank_finalize_run');
  assert.match(finalize, /where id = p_run_id and user_id = p_user_id for update/);
  assert.match(finalize, /if v_run.status = 'finalized' then .* return v_run.receipt_json; end if/);
  assert.ok(finalize.indexOf('return v_run.receipt_json') < finalize.indexOf('insert into private.best_scores'));
  assert.match(finalize, /if v_run.status <> 'terminal' then perform private.rank_fail\('NOT_FINISHED'\)/);
  assert.match(finalize, /v_score := pg_catalog.floor\(\(v_run.state_json#>>'\{run,distanceM\}'\)::numeric\)::bigint/);
  assert.match(finalize, /where excluded.score > existing.score/);
  assert.doesNotMatch(finalize, /excluded.score >= existing.score/);
  assert.match(finalize, /get diagnostics v_changed = row_count/);
  assert.match(finalize, /'runId'.*'score'.*'bestScore'.*'rank'.*'improved', v_changed > 0/);
  assert.match(finalize, /set status = 'finalized', receipt_json = v_receipt, finalized_at = v_now/);
  assert.doesNotMatch(finalize, /set [^;]*expires_at\s*=/);
});

test('static: seven-day receipt retry is separate from idle/chunk expiry', () => {
  for (const name of ['rank_get_run', 'rank_finalize_run']) {
    assert.match(body(`public.${name}`), /v_run.finalized_at \+ interval '7 days'/);
    assert.match(body(`public.${name}`), /v_now >= v_run.expires_at/);
  }
  assert.match(sql, /finalized_at timestamptz/);
  assert.match(sql, /status = 'finalized' and receipt_json is not null and finalized_at is not null/);
});

test('static: tombstone blocks ordinary routes and has no Auth cascade FK', () => {
  const subject = body('private.rank_check_subject');
  assert.match(subject, /exists \(select 1 from private.deletion_receipts where user_id = p_user_id\) then perform private.rank_fail\('FORBIDDEN'\)/);
  assert.match(subject, /not exists \(select 1 from auth.users where id = p_user_id\) then perform private.rank_fail\('UNAUTHORIZED'\)/);
  assert.match(subject, /status = 'banned'/);
  for (const name of ['rank_get_profile', 'rank_get_board', 'rank_get_run']) {
    assert.match(body(`public.${name}`), /private.rank_check_subject\(p_user_id\)/);
  }
  const table = sql.slice(sql.indexOf('create table private.deletion_receipts'), sql.indexOf('create index deletion_receipts_retention'));
  assert.doesNotMatch(table, /references/);
});

test('static: deletion atomically tombstones and removes reports both by/targeting player', () => {
  const deletion = body('public.rank_delete_player_data');
  assert.match(deletion, /from private.deletion_receipts where user_id = p_user_id for update/);
  assert.ok(deletion.indexOf('if found then return') < deletion.indexOf('from auth.users'));
  assert.match(deletion, /not exists \(select 1 from auth.users where id = p_user_id\) then perform private.rank_fail\('UNAUTHORIZED'\)/);
  assert.ok(deletion.indexOf('insert into private.deletion_receipts') < deletion.indexOf('delete from private.players'));
  assert.match(deletion, /delete from private.nickname_reports where reporter_user_id = p_user_id or target_public_id = v_public_id/);
  assert.match(deletion, /delete from private.players where user_id = p_user_id/);
  assert.match(sql, /target_public_id uuid not null references private.players\(public_id\) on delete cascade/);
  const completion = body('public.rank_complete_deletion');
  assert.match(completion, /exists \(select 1 from auth.users where id = p_user_id\) then perform private.rank_fail\('UNAVAILABLE'\)/);
  assert.match(completion, /where user_id = p_user_id and status = 'pending_auth_delete'/);
});

test('static: deletion retry lookup is read-only with null for absent receipt', () => {
  const lookup = body('public.rank_get_deletion_status');
  assert.match(lookup, /where user_id = p_user_id/);
  assert.match(lookup, /if not found then return null/);
  assert.doesNotMatch(lookup, /\b(?:insert|update|delete)\b/);
});

test('static: reports are deduplicated and never auto-moderate profiles', () => {
  const reports = body('public.rank_record_report');
  assert.match(reports, /p_reason not in \('inappropriate', 'impersonation', 'other'\)/);
  assert.match(reports, /where public_id = p_target_public_id and user_id <> p_user_id for key share/);
  assert.match(reports, /values \(p_user_id, p_target_public_id, p_reason\)/);
  assert.match(reports, /on conflict \(reporter_user_id, target_public_id\) do nothing/);
  assert.doesNotMatch(reports, /update private.players/);
});

test('static: rate counting locks atomically and denied counts cannot overflow', () => {
  const limit = body('public.rank_limit');
  assert.match(limit, /on conflict \(key\) do update set key = existing.key returning \* into v_bucket/);
  assert.match(limit, /p_window_seconds not between 1 and 86400/);
  assert.match(limit, /if v_bucket.count >= p_max then .*'allowed', false, 'retryAfterSeconds', v_retry\); end if/);
  assert.ok(limit.indexOf("'allowed', false") < limit.indexOf('count = v_bucket.count + 1'));
  assert.match(limit, /'allowed', true, 'retryAfterSeconds', 0/);
});

test('static: retention keeps pending tombstones/bests and uses configured JWT lifetime', () => {
  const cleanup = body('private.rank_cleanup');
  assert.equal(routine('private.rank_cleanup').parameters, 'p_jwt_max_lifetime_seconds integer');
  assert.match(cleanup, /p_jwt_max_lifetime_seconds is null or p_jwt_max_lifetime_seconds < 1/);
  assert.match(cleanup, /status in \('active', 'terminal'\) and expires_at <= v_now/);
  assert.match(cleanup, /status = 'finalized' and finalized_at <= v_now - interval '7 days'/);
  assert.match(cleanup, /nickname_reports where created_at <= v_now - interval '90 days'/);
  assert.match(cleanup, /rate_buckets where window_start <= v_now - interval '24 hours'/);
  assert.match(cleanup, /d.status = 'complete' and d.completed_at <= v_now - interval '7 days' and d.completed_at <= v_now - pg_catalog.make_interval\(secs => p_jwt_max_lifetime_seconds\)/);
  assert.match(cleanup, /not exists \(select 1 from auth.users where id = d.user_id\)/);
  assert.doesNotMatch(cleanup, /delete from private.(?:best_scores|players)/);
  assert.match(source, /Until scheduled, logical expiry is enforced but physical cleanup is pending/);
});

test('static: API failures use exact error message and structured optional expectedSeq', () => {
  assert.match(body('private.rank_fail'), /errcode = 'P0001', message = p_code/);
  assert.match(body('private.rank_fail'), /jsonb_strip_nulls\(pg_catalog.jsonb_build_object\( 'code', p_code, 'expectedSeq', p_expected_seq\)\)::text/);
});

test('static: staging lifecycle fixture is isolated, transactional, and checks expired/moderated behavior', () => {
  const fixture = lifecycleFixture.replace(/--[^\r\n]*/g, '').replace(/\r\n/g, '\n');
  assert.match(fixture, /^\s*begin;[\s\S]*set local nyang\.verification_environment = 'staging';/);
  assert.match(fixture, /set local nyang\.verified_project_ref = 'tadokcpealpwjfyjovuy';/);
  assert.match(fixture, /current_user is distinct from[\s\S]*STAGING_LIFECYCLE_REQUIRES_MIGRATION_OWNER/);
  assert.match(fixture, /STAGING_LIFECYCLE_UNREVIEWED_TRIGGER/);
  assert.match(fixture, /update private\.players set status = 'hidden' where user_id = v_hidden/);
  assert.match(fixture, /update private\.players set status = 'banned' where user_id = v_banned/);
  for (const check of [
    'STAGING_LIFECYCLE_ACTIVE_BOARD_ASSERTION', 'STAGING_LIFECYCLE_MODERATED_ROW_VISIBLE',
    'STAGING_LIFECYCLE_BANNED_READ_NOT_BLOCKED', 'STAGING_LIFECYCLE_HIDDEN_WRITE_NOT_BLOCKED',
    'STAGING_LIFECYCLE_BANNED_WRITE_NOT_BLOCKED', 'STAGING_LIFECYCLE_EXPIRED_RUN_NOT_REJECTED',
  ]) assert.ok(fixture.includes(check), check);
  assert.match(fixture, /public\.rank_get_run\(v_expired, v_run\)/);
  assert.match(fixture, /if v_error is distinct from 'EXPIRED'/);
  assert.match(fixture, /rollback;[\s\S]*'rollbackCompleted', true/);
  assert.doesNotMatch(fixture, /\bcommit\s*;/i);
  assert.match(fixture, /'taskComplete', false/);
});
