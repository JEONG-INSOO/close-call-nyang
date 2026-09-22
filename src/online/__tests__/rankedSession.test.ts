import { createRankedSession } from '../rankedSession';
import type { RankedSession } from '../rankedSession';
import type { ChunkAck, ProofChunk, RankedRun } from '../contracts';
import { PROOF_STORAGE_KEY } from '../proofQueue';
import type { PendingProof, ProofStorage } from '../proofQueue';
import { OnlineApiError } from '../types';
import type { RankingApi } from '../types';
import { RULES_VERSION } from '../rulesVersion';

const USER = 'b1111111-1111-4111-8111-111111111111';
const NOW = Date.parse('2026-09-22T01:00:00.000Z');
const RUN: RankedRun = { runId: 'a1111111-1111-4111-8111-111111111111', engineRunId: 19,
  seed: 7, rulesVersion: RULES_VERSION, issuedAt: '2026-09-22T01:00:00.000Z', expiresAt: '2026-09-23T01:00:00.000Z' };
function storage(): ProofStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return { values, getItem: jest.fn(async (key) => values.get(key) ?? null),
    setItem: jest.fn(async (key, value) => { values.set(key, value); }),
    removeItem: jest.fn(async (key) => { values.delete(key); }) };
}
function apiMock() {
  let total = 0;
  const receipts = new Map<string, ChunkAck>();
  return {
    getProfile: jest.fn(async () => null), saveNickname: jest.fn(), deleteProfile: jest.fn(),
    getLeaderboard: jest.fn(), reportNickname: jest.fn(), startRun: jest.fn(async () => ({ ...RUN })),
    sendChunk: jest.fn(async (chunk: ProofChunk): Promise<ChunkAck> => {
      const key = `${chunk.runId}:${chunk.seq}`;
      if (receipts.has(key)) return receipts.get(key)!;
      const ticks = chunk.spans.reduce((sum, span) => sum + span.ticks, 0); total += ticks;
      const ack = { acceptedSeq: chunk.seq, totalTicks: total, terminal: ticks < 1200, expiresAt: RUN.expiresAt };
      receipts.set(key, ack); return ack;
    }),
    finalizeRun: jest.fn(async (runId: string) => ({ runId, score: 12, bestScore: 30, rank: 9, improved: false })),
  } satisfies RankingApi;
}
async function settle(count = 50) { for (let index = 0; index < count; index += 1) await Promise.resolve(); }
function record(session: RankedSession, count: number, start = 1, terminal = true, engineRunId = RUN.engineRunId) {
  for (let index = start; index < start + count; index += 1) session.record({ runId: engineRunId,
    tickIndex: index, direction: 1, terminal: terminal && index === start + count - 1 });
}
function storedProof(): PendingProof {
  return { schemaVersion: 1, userId: USER, run: { ...RUN }, chunks: [{ runId: RUN.runId, seq: 0, spans: [{ direction: 1, ticks: 3 }] }],
    nextSeq: 1, terminalRecorded: true, updatedAt: new Date(NOW).toISOString(), submissionState: 'pending',
    acknowledgedTicks: 0, failureCount: 0, retryAt: null };
}
const sessions: RankedSession[] = [];
function setup() {
  const api = apiMock(); const disk = storage();
  const session = createRankedSession({ api, userId: USER, storage: disk }); sessions.push(session);
  return { api, disk, session };
}
beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(NOW); });
afterEach(() => { for (const session of sessions.splice(0)) session.dispose(); jest.clearAllTimers(); jest.useRealTimers(); });

