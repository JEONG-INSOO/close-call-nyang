import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChunkAck, LeaderboardResponse, PlayerProfile, RankedRun, SubmitResult } from '../../../src/online/contracts.ts';
import type { GameState } from './game/types.ts';
import { ApiFailure, databaseFailure } from './api-error.ts';

export interface RunCheckpoint extends RankedRun {
  userId: string; state: GameState; acceptedSeq: number; lastDigest: string | null;
  totalTicks: number; status: 'active' | 'terminal' | 'finalized'; receipt: SubmitResult | null;
}
export interface DeletionStatus { status: 'pending_auth_delete' | 'complete' }
export interface LimitResult { allowed: boolean; retryAfterSeconds: number }
export interface RankingRepository {
  upsertProfile(userId: string, nickname: string): Promise<PlayerProfile>;
  getProfile(userId: string): Promise<PlayerProfile | null>;
  getBoard(userId: string | null, version: string): Promise<LeaderboardResponse>;
  startRun(userId: string, version: string, state: GameState, seed: number, engineRunId: number): Promise<RunCheckpoint>;
  getRun(userId: string, runId: string): Promise<RunCheckpoint>;
  commitChunk(userId: string, runId: string, seq: number, digest: string, state: GameState, ticks: number, terminal: boolean): Promise<ChunkAck>;
  finalizeRun(userId: string, runId: string): Promise<SubmitResult>;
  getDeletionStatus(userId: string): Promise<DeletionStatus | null>;
  deletePlayerData(userId: string): Promise<DeletionStatus>;
  completeDeletion(userId: string): Promise<void>;
  report(userId: string, targetPublicId: string, reason: 'inappropriate' | 'impersonation' | 'other'): Promise<void>;
  limit(key: string, windowSeconds: number, maximum: number): Promise<LimitResult>;
}

interface RpcArguments {
  rank_upsert_profile: { p_user_id: string; p_nickname: string };
  rank_get_profile: { p_user_id: string };
  rank_get_board: { p_user_id: string | null; p_rules_version: string };
  rank_start_run: { p_user_id: string; p_rules_version: string; p_initial_state: GameState; p_seed: number; p_engine_run_id: number };
  rank_get_run: { p_user_id: string; p_run_id: string };
  rank_commit_chunk: { p_user_id: string; p_run_id: string; p_expected_seq: number; p_digest: string; p_state: GameState; p_added_ticks: number; p_terminal: boolean };
  rank_finalize_run: { p_user_id: string; p_run_id: string };
  rank_get_deletion_status: { p_user_id: string };
  rank_delete_player_data: { p_user_id: string };
  rank_complete_deletion: { p_user_id: string };
  rank_record_report: { p_user_id: string; p_target_public_id: string; p_reason: string };
  rank_limit: { p_key: string; p_window_seconds: number; p_max: number };
}
interface RpcResults {
  rank_upsert_profile: PlayerProfile; rank_get_profile: PlayerProfile | null;
  rank_get_board: LeaderboardResponse; rank_start_run: RunCheckpoint; rank_get_run: RunCheckpoint;
  rank_commit_chunk: ChunkAck; rank_finalize_run: SubmitResult;
  rank_get_deletion_status: DeletionStatus | null; rank_delete_player_data: DeletionStatus;
  rank_complete_deletion: void; rank_record_report: void; rank_limit: LimitResult;
}

/** All ownership, wall-clock budget and CAS checks are repeated transactionally by these RPCs. */
export function createRepository(admin: SupabaseClient): RankingRepository {
  async function call<K extends keyof RpcArguments>(name: K, args: RpcArguments[K]): Promise<RpcResults[K]> {
    try {
      const { data, error } = await admin.rpc(name, args);
      if (error) throw databaseFailure(error);
      return data as RpcResults[K];
    } catch (error) {
      if (error instanceof ApiFailure) throw error;
      throw new ApiFailure('UNAVAILABLE');
    }
  }
  return {
    upsertProfile: (id, nickname) => call('rank_upsert_profile', { p_user_id: id, p_nickname: nickname }),
    getProfile: id => call('rank_get_profile', { p_user_id: id }),
    getBoard: (id, version) => call('rank_get_board', { p_user_id: id, p_rules_version: version }),
    startRun: (id, version, state, seed, engineRunId) => call('rank_start_run', {
      p_user_id: id, p_rules_version: version, p_initial_state: state, p_seed: seed, p_engine_run_id: engineRunId,
    }),
    getRun: (id, runId) => call('rank_get_run', { p_user_id: id, p_run_id: runId }),
    commitChunk: (id, runId, seq, digest, state, ticks, terminal) => call('rank_commit_chunk', {
      p_user_id: id, p_run_id: runId, p_expected_seq: seq, p_digest: digest,
      p_state: state, p_added_ticks: ticks, p_terminal: terminal,
    }),
    finalizeRun: (id, runId) => call('rank_finalize_run', { p_user_id: id, p_run_id: runId }),
    getDeletionStatus: id => call('rank_get_deletion_status', { p_user_id: id }),
    deletePlayerData: id => call('rank_delete_player_data', { p_user_id: id }),
    completeDeletion: id => call('rank_complete_deletion', { p_user_id: id }),
    report: (id, target, reason) => call('rank_record_report', { p_user_id: id, p_target_public_id: target, p_reason: reason }),
    limit: (key, window, maximum) => call('rank_limit', { p_key: key, p_window_seconds: window, p_max: maximum }),
  };
}
