import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ProofChunk, RankedRun } from './contracts';
import { RULES_VERSION } from './rulesVersion';
import { CHUNK_TICKS } from './runRecorder';
import type { RankSubmissionState } from './types';
export type { RankSubmissionState } from './types';

export const PROOF_STORAGE_KEY = 'close-call-nyang.online.proof.v1';
export const MAX_PROOF_BYTES = 1024 * 1024;
export const MAX_UPLOAD_FAILURES = 20;
export interface PendingProof {
  schemaVersion: 1;
  userId: string;
  run: RankedRun;
  chunks: ProofChunk[];
  nextSeq: number;
  terminalRecorded: boolean;
  updatedAt: string;
  submissionState: RankSubmissionState;
  /** Persist acknowledgments and retry budget so reload cannot guess server state. */
  acknowledgedTicks: number;
  failureCount: number;
  retryAt: string | null;
}
export interface ProofStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
export type ProofLoadResult = { kind: 'empty' } | { kind: 'valid'; proof: PendingProof } |
  { kind: 'invalid'; reason: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const integer = (value: unknown, minimum = 0): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum;
const date = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
// Multiple React leases/identities share the same physical key and storage adapter.
const storageWrites = new WeakMap<ProofStorage, Promise<void>>();

/** Portable UTF-8 byte count: TextEncoder is not required on Hermes. */
export function proofByteLength(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const code = character.codePointAt(0)!;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return bytes;
}

export function isRankedRun(value: unknown, now = Date.now()): value is RankedRun {
  if (!isRecord(value)) return false;
  return typeof value.runId === 'string' && UUID.test(value.runId) &&
    integer(value.engineRunId, 1) && value.engineRunId <= 0x7fffffff &&
    integer(value.seed, 1) && value.seed <= 0xffffffff && value.rulesVersion === RULES_VERSION &&
    date(value.issuedAt) && date(value.expiresAt) && Date.parse(value.expiresAt) > now &&
    Date.parse(value.expiresAt) > Date.parse(value.issuedAt);
}

export function parsePendingProof(raw: string | null, userId: string, now = Date.now()): ProofLoadResult {
  if (raw === null) return { kind: 'empty' };
  const invalid = (reason = '저장된 등록 대기 기록을 사용할 수 없어요.'): ProofLoadResult => ({ kind: 'invalid', reason });
  if (proofByteLength(raw) > MAX_PROOF_BYTES) return invalid('등록 대기 기록의 저장 용량을 초과했어요.');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return invalid(); }
  if (!isRecord(value) || value.schemaVersion !== 1 || value.userId !== userId || !UUID.test(userId) ||
      !isRankedRun(value.run, now) || !Array.isArray(value.chunks) || !integer(value.nextSeq) ||
      !integer(value.acknowledgedTicks) || !integer(value.failureCount) || value.failureCount >= MAX_UPLOAD_FAILURES ||
      !(value.retryAt === null || date(value.retryAt)) ||
      !date(value.updatedAt) || typeof value.terminalRecorded !== 'boolean' ||
      !['recording', 'pending'].includes(String(value.submissionState))) return invalid();
  if (value.chunks.length > value.nextSeq) return invalid();
  const firstSeq = value.nextSeq - value.chunks.length;
  if ((firstSeq === 0 && value.acknowledgedTicks !== 0) ||
      (firstSeq > 0 && value.acknowledgedTicks < firstSeq)) return invalid();
  const chunks: ProofChunk[] = [];
  for (let index = 0; index < value.chunks.length; index += 1) {
    const item: unknown = value.chunks[index];
    if (!isRecord(item) || item.runId !== value.run.runId || item.seq !== firstSeq + index ||
        !Array.isArray(item.spans) || item.spans.length < 1 || item.spans.length > CHUNK_TICKS) return invalid();
    let ticks = 0;
    let previousDirection: unknown = null;
    const spans: ProofChunk['spans'] = [];
    for (const span of item.spans) {
      if (!isRecord(span) || ![-1, 0, 1].includes(Number(span.direction)) ||
          typeof span.direction !== 'number' || span.direction === previousDirection || !integer(span.ticks, 1)) return invalid();
      ticks += span.ticks;
      if (ticks > CHUNK_TICKS) return invalid();
      previousDirection = span.direction;
      spans.push({ direction: span.direction as -1 | 0 | 1, ticks: span.ticks });
    }
    if (ticks < CHUNK_TICKS && (!value.terminalRecorded || index !== value.chunks.length - 1)) return invalid();
    chunks.push({ runId: value.run.runId, seq: firstSeq + index, spans });
  }
  if (value.terminalRecorded && value.nextSeq < 1) return invalid();
  // Whitelist the stored shape. Never carry session tokens or unknown fields forward.
  const run = value.run;
  return { kind: 'valid', proof: {
    schemaVersion: 1, userId,
    run: { runId: run.runId, engineRunId: run.engineRunId, seed: run.seed, rulesVersion: run.rulesVersion,
      issuedAt: run.issuedAt, expiresAt: run.expiresAt },
    chunks, nextSeq: value.nextSeq, terminalRecorded: value.terminalRecorded,
    updatedAt: value.updatedAt, submissionState: value.submissionState as 'recording' | 'pending',
    acknowledgedTicks: value.acknowledgedTicks, failureCount: value.failureCount,
    retryAt: value.retryAt,
  } };
}

/** Every mutation is sequenced; removal can never be overtaken by an older save. */
export function createProofQueue(storage: ProofStorage = AsyncStorage) {
  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const writes = storageWrites.get(storage) ?? Promise.resolve();
    const result = writes.then(operation, operation);
    storageWrites.set(storage, result.then(() => {}, () => {}));
    return result;
  };
  return {
    load(userId: string, now = Date.now()): Promise<ProofLoadResult> {
      return enqueue(async () => parsePendingProof(await storage.getItem(PROOF_STORAGE_KEY), userId, now));
    },
    save(proof: PendingProof): Promise<void> {
      const serialized = JSON.stringify(proof);
      if (proofByteLength(serialized) > MAX_PROOF_BYTES) return Promise.reject(new Error('PROOF_CAPACITY'));
      return enqueue(() => storage.setItem(PROOF_STORAGE_KEY, serialized));
    },
    // null means no owned run: do nothing. undefined is reserved for an explicit
    // discard of unreadable/corrupt storage, never automatic old-run cleanup.
    clear: (expectedUserId: string, expectedRunId?: string | null) => enqueue(async () => {
      if (expectedRunId === null) return;
      const raw = await storage.getItem(PROOF_STORAGE_KEY);
      if (raw !== null) {
        try {
          const value: unknown = JSON.parse(raw);
          if (isRecord(value) && typeof value.userId === 'string' && value.userId !== expectedUserId) return;
          if (expectedRunId !== undefined && (!isRecord(value) || !isRecord(value.run) || value.run.runId !== expectedRunId)) return;
        } catch {
          if (expectedRunId !== undefined) return;
          // Only explicit unscoped discard may remove unrecoverable data.
        }
      }
      await storage.removeItem(PROOF_STORAGE_KEY);
    }),
  };
}
