import type { ApiErrorCode, ChunkAck, LeaderboardEntry, LeaderboardResponse, PlayerProfile, RankedRun, SubmitResult } from './contracts';
import { clearOnlineSession, getOnlineConfig, getOnlineIdentity, getPendingDeletion, preserveDeletionIdentity, refreshOnlineIdentity, withOnlineDeadline, type OnlineIdentity } from './client';
import { validateNickname } from './nickname';
import { RULES_VERSION } from './rulesVersion';
import { OnlineApiError, type RankingApi } from './types';

const ERROR_CODES = new Set<ApiErrorCode>(['INVALID_INPUT', 'UNAUTHORIZED', 'FORBIDDEN', 'RATE_LIMITED', 'NICKNAME_REJECTED', 'PROFILE_REQUIRED', 'EXPIRED', 'OUT_OF_ORDER', 'PROOF_REJECTED', 'RULES_MISMATCH', 'NOT_FINISHED', 'UNAVAILABLE']);
let cacheGeneration = 0;
export function invalidateLeaderboardCache(): void { cacheGeneration += 1; }
type ObjectValue = Record<string, unknown>;
function object(value: unknown): ObjectValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new OnlineApiError('UNAVAILABLE');
  return value as ObjectValue;
}
function integer(value: unknown, min = 0): value is number { return Number.isSafeInteger(value) && (value as number) >= min; }
function timestamp(value: unknown): value is string { return typeof value === 'string' && Number.isFinite(Date.parse(value)); }
function uuid(value: unknown): value is string { return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function required(condition: unknown): asserts condition { if (!condition) throw new OnlineApiError('UNAVAILABLE'); }
function parseProfile(value: unknown): PlayerProfile {
  const data = object(value);
  required(uuid(data.publicId) && typeof data.nickname === 'string' && validateNickname(data.nickname).ok && timestamp(data.updatedAt));
  return { publicId: data.publicId, nickname: data.nickname, updatedAt: data.updatedAt };
}
function parseEntry(value: unknown): LeaderboardEntry {
  const data = object(value);
  required(uuid(data.publicId) && typeof data.nickname === 'string' && validateNickname(data.nickname).ok && integer(data.score) && integer(data.rank, 1) && timestamp(data.achievedAt) && typeof data.isMe === 'boolean');
  return { publicId: data.publicId, nickname: data.nickname, score: data.score, rank: data.rank, achievedAt: data.achievedAt, isMe: data.isMe };
}
function parseBoard(value: unknown): LeaderboardResponse {
  const data = object(value);
  required(Array.isArray(data.entries) && data.entries.length <= 100 && timestamp(data.fetchedAt));
  if (data.rulesVersion !== RULES_VERSION) throw new OnlineApiError('RULES_MISMATCH', 409);
  return { entries: data.entries.map(parseEntry), me: data.me === null ? null : parseEntry(data.me), rulesVersion: RULES_VERSION, fetchedAt: data.fetchedAt };
}
function parseRun(value: unknown): RankedRun {
  const data = object(value);
  required(uuid(data.runId) && integer(data.engineRunId, 1) && data.engineRunId <= 0x7fffffff && integer(data.seed, 1) && data.seed <= 0xffffffff && timestamp(data.issuedAt) && timestamp(data.expiresAt) && Date.parse(data.expiresAt) > Date.parse(data.issuedAt));
  if (data.rulesVersion !== RULES_VERSION) throw new OnlineApiError('RULES_MISMATCH', 409);
  return { runId: data.runId, engineRunId: data.engineRunId, seed: data.seed, rulesVersion: RULES_VERSION, issuedAt: data.issuedAt, expiresAt: data.expiresAt };
}
function parseAck(value: unknown): ChunkAck {
  const data = object(value);
  required(integer(data.acceptedSeq) && integer(data.totalTicks) && typeof data.terminal === 'boolean' && timestamp(data.expiresAt));
  return { acceptedSeq: data.acceptedSeq, totalTicks: data.totalTicks, terminal: data.terminal, expiresAt: data.expiresAt };
}
function parseReceipt(value: unknown): SubmitResult {
  const data = object(value);
  required(uuid(data.runId) && integer(data.score) && integer(data.bestScore) && data.bestScore >= data.score && (data.rank === null || integer(data.rank, 1)) && typeof data.improved === 'boolean');
  return { runId: data.runId, score: data.score, bestScore: data.bestScore, rank: data.rank, improved: data.improved };
}
function parseError(value: unknown, response: Response): OnlineApiError {
  const data = value && typeof value === 'object' ? value as ObjectValue : {};
  const code = typeof data.code === 'string' && ERROR_CODES.has(data.code as ApiErrorCode) ? data.code as ApiErrorCode : response.status === 401 ? 'UNAUTHORIZED' : response.status === 429 ? 'RATE_LIMITED' : 'UNAVAILABLE';
  const header = Number(response.headers.get('Retry-After'));
  const retryAfterSeconds = typeof data.retryAfterSeconds === 'number' && Number.isFinite(data.retryAfterSeconds) && data.retryAfterSeconds >= 0 ? data.retryAfterSeconds : header > 0 && Number.isFinite(header) ? header : undefined;
  return new OnlineApiError(code, response.status, retryAfterSeconds, integer(data.expectedSeq) ? data.expectedSeq : undefined);
}

/** A bound instance cannot upload an old user's queue with a replacement user's session. */
export function createRankingApi(expectedUserId?: string): RankingApi | null {
  const config = getOnlineConfig();
  if (!config) return null;
  let boardCache: { userId: string | null; generation: number; until: number; value: LeaderboardResponse } | null = null;

  async function request(path: string, method: 'GET' | 'POST' | 'DELETE', body?: unknown, timeout = 8_000, publicRead = false): Promise<unknown> {
    return withOnlineDeadline(async signal => {
      try {
        let identity = await getOnlineIdentity();
        if (expectedUserId !== undefined && identity?.userId !== expectedUserId) throw new OnlineApiError('UNAUTHORIZED', 401);
        if (!identity && !publicRead) throw new OnlineApiError('UNAUTHORIZED', 401);
        const originalUserId = identity?.userId ?? null;
        const deleting = await getPendingDeletion();
        if (deleting && method !== 'DELETE') throw new OnlineApiError('UNAVAILABLE');
        if (method === 'DELETE') await preserveDeletionIdentity(identity!);
        for (let attempt = 0; attempt < 2; attempt += 1) {
          if (signal.aborted) throw new OnlineApiError('UNAVAILABLE');
          const headers: Record<string, string> = { apikey: config!.publishableKey };
          if (identity) headers.Authorization = `Bearer ${identity.accessToken}`;
          if (body !== undefined) headers['Content-Type'] = 'application/json';
          const response = await fetch(`${config!.url}/functions/v1/leaderboard-api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal, cache: 'no-store' });
          const text = await response.text();
          if (text.length > 524_288) throw new OnlineApiError('UNAVAILABLE');
          let value: unknown;
          try { value = text ? JSON.parse(text) : null; } catch { throw new OnlineApiError('UNAVAILABLE'); }
          if (response.ok) return value;
          const error = parseError(value, response);
          if (error.code === 'UNAUTHORIZED' && originalUserId && attempt === 0 && method !== 'DELETE') {
            identity = await refreshOnlineIdentity(originalUserId);
            if (identity.userId !== originalUserId) throw new OnlineApiError('UNAUTHORIZED', 401);
            continue;
          }
          throw error;
        }
        throw new OnlineApiError('UNAUTHORIZED', 401);
      } catch (error) { throw error instanceof OnlineApiError ? error : new OnlineApiError('UNAVAILABLE'); }
    }, timeout);
  }

  return {
    async getProfile() { const value = await request('/profile', 'GET'); return value === null ? null : parseProfile(value); },
    async saveNickname(nickname) {
      const result = validateNickname(nickname);
      if (!result.ok) throw new OnlineApiError('INVALID_INPUT', 400);
      const profile = parseProfile(await request('/profile', 'POST', { nickname: result.value }));
      invalidateLeaderboardCache();
      return profile;
    },
    async deleteProfile() {
      const value = object(await request('/profile', 'DELETE'));
      required(value.deleted === true);
      await withOnlineDeadline(() => clearOnlineSession(), 8_000);
      invalidateLeaderboardCache();
    },
    async getLeaderboard() {
      const identity = await withOnlineDeadline(() => getOnlineIdentity(), 8_000);
      const userId = identity?.userId ?? null;
      if (expectedUserId !== undefined && expectedUserId !== userId) throw new OnlineApiError('UNAUTHORIZED', 401);
      if (boardCache && boardCache.userId === userId && boardCache.generation === cacheGeneration && Date.now() < boardCache.until) return boardCache.value;
      const generation = cacheGeneration;
      const value = parseBoard(await request(`/leaderboard?rulesVersion=${encodeURIComponent(RULES_VERSION)}`, 'GET', undefined, 8_000, true));
      // No stale personal response is cached across a concurrent auth change.
      const after = await withOnlineDeadline(() => getOnlineIdentity(), 8_000);
      if ((after?.userId ?? null) !== userId) throw new OnlineApiError('UNAUTHORIZED', 401);
      boardCache = { userId, generation, until: Date.now() + 30_000, value };
      return value;
    },
    async startRun() { return parseRun(await request('/runs', 'POST', { rulesVersion: RULES_VERSION }, 2_000)); },
    async sendChunk(chunk) { return parseAck(await request('/runs/chunks', 'POST', chunk)); },
    async finalizeRun(runId) {
      const value = parseReceipt(await request('/runs/finalize', 'POST', { runId }));
      if (value.runId !== runId) throw new OnlineApiError('UNAVAILABLE');
      invalidateLeaderboardCache();
      return value;
    },
    async reportNickname(publicId, reason) {
      const value = object(await request('/reports', 'POST', { targetPublicId: publicId, reason }));
      required(value.reported === true);
    },
  };
}