describe('ranked session upload lifecycle', () => {
  test('starts only after restore and records the accepted run before submitting server receipt', async () => {
    const { session, api, disk } = setup();
    expect(session.begin(RUN)).toBe(false);
    await Promise.all([session.restore(), session.restore()]);
    expect(disk.getItem).toHaveBeenCalledTimes(1);
    const run = await session.prepareRun(); expect(run).toEqual(RUN);
    expect(session.begin(run!)).toBe(true);
    record(session, 3); await session.retry(); await settle();
    expect(api.sendChunk).toHaveBeenCalledWith({ runId: RUN.runId, seq: 0, spans: [{ direction: 1, ticks: 3 }] });
    expect(api.finalizeRun).toHaveBeenCalledWith(RUN.runId);
    expect(session.getSnapshot()).toMatchObject({ state: 'submitted', hasPending: false,
      receipt: { score: 12, bestScore: 30, rank: 9 }, engineRunId: 19 });
    expect(disk.values.has(PROOF_STORAGE_KEY)).toBe(false);
  });
  test('sends only one chunk in flight, queues subsequent ticks and deletes acknowledged payloads promptly', async () => {
    const { session, api, disk } = setup(); await session.restore(); session.begin(RUN);
    let accept!: (ack: ChunkAck) => void;
    api.sendChunk.mockImplementationOnce(() => new Promise((resolve) => { accept = resolve; }));
    record(session, 1200, 1, false); await settle();
    record(session, 4, 1201); await settle();
    expect(api.sendChunk).toHaveBeenCalledTimes(1);
    expect(JSON.parse(disk.values.get(PROOF_STORAGE_KEY)!).chunks).toHaveLength(2);
    api.sendChunk.mockResolvedValueOnce({ acceptedSeq: 1, totalTicks: 1204, terminal: true, expiresAt: RUN.expiresAt });
    accept({ acceptedSeq: 0, totalTicks: 1200, terminal: false, expiresAt: RUN.expiresAt });
    await settle();
    expect(api.sendChunk).toHaveBeenCalledTimes(2);
    expect(session.getSnapshot().state).toBe('submitted');
  });
  test('retries the identical payload on 1,2,4,8,16,30 second backoff and stops after 20 failures', async () => {
    const { session, api } = setup(); api.sendChunk.mockRejectedValue(new OnlineApiError('UNAVAILABLE'));
    await session.restore(); session.begin(RUN); record(session, 3); await settle();
    const sent = api.sendChunk.mock.calls[0][0];
    for (let attempt = 1; attempt < 20; attempt += 1) {
      const seconds = [1, 2, 4, 8, 16, 30][Math.min(attempt - 1, 5)];
      await jest.advanceTimersByTimeAsync(seconds * 1000 - 1);
      expect(api.sendChunk).toHaveBeenCalledTimes(attempt);
      await jest.advanceTimersByTimeAsync(1);
      expect(api.sendChunk).toHaveBeenCalledTimes(attempt + 1);
      expect(api.sendChunk.mock.calls[attempt][0]).toBe(sent);
    }
    expect(session.getSnapshot().state).toBe('unranked');
    await jest.advanceTimersByTimeAsync(120000); expect(api.sendChunk).toHaveBeenCalledTimes(20);
    expect(api.finalizeRun).not.toHaveBeenCalled();
  });
  test('respects Retry-After even when explicit retry or foreground resume occurs', async () => {
    const { session, api, disk } = setup(); api.sendChunk.mockRejectedValueOnce(new OnlineApiError('RATE_LIMITED', 429, 45));
    await session.restore(); session.begin(RUN); record(session, 3); await settle();
    expect(JSON.parse(disk.values.get(PROOF_STORAGE_KEY)!).retryAt).toBe(new Date(NOW + 45000).toISOString());
    session.setForeground(false); await jest.advanceTimersByTimeAsync(10000);
    session.setForeground(true); await session.retry();
    expect(api.sendChunk).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(34999); expect(api.sendChunk).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1); expect(session.getSnapshot().state).toBe('submitted');
  });
  test('does no background retries and expiry on foreground only invalidates online proof', async () => {
    const { session, api, disk } = setup(); disk.values.set('close-call-nyang.preferences.v1', 'local best and cats');
    await session.restore(); session.begin(RUN); session.setForeground(false); record(session, 3); await settle();
    expect(api.sendChunk).not.toHaveBeenCalled();
    jest.setSystemTime(NOW + 24 * 60 * 60 * 1000); session.setForeground(true); await settle();
    expect(session.getSnapshot().state).toBe('unranked'); expect(api.sendChunk).not.toHaveBeenCalled();
    expect(disk.values.get('close-call-nyang.preferences.v1')).toBe('local best and cats');
  });
  test.each(['OUT_OF_ORDER', 'UNAUTHORIZED', 'PROOF_REJECTED', 'RULES_MISMATCH', 'EXPIRED'] as const)(
    '%s is not guessed success or retried forever', async (code) => {
      const { session, api } = setup(); api.sendChunk.mockRejectedValue(new OnlineApiError(code));
      await session.restore(); session.begin(RUN); record(session, 3); await settle();
      expect(session.getSnapshot().state).toBe('unranked');
      await jest.advanceTimersByTimeAsync(120000); expect(api.sendChunk).toHaveBeenCalledTimes(1);
      expect(api.finalizeRun).not.toHaveBeenCalled();
    });
  test('lost finalize response retries the same immutable receipt request without resending acknowledged data', async () => {
    const { session, api, disk } = setup(); api.finalizeRun.mockRejectedValueOnce(new OnlineApiError('UNAVAILABLE'));
    await session.restore(); session.begin(RUN); record(session, 3); await settle();
    expect(session.getSnapshot().state).toBe('pending');
    expect(JSON.parse(disk.values.get(PROOF_STORAGE_KEY)!).chunks).toEqual([]);
    await jest.advanceTimersByTimeAsync(1000);
    expect(api.finalizeRun.mock.calls).toEqual([[RUN.runId], [RUN.runId]]);
    expect(api.sendChunk).toHaveBeenCalledTimes(1); expect(session.getSnapshot().state).toBe('submitted');
  });
  test('a pending result requires explicit discard/local decision, never a replacement challenge', async () => {
    const { session, api } = setup(); api.sendChunk.mockRejectedValue(new OnlineApiError('UNAVAILABLE'));
    await session.restore(); session.begin(RUN); record(session, 3); await settle();
    expect(await session.prepareRun()).toBeNull();
    expect(session.getSnapshot()).toMatchObject({ hasPending: true, needsPendingDecision: true });
    expect(api.startRun).not.toHaveBeenCalled(); expect(session.begin({ ...RUN, engineRunId: 20 })).toBe(false);
    await session.discard(); expect(await session.prepareRun()).toEqual(RUN);
  });
  test('ignores stale ticks and rejects sequence gaps without overwriting a valid proof', async () => {
    const { session, api } = setup(); await session.restore(); session.begin(RUN);
    session.record({ runId: 99, tickIndex: 1, direction: 1, terminal: true });
    expect(session.getSnapshot().state).toBe('recording');
    session.record({ runId: 19, tickIndex: 2, direction: 0, terminal: true });
    expect(session.getSnapshot().state).toBe('unranked'); expect(api.sendChunk).not.toHaveBeenCalled();
  });
  test('freezing before an in-flight acknowledgment cannot finalize; successful deletion cleanup stays frozen', async () => {
    const { session, api } = setup(); let accept!: (ack: ChunkAck) => void;
    api.sendChunk.mockImplementation(() => new Promise((resolve) => { accept = resolve; }));
    await session.restore(); session.begin(RUN); record(session, 3); await settle(); session.freeze();
    accept({ acceptedSeq: 0, totalTicks: 3, terminal: true, expiresAt: RUN.expiresAt }); await settle();
    expect(api.finalizeRun).not.toHaveBeenCalled(); await session.discard();
    expect(await session.prepareRun()).toBeNull(); expect(session.begin(RUN)).toBe(false);
  });
  test('an old in-flight completion does not strand a new run after explicit discard', async () => {
    const { session, api } = setup(); let acceptOld!: (ack: ChunkAck) => void;
    api.sendChunk.mockImplementationOnce(() => new Promise((resolve) => { acceptOld = resolve; }));
    await session.restore(); session.begin(RUN); record(session, 3); await settle(); await session.discard();
    const next = { ...RUN, runId: 'd1111111-1111-4111-8111-111111111111', engineRunId: 20 };
    expect(session.begin(next)).toBe(true); record(session, 3, 1, true, 20); await settle();
    expect(api.sendChunk).toHaveBeenCalledTimes(1);
    acceptOld({ acceptedSeq: 0, totalTicks: 3, terminal: true, expiresAt: RUN.expiresAt }); await settle();
    await jest.advanceTimersByTimeAsync(0);
    expect(session.getSnapshot()).toMatchObject({ state: 'submitted', runId: next.runId });
    expect(api.finalizeRun).toHaveBeenCalledWith(next.runId);
  });
  test('a late expired-run cleanup preserves a newer same-user proof written by another coordinator', async () => {
    const { session, api, disk } = setup(); let rejectOld!: (reason: unknown) => void;
    api.sendChunk.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOld = reject; }));
    await session.restore(); session.begin(RUN); record(session, 3); await settle();
    const newer = storedProof(); newer.run.runId = 'd1111111-1111-4111-8111-111111111111'; newer.chunks[0].runId = newer.run.runId;
    disk.values.set(PROOF_STORAGE_KEY, JSON.stringify(newer));
    rejectOld(new OnlineApiError('EXPIRED')); await settle();
    expect(session.getSnapshot().state).toBe('unranked');
    expect(JSON.parse(disk.values.get(PROOF_STORAGE_KEY)!).run.runId).toBe(newer.run.runId);
    session.dispose(); await session.discard();
    expect(JSON.parse(disk.values.get(PROOF_STORAGE_KEY)!).run.runId).toBe(newer.run.runId);
  });
  test('rejects inconsistent acknowledgments and never displays a guessed server score', async () => {
    const { session, api } = setup(); api.sendChunk.mockResolvedValue({ acceptedSeq: 5, totalTicks: 3, terminal: true, expiresAt: RUN.expiresAt });
    await session.restore(); session.begin(RUN); record(session, 3); await settle();
    expect(session.getSnapshot()).toMatchObject({ state: 'unranked', receipt: null });
    expect(api.finalizeRun).not.toHaveBeenCalled();
  });
  test('queue capacity fail stops the whole proof rather than trimming inputs', async () => {
    const { session, api } = setup(); await session.restore(); session.begin(RUN); session.setForeground(false);
    for (let tickIndex = 1; tickIndex <= 40000 && session.getSnapshot().state === 'recording'; tickIndex += 1) {
      session.record({ runId: 19, tickIndex, direction: tickIndex % 2 ? -1 : 1, terminal: false });
    }
    await settle(); expect(session.getSnapshot().state).toBe('unranked');
    session.setForeground(true); await settle(); expect(api.sendChunk).not.toHaveBeenCalled();
  });
});

