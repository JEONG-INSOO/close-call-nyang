import type { ApiErrorCode, ChunkAck, LeaderboardResponse, PlayerProfile, ProofChunk, RankedRun, ReportReason, SubmitResult } from './contracts';

export type OnlineStatus = 'unconfigured' | 'guest' | 'loading' | 'ready' | 'offline' | 'deleting';
export type RankSubmissionState = 'local' | 'recording' | 'pending' | 'submitted' | 'unranked';
export interface OnlineProfileState { status: OnlineStatus; profile: PlayerProfile | null; error: string | null }
export interface RankingApi {
  getProfile(): Promise<PlayerProfile | null>;
  saveNickname(nickname: string): Promise<PlayerProfile>;
  deleteProfile(): Promise<void>;
  getLeaderboard(): Promise<LeaderboardResponse>;
  startRun(): Promise<RankedRun>;
  sendChunk(chunk: ProofChunk): Promise<ChunkAck>;
  finalizeRun(runId: string): Promise<SubmitResult>;
  reportNickname(publicId: string, reason: ReportReason): Promise<void>;
}

const messages: Record<ApiErrorCode, string> = {
  INVALID_INPUT: '입력 내용을 다시 확인해 주세요.',
  UNAUTHORIZED: '이 기기의 익명 참여 정보가 만료됐어요. 닉네임을 다시 설정해 참여할 수 있어요. 이전 기록의 소유권은 복구되지 않아요.',
  FORBIDDEN: '이 요청을 처리할 수 없어요.',
  RATE_LIMITED: '요청이 많아요. 잠시 후 다시 시도해 주세요.',
  NICKNAME_REJECTED: '사용할 수 없는 닉네임이에요. 다른 이름을 입력해 주세요.',
  PROFILE_REQUIRED: '닉네임을 저장한 뒤 온라인 랭킹에 참여할 수 있어요.',
  EXPIRED: '기록 제출 시간이 지났어요. 이번 기록은 기기에만 저장돼요.',
  OUT_OF_ORDER: '기록 전송 순서를 확인할 수 없어 이번 기록은 기기에만 저장돼요.',
  PROOF_REJECTED: '플레이 기록을 확인할 수 없어 이번 기록은 기기에만 저장돼요.',
  RULES_MISMATCH: '게임 버전이 달라요. 새로고침하거나 앱을 업데이트해 주세요.',
  NOT_FINISHED: '아직 플레이가 끝나지 않았어요.',
  UNAVAILABLE: '온라인에 연결하지 못했어요. 잠시 후 다시 시도해 주세요. 게임은 계속할 수 있어요.',
};

/** Never surface arbitrary server bodies, SDK errors, URLs or tokens to the UI. */
export class OnlineApiError extends Error {
  readonly retryable: boolean;
  constructor(readonly code: ApiErrorCode, readonly status = 0, readonly retryAfterSeconds?: number, readonly expectedSeq?: number) {
    super(messages[code]);
    this.name = 'OnlineApiError';
    this.retryable = code === 'UNAVAILABLE' || code === 'RATE_LIMITED';
  }
}
export function onlineErrorMessage(error: unknown): string {
  return error instanceof OnlineApiError ? messages[error.code] : messages.UNAVAILABLE;
}
