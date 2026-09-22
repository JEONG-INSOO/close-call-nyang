import type { ApiErrorCode } from '../../../src/online/contracts.ts';

const STATUS: Record<ApiErrorCode, number> = {
  INVALID_INPUT: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, RATE_LIMITED: 429,
  NICKNAME_REJECTED: 422, PROFILE_REQUIRED: 409, EXPIRED: 410, OUT_OF_ORDER: 409,
  PROOF_REJECTED: 422, RULES_MISMATCH: 409, NOT_FINISHED: 409, UNAVAILABLE: 503,
};
const MESSAGES: Record<ApiErrorCode, string> = {
  INVALID_INPUT: '요청 형식을 확인해 주세요.', UNAUTHORIZED: '다시 인증해 주세요.',
  FORBIDDEN: '이 작업을 수행할 수 없습니다.', RATE_LIMITED: '잠시 후 다시 시도해 주세요.',
  NICKNAME_REJECTED: '사용할 수 없는 닉네임입니다.', PROFILE_REQUIRED: '닉네임을 먼저 설정해 주세요.',
  EXPIRED: '기록 제출 시간이 만료되었습니다.', OUT_OF_ORDER: '기록 순서를 확인해 주세요.',
  PROOF_REJECTED: '기록을 검증할 수 없습니다.', RULES_MISMATCH: '최신 게임으로 다시 시작해 주세요.',
  NOT_FINISHED: '아직 끝나지 않은 게임입니다.', UNAVAILABLE: '일시적으로 연결할 수 없습니다.',
};

export class ApiFailure extends Error {
  readonly status: number;
  constructor(readonly code: ApiErrorCode, readonly details: { retryAfterSeconds?: number; expectedSeq?: number } = {}) {
    super(MESSAGES[code]);
    this.name = 'ApiFailure';
    this.status = STATUS[code];
  }
  toJSON() { return { code: this.code, message: this.message, ...this.details }; }
}

export function databaseFailure(error: { message?: string; details?: string }): ApiFailure {
  const code = error.message;
  if (!code || !Object.hasOwn(STATUS, code)) return new ApiFailure('UNAVAILABLE');
  let expectedSeq: number | undefined;
  try {
    const detail = JSON.parse(error.details ?? '{}');
    if (Number.isSafeInteger(detail.expectedSeq) && detail.expectedSeq >= 0) expectedSeq = detail.expectedSeq;
  } catch { /* Never echo database diagnostics. */ }
  return new ApiFailure(code as ApiErrorCode, expectedSeq === undefined ? {} : { expectedSeq });
}
