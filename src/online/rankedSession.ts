import type { PlayedTick } from '../game/controller';
import type { ApiErrorCode, RankedRun, SubmitResult } from './contracts';
import { createProofQueue, isRankedRun, MAX_UPLOAD_FAILURES, MAX_PROOF_BYTES, proofByteLength } from './proofQueue';
import type { PendingProof, ProofStorage, RankSubmissionState } from './proofQueue';
import { createRunRecorder } from './runRecorder';
import type { RunRecorder } from './runRecorder';
import type { RankingApi } from './types';

export type { RankSubmissionState } from './proofQueue';
export interface RankedSessionSnapshot {
  state: RankSubmissionState;
  hasPending: boolean;
  needsPendingDecision: boolean;
  runId: string | null;
  engineRunId: number | null;
  receipt: SubmitResult | null;
  error: string | null;
}
export interface RankedSession {
  getSnapshot(): RankedSessionSnapshot;
  subscribe(listener: () => void): () => void;
  restore(): Promise<void>;
  prepareRun(): Promise<RankedRun | null>;
  begin(run: RankedRun): boolean;
  record(tick: PlayedTick): void;
  setForeground(foreground: boolean): void;
  retry(): Promise<void>;
  discard(): Promise<void>;
  /** Permanent for this coordinator: deletion retries must not resume submissions. */
  freeze(): void;
  dispose(): void;
}
const BACKOFF_SECONDS = [1, 2, 4, 8, 16, 30];
const PERMANENT_CODES: ReadonlySet<ApiErrorCode> = new Set([
  'UNAUTHORIZED', 'FORBIDDEN', 'PROFILE_REQUIRED', 'EXPIRED', 'OUT_OF_ORDER',
  'PROOF_REJECTED', 'RULES_MISMATCH', 'NOT_FINISHED', 'INVALID_INPUT', 'NICKNAME_REJECTED',
]);
const initialSnapshot = (): RankedSessionSnapshot => ({ state: 'local', hasPending: false,
  needsPendingDecision: false, runId: null, engineRunId: null, receipt: null, error: null });

