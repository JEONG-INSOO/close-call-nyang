/** Public wire DTOs only: no platform/SDK dependencies or authentication IDs. */
export interface PlayerProfile { publicId: string; nickname: string; updatedAt: string }
export interface LeaderboardEntry {
  publicId: string; nickname: string; score: number; rank: number;
  achievedAt: string; isMe: boolean;
}
export interface LeaderboardResponse {
  entries: LeaderboardEntry[]; me: LeaderboardEntry | null;
  rulesVersion: string; fetchedAt: string;
}
export interface RankedRun {
  runId: string; engineRunId: number; seed: number; rulesVersion: string;
  issuedAt: string; expiresAt: string;
}
/** Playing ticks only. Both controls held and neither held are direction 0. */
export interface InputSpan { direction: -1 | 0 | 1; ticks: number }
export interface ProofChunk { runId: string; seq: number; spans: InputSpan[] }
export interface ChunkAck {
  acceptedSeq: number; totalTicks: number; terminal: boolean; expiresAt: string;
}
export interface SubmitResult {
  runId: string; score: number; bestScore: number; rank: number | null;
  improved: boolean;
}
export type ApiErrorCode = 'INVALID_INPUT' | 'UNAUTHORIZED' | 'FORBIDDEN' |
  'RATE_LIMITED' | 'NICKNAME_REJECTED' | 'PROFILE_REQUIRED' | 'EXPIRED' |
  'OUT_OF_ORDER' | 'PROOF_REJECTED' | 'RULES_MISMATCH' | 'NOT_FINISHED' | 'UNAVAILABLE';
export interface ApiError {
  code: ApiErrorCode; message: string; retryAfterSeconds?: number; expectedSeq?: number;
}
export type ReportReason = 'inappropriate' | 'impersonation' | 'other';
export interface ProfileRequest { nickname: string }
export interface StartRunRequest { rulesVersion: string }
export interface FinalizeRunRequest { runId: string }
export interface ReportRequest { targetPublicId: string; reason: ReportReason }
