import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const sql = readFileSync(new URL('../supabase/migrations/202610300001_ranked_revival.sql', import.meta.url), 'utf8');

test('revival RPC serializes a single owned first-fall child and exposes no public execute', () => {
  assert.match(sql, /parent_run_id uuid unique references private\.runs\(id\) on delete set null/);
  assert.match(sql, /perform private\.rank_require_player\(p_user_id\)/);
  assert.match(sql, /id = p_parent_run_id and user_id = p_user_id for update/);
  assert.match(sql, /v_parent\.status <> 'finalized'/);
  assert.match(sql, /if found then return private\.rank_checkpoint\(v_child\)/);
  assert.match(sql, /revoke all on function public\.rank_start_revived_run\(uuid,uuid,jsonb\) from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.rank_start_revived_run\(uuid,uuid,jsonb\) to service_role/);
  assert.doesNotMatch(sql, /delete from|truncate /i);
});

test('lifetime board ranks each player once, with top30 and immutable receipts', () => {
  assert.match(sql, /select distinct on \(user_id\) user_id, score, achieved_at/);
  assert.match(sql, /rank\(\) over \(order by b.score desc\)/);
  assert.match(sql, /limit 30/);
  assert.match(sql, /select max\(score\) into v_best from private.best_scores where user_id = p_user_id/);
  assert.match(sql, /return v_run.receipt_json/);
  assert.match(sql, /having max\(b.score\) > v_best/);
});