describe('reload and disk failure boundaries', () => {
  test('restores and finalizes a terminal proof, preserving Retry-After across reload', async () => {
    const { session, api, disk } = setup();
    disk.values.set(PROOF_STORAGE_KEY, JSON.stringify({ ...storedProof(), failureCount: 1, retryAt: new Date(NOW + 45000).toISOString() }));
    await session.restore(); await settle(); expect(api.sendChunk).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(45000); expect(session.getSnapshot().state).toBe('submitted');
  });
  test('cannot resume a crashed incomplete engine, and cannot upload a foreign identity', async () => {
    for (const value of [{ ...storedProof(), chunks: [], nextSeq: 0, terminalRecorded: false, submissionState: 'recording' },
      { ...storedProof(), userId: 'c1111111-1111-4111-8111-111111111111' }]) {
      const { session, api, disk } = setup(); disk.values.set(PROOF_STORAGE_KEY, JSON.stringify(value));
      await session.restore(); await settle(); expect(session.getSnapshot().state).toBe('unranked');
      expect(api.sendChunk).not.toHaveBeenCalled();
    }
  });
  test('failed storage read cannot silently replace an unread pending record', async () => {
    const { session, api, disk } = setup(); disk.getItem = jest.fn(async () => { throw new Error('disk offline'); });
    expect(await session.prepareRun()).toBeNull(); expect(api.startRun).not.toHaveBeenCalled();
    expect(session.getSnapshot().needsPendingDecision).toBe(true); expect(session.begin(RUN)).toBe(false);
  });
  test.each([
    ['corrupt JSON', (): string => '{corrupt'],
    ['foreign ownership', (): string => JSON.stringify({ ...storedProof(), userId: 'c1111111-1111-4111-8111-111111111111' })],
    ['expired proof', (): string => JSON.stringify({ ...storedProof(), run: { ...RUN, expiresAt: new Date(NOW - 1).toISOString() } })],
    ['unsupported rules', (): string => JSON.stringify({ ...storedProof(), run: { ...RUN, rulesVersion: 'obsolete-rules' } })],
  ] as const)('%s stays blocked until explicit discard and cannot be overwritten by begin', async (_reason, makeRaw) => {
    const { session, api, disk } = setup(); const raw = makeRaw();
    disk.values.set(PROOF_STORAGE_KEY, raw);
    await session.restore(); await settle();
    expect(session.getSnapshot()).toMatchObject({ state: 'unranked', needsPendingDecision: true });
    expect(await session.prepareRun()).toBeNull(); expect(await session.prepareRun()).toBeNull();
    expect(session.begin(RUN)).toBe(false); expect(api.startRun).not.toHaveBeenCalled();
    expect(disk.values.get(PROOF_STORAGE_KEY)).toBe(raw);
    await session.discard();
    expect(session.getSnapshot().needsPendingDecision).toBe(false);
    expect(await session.prepareRun()).toEqual(RUN);
    expect(session.begin(RUN)).toBe(true); await settle();
    expect(JSON.parse(disk.values.get(PROOF_STORAGE_KEY)!).userId).toBe(USER);
    expect(JSON.parse(disk.values.get(PROOF_STORAGE_KEY)!).run.runId).toBe(RUN.runId);
  });
  test('an empty old coordinator discard cannot erase a new same-user run, but unreadable data can be explicitly discarded', async () => {
    const { session, disk } = setup(); await session.restore(); session.dispose();
    disk.values.set(PROOF_STORAGE_KEY, JSON.stringify(storedProof()));
    await session.discard(); expect(disk.values.has(PROOF_STORAGE_KEY)).toBe(true);
    const recovery = createRankedSession({ api: apiMock(), userId: USER, storage: disk }); sessions.push(recovery);
    disk.values.set(PROOF_STORAGE_KEY, '{corrupt'); await recovery.restore(); await settle();
    expect(disk.values.get(PROOF_STORAGE_KEY)).toBe('{corrupt');
    await recovery.discard(); expect(disk.values.has(PROOF_STORAGE_KEY)).toBe(false);
  });
  test('failed persistence prevents upload but does not call local preference storage', async () => {
    const { session, api, disk } = setup(); disk.setItem = jest.fn(async () => { throw new Error('quota'); });
    await session.restore(); session.begin(RUN); record(session, 3); await settle();
    expect(session.getSnapshot().state).toBe('unranked'); expect(api.sendChunk).not.toHaveBeenCalled();
  });
  test('late challenge after disposal cannot begin a ranked engine', async () => {
    const { session, api } = setup(); let challenge!: (run: RankedRun) => void;
    api.startRun.mockImplementation(() => new Promise((resolve) => { challenge = resolve; }));
    const preparing = session.prepareRun(); await settle(); session.dispose(); challenge(RUN);
    expect(await preparing).toBeNull(); expect(session.begin(RUN)).toBe(false);
  });
});
