import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ApiFailure, databaseFailure } from '../api-error.ts';
import { createInitialState } from '../game/engine.ts';
import { createRepository } from '../repository.ts';

Deno.test('repository binds explicit subjects and all typed SQL parameters without dynamic SQL', async () => {
  const calls: { name: string; args: unknown }[] = [];
  const client = { rpc: async (name: string, args: unknown) => { calls.push({ name, args }); return { data: null, error: null }; } } as unknown as SupabaseClient;
  const repository = createRepository(client);
  const state = createInitialState();
  await repository.upsertProfile('subject', '냥대리');
  await repository.getProfile('subject');
  await repository.getBoard(null, 'rules');
  await repository.startRun('subject', 'rules', state, 123, 456);
  await repository.getRun('subject', 'run');
  await repository.commitChunk('subject', 'run', 7, 'digest', state, 1200, true);
  await repository.finalizeRun('subject', 'run');
  await repository.getDeletionStatus('subject');
  await repository.deletePlayerData('subject');
  await repository.completeDeletion('subject');
  await repository.report('subject', 'public-id', 'inappropriate');
  await repository.limit('hashed-key', 60, 30);
  assert.deepEqual(calls, [
    { name: 'rank_upsert_profile', args: { p_user_id: 'subject', p_nickname: '냥대리' } },
    { name: 'rank_get_profile', args: { p_user_id: 'subject' } },
    { name: 'rank_get_board', args: { p_user_id: null, p_rules_version: 'rules' } },
    { name: 'rank_start_run', args: { p_user_id: 'subject', p_rules_version: 'rules', p_initial_state: state, p_seed: 123, p_engine_run_id: 456 } },
    { name: 'rank_get_run', args: { p_user_id: 'subject', p_run_id: 'run' } },
    { name: 'rank_commit_chunk', args: { p_user_id: 'subject', p_run_id: 'run', p_expected_seq: 7, p_digest: 'digest', p_state: state, p_added_ticks: 1200, p_terminal: true } },
    { name: 'rank_finalize_run', args: { p_user_id: 'subject', p_run_id: 'run' } },
    { name: 'rank_get_deletion_status', args: { p_user_id: 'subject' } },
    { name: 'rank_delete_player_data', args: { p_user_id: 'subject' } },
    { name: 'rank_complete_deletion', args: { p_user_id: 'subject' } },
    { name: 'rank_record_report', args: { p_user_id: 'subject', p_target_public_id: 'public-id', p_reason: 'inappropriate' } },
    { name: 'rank_limit', args: { p_key: 'hashed-key', p_window_seconds: 60, p_max: 30 } },
  ]);
});

Deno.test('only allowlisted database failures escape; SQL diagnostics and credentials are masked', async () => {
  const ordering = databaseFailure({ message: 'OUT_OF_ORDER', details: JSON.stringify({ code: 'OUT_OF_ORDER', expectedSeq: 9, secret: 'never-echo' }) });
  assert.deepEqual(ordering.toJSON(), { code: 'OUT_OF_ORDER', message: ordering.message, expectedSeq: 9 });
  assert.equal(databaseFailure({ message: 'UNAUTHORIZED' }).status, 401);
  assert.equal(databaseFailure({ message: 'private-table secret-token' }).code, 'UNAVAILABLE');
  assert.equal(databaseFailure({ message: '__proto__' }).code, 'UNAVAILABLE');
  const client = { rpc: async () => ({ data: null, error: { message: 'private-table secret-token', details: 'SQL stack' } }) } as unknown as SupabaseClient;
  await assert.rejects(createRepository(client).getProfile('subject'), error => error instanceof ApiFailure && error.code === 'UNAVAILABLE' && !error.message.includes('secret'));
});