/** One identity, one run, one in-flight request. No score is ever sent to the server. */
export function createRankedSession(options: {
  api: RankingApi;
  userId: string;
  storage?: ProofStorage;
  now?: () => number;
}): RankedSession {
  const { api, userId } = options;
  const now = options.now ?? Date.now;
  const queue = createProofQueue(options.storage);
  const listeners = new Set<() => void>();
  let snapshot = initialSnapshot();
  let proof: PendingProof | null = null;
  let recorder: RunRecorder | null = null;
  let restorePromise: Promise<void> | null = null;
  let preparePromise: Promise<RankedRun | null> | null = null;
  let restored = false;
  let allowUnscopedDiscard = false;
  let foreground = true;
  let frozen = false;
  let disposed = false;
  let generation = 0;
  let pumping: Promise<void> | null = null;
  let persisted: Promise<void> = Promise.resolve();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let nextAttemptAt = 0;

  function publish(patch: Partial<RankedSessionSnapshot>): void {
    snapshot = { ...snapshot, ...patch };
    if (!disposed) for (const listener of [...listeners]) if (listeners.has(listener)) listener();
  }
  function clearTimer(): void {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }
  function abandon(message: string): void {
    const abandonedRunId = proof?.run.runId ?? snapshot.runId;
    generation += 1;
    clearTimer();
    proof = null;
    recorder = null;
    publish({ state: 'unranked', hasPending: false, needsPendingDecision: false, receipt: null, error: message });
    persisted = queue.clear(userId, abandonedRunId).catch(() => {});
  }
  function save(): Promise<void> {
    if (!proof) return persisted;
    proof.updatedAt = new Date(now()).toISOString();
    if (proofByteLength(JSON.stringify(proof)) > MAX_PROOF_BYTES) {
      abandon('등록 대기 기록의 저장 용량을 초과해 이번 기록은 기기에만 저장돼요.');
      return Promise.resolve();
    }
    const capturedGeneration = generation;
    persisted = queue.save(proof).catch(() => {
      if (!disposed && capturedGeneration === generation && !frozen) {
        abandon('등록 대기 기록을 안전하게 저장하지 못해 이번 기록은 기기에만 저장돼요.');
      }
      throw new Error('PROOF_STORAGE_FAILED');
    });
    // Recording is synchronous. The uploader still awaits this same rejected promise.
    void persisted.catch(() => {});
    return persisted;
  }
  function usable(): boolean {
    if (disposed || frozen || !foreground || !proof) return false;
    if (Date.parse(proof.run.expiresAt) <= now()) {
      abandon('등록 대기 시간이 지나 이번 기록은 기기에만 저장돼요.');
      return false;
    }
    return true;
  }
  function schedule(): void {
    clearTimer();
    if (!usable() || !proof || (!proof.chunks.length && !proof.terminalRecorded)) return;
    const delay = Math.max(0, Math.min(nextAttemptAt - now(), Date.parse(proof.run.expiresAt) - now()));
    timer = setTimeout(() => { timer = null; void pump(); }, delay);
  }
  async function failure(error: unknown, requestGeneration: number): Promise<void> {
    if (!proof || requestGeneration !== generation || disposed || frozen) return;
    const candidate = error as { code?: ApiErrorCode; retryAfterSeconds?: number } | null;
    if (candidate?.code && PERMANENT_CODES.has(candidate.code)) {
      abandon('서버가 이 기록을 등록할 수 없어 이번 기록은 기기에만 저장돼요.');
      return;
    }
    proof.failureCount += 1;
    if (proof.failureCount >= MAX_UPLOAD_FAILURES) {
      abandon('등록 재시도 한도를 넘겨 이번 기록은 기기에만 저장돼요.');
      return;
    }
    const backoff = BACKOFF_SECONDS[Math.min(proof.failureCount - 1, BACKOFF_SECONDS.length - 1)];
    const requestedDelay = candidate?.code === 'RATE_LIMITED' &&
      Number.isFinite(candidate.retryAfterSeconds) ? Math.max(0, candidate.retryAfterSeconds!) : 0;
    nextAttemptAt = Math.min(now() + Math.max(backoff, requestedDelay) * 1000, Date.parse(proof.run.expiresAt));
    proof.retryAt = new Date(nextAttemptAt).toISOString();
    publish({ state: 'pending', error: '연결이 회복되면 기록 등록을 다시 시도해요.' });
    await save().catch(() => {});
    schedule();
  }
  async function runPump(): Promise<void> {
    if (!usable() || !proof) return;
    if (nextAttemptAt > now()) { schedule(); return; }
    const requestGeneration = generation;
    try {
      await persisted;
      while (usable() && proof && requestGeneration === generation) {
        const chunk = proof.chunks[0];
        if (chunk) {
          // This object remains unchanged until the exact acknowledgment is accepted.
          const ack = await api.sendChunk(chunk);
          if (disposed || frozen || requestGeneration !== generation || !proof) return;
          const totalTicks = proof.acknowledgedTicks + chunk.spans.reduce((sum, span) => sum + span.ticks, 0);
          const finalChunk = proof.terminalRecorded && proof.chunks.length === 1;
          if (ack.acceptedSeq !== chunk.seq || ack.totalTicks !== totalTicks ||
              ack.terminal !== finalChunk || !Number.isFinite(Date.parse(ack.expiresAt)) ||
              Date.parse(ack.expiresAt) <= now()) {
            abandon('서버 확인 결과가 기록과 달라 이번 기록은 기기에만 저장돼요.');
            return;
          }
          proof.chunks.shift();
          proof.acknowledgedTicks = totalTicks;
          proof.run = { ...proof.run, expiresAt: ack.expiresAt };
          proof.failureCount = 0;
          proof.retryAt = null;
          nextAttemptAt = 0;
          proof.submissionState = proof.terminalRecorded ? 'pending' : 'recording';
          publish({ state: proof.submissionState, error: null });
          await save();
          continue;
        }
        if (!proof.terminalRecorded) return;
        const runId = proof.run.runId;
        const receipt = await api.finalizeRun(runId);
        if (disposed || frozen || requestGeneration !== generation || !proof) return;
        if (receipt.runId !== runId || !Number.isSafeInteger(receipt.score) || receipt.score < 0 ||
            !Number.isSafeInteger(receipt.bestScore) || receipt.bestScore < receipt.score ||
            (receipt.rank !== null && (!Number.isSafeInteger(receipt.rank) || receipt.rank < 1)) ||
            typeof receipt.improved !== 'boolean') {
          abandon('서버의 등록 결과를 확인하지 못해 이번 기록은 기기에만 저장돼요.');
          return;
        }
        await queue.clear(userId, runId);
        if (disposed || frozen || requestGeneration !== generation) return;
        proof = null;
        recorder = null;
        clearTimer();
        publish({ state: 'submitted', hasPending: false, needsPendingDecision: false, receipt, error: null });
        return;
      }
    } catch (error) { await failure(error, requestGeneration); }
  }
  function pump(): Promise<void> {
    if (pumping) return pumping;
    clearTimer();
    const pending = runPump();
    pumping = pending.finally(() => { pumping = null; if (timer === null) schedule(); });
    return pumping;
  }
  function restore(): Promise<void> {
    if (restorePromise) return restorePromise;
    const capturedGeneration = generation;
    restorePromise = (async () => {
      try {
        const loaded = await queue.load(userId, now());
        if (disposed || frozen || capturedGeneration !== generation) return;
        restored = true;
        if (loaded.kind === 'invalid') {
          allowUnscopedDiscard = true;
          abandon(loaded.reason);
          // Unknown ownership/version/content is not permission to overwrite disk.
          publish({ needsPendingDecision: true });
          return;
        }
        if (loaded.kind === 'valid') {
          proof = loaded.proof;
          nextAttemptAt = proof.retryAt ? Date.parse(proof.retryAt) : 0;
          publish({ runId: proof.run.runId, engineRunId: proof.run.engineRunId });
          if (!proof.terminalRecorded) {
            abandon('종료 전에 중단된 판은 복원할 수 없어 기기에만 기록돼요.');
            return;
          }
          proof.submissionState = 'pending';
          publish({ state: 'pending', hasPending: true, error: null });
        }
      } catch {
        allowUnscopedDiscard = true;
        publish({ state: 'unranked', needsPendingDecision: true, error: '저장된 등록 대기 기록을 읽지 못했어요. 로컬로 시작하거나 대기 기록을 직접 버려 주세요.' });
        return;
      }
      if (proof) void pump();
    })().finally(() => { if (!restored) restorePromise = null; });
    return restorePromise;
  }
  async function prepare(): Promise<RankedRun | null> {
    await restore();
    if (disposed || frozen) return null;
    if (!restored) return null;
    if (allowUnscopedDiscard) {
      publish({ needsPendingDecision: true });
      return null;
    }
    if (proof) {
      // Do not hold the offline start button hostage to a slow upload.
      let waitTimer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([pump(), new Promise<void>((resolve) => { waitTimer = setTimeout(resolve, 2000); })]);
      if (waitTimer) clearTimeout(waitTimer);
      if (proof) { publish({ needsPendingDecision: true }); return null; }
    }
    const capturedGeneration = generation;
    try {
      const run = await api.startRun();
      if (disposed || frozen || generation !== capturedGeneration) return null;
      if (!isRankedRun(run, now())) {
        publish({ state: 'local', error: '랭킹 규칙을 확인하지 못해 로컬 게임으로 시작해요.' });
        return null;
      }
      publish({ needsPendingDecision: false, error: null });
      return run;
    } catch {
      if (!disposed && !frozen && capturedGeneration === generation) {
        publish({ state: 'local', error: '랭킹 서버에 연결하지 못해 로컬 게임으로 시작해요.' });
      }
      return null;
    }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) { if (disposed) return () => {}; listeners.add(listener); return () => { listeners.delete(listener); }; },
    restore,
    prepareRun() {
      if (preparePromise) return preparePromise;
      preparePromise = prepare().finally(() => { preparePromise = null; });
      return preparePromise;
    },
    begin(run) {
      if (!restored || allowUnscopedDiscard || disposed || frozen || proof || !isRankedRun(run, now())) return false;
      generation += 1;
      nextAttemptAt = 0;
      allowUnscopedDiscard = false;
      recorder = createRunRecorder(run);
      proof = { schemaVersion: 1, userId, run: { ...run }, chunks: [], nextSeq: 0,
        terminalRecorded: false, updatedAt: new Date(now()).toISOString(), submissionState: 'recording',
        acknowledgedTicks: 0, failureCount: 0, retryAt: null };
      publish({ state: 'recording', hasPending: true, needsPendingDecision: false,
        runId: run.runId, engineRunId: run.engineRunId, receipt: null, error: null });
      void save().catch(() => {});
      return true;
    },
    record(tick) {
      if (disposed || frozen || !proof || !recorder || tick.runId !== proof.run.engineRunId) return;
      try {
        recorder.record(tick);
        let chunk = recorder.takeChunk();
        let changed = false;
        while (chunk) { proof.chunks.push(chunk); proof.nextSeq = chunk.seq + 1; changed = true; chunk = recorder.takeChunk(); }
        if (tick.terminal) {
          proof.terminalRecorded = true;
          proof.submissionState = 'pending';
          recorder = null;
          publish({ state: 'pending' });
          changed = true;
        }
        if (changed) { void save().then(() => pump()).catch(() => {}); }
      } catch { abandon('입력 기록이 이어지지 않아 이번 기록은 기기에만 저장돼요.'); }
    },
    setForeground(value) {
      foreground = value;
      clearTimer();
      if (value && !frozen && !disposed) void pump();
    },
    retry: pump,
    async discard() {
      const discardedRunId = proof?.run.runId ?? snapshot.runId ?? (allowUnscopedDiscard ? undefined : null);
      generation += 1;
      clearTimer();
      proof = null;
      recorder = null;
      await queue.clear(userId, discardedRunId);
      allowUnscopedDiscard = false;
      restored = true;
      restorePromise = Promise.resolve();
      publish(initialSnapshot());
    },
    freeze() { frozen = true; generation += 1; clearTimer(); recorder = null; },
    dispose() { disposed = true; frozen = true; generation += 1; clearTimer(); listeners.clear(); recorder = null; },
  };
}
