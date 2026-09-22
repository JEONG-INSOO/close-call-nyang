import { createProofQueue, MAX_PROOF_BYTES, parsePendingProof, proofByteLength, PROOF_STORAGE_KEY } from '../proofQueue';
import type { PendingProof, ProofStorage } from '../proofQueue';
import { RULES_VERSION } from '../rulesVersion';

const USER = 'b1111111-1111-4111-8111-111111111111';
const OTHER = 'c1111111-1111-4111-8111-111111111111';
const NOW = Date.parse('2026-09-22T01:00:00.000Z');
function proof(): PendingProof {
  return { schemaVersion: 1, userId: USER, run: { runId: 'a1111111-1111-4111-8111-111111111111', engineRunId: 19,
    seed: 7, rulesVersion: RULES_VERSION, issuedAt: '2026-09-22T00:00:00.000Z', expiresAt: '2026-09-23T00:00:00.000Z' },
    chunks: [{ runId: 'a1111111-1111-4111-8111-111111111111', seq: 0, spans: [{ direction: 1, ticks: 80 }] }],
    nextSeq: 1, terminalRecorded: true, updatedAt: '2026-09-22T00:01:00.000Z', submissionState: 'pending',
    acknowledgedTicks: 0, failureCount: 0, retryAt: null };
}
function memoryStorage(): ProofStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return { values, getItem: jest.fn(async (key) => values.get(key) ?? null),
    setItem: jest.fn(async (key, value) => { values.set(key, value); }),
    removeItem: jest.fn(async (key) => { values.delete(key); }) };
}

describe('identity-scoped bounded proof persistence', () => {
  test('restores a terminal proof and ignores unknown data instead of carrying secrets forward', () => {
    const value = { ...proof(), access_token: 'not-a-real-token' };
    const loaded = parsePendingProof(JSON.stringify(value), USER, NOW);
    expect(loaded).toEqual({ kind: 'valid', proof: proof() });
    expect(JSON.stringify(loaded)).not.toContain('access_token');
  });
  test.each([
    ['foreign owner', (value: PendingProof) => { value.userId = OTHER; }],
    ['expired', (value: PendingProof) => { value.run.expiresAt = '2026-09-22T00:00:00.000Z'; }],
    ['different rules', (value: PendingProof) => { value.run.rulesVersion = 'old-rules'; }],
    ['sequence gap', (value: PendingProof) => { value.chunks[0].seq = 7; }],
    ['invalid direction', (value: PendingProof) => { value.chunks[0].spans[0].direction = 3 as 1; }],
    ['too many ticks', (value: PendingProof) => { value.chunks[0].spans[0].ticks = 1201; }],
    ['negative ticks', (value: PendingProof) => { value.chunks[0].spans[0].ticks = -1; }],
    ['noncanonical spans', (value: PendingProof) => { value.chunks[0].spans.push({ direction: 1, ticks: 2 }); }],
    ['missing final tick', (value: PendingProof) => { value.terminalRecorded = false; }],
    ['budget exhausted', (value: PendingProof) => { value.failureCount = 20; }],
  ] as const)('rejects %s without guessing a verified score', (_label, change) => {
    const value = proof(); change(value);
    expect(parsePendingProof(JSON.stringify(value), USER, NOW).kind).toBe('invalid');
  });
  test('rejects corrupt or oversized data and counts UTF-8 without a runtime encoder', () => {
    expect(parsePendingProof('{bad', USER, NOW).kind).toBe('invalid');
    expect(parsePendingProof(' '.repeat(MAX_PROOF_BYTES + 1), USER, NOW).kind).toBe('invalid');
    expect(proofByteLength('A냥😀')).toBe(8);
    expect(parsePendingProof(null, USER, NOW)).toEqual({ kind: 'empty' });
  });
  test('serializes saves and removals across independent coordinator instances', async () => {
    const storage = memoryStorage();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const original = storage.setItem;
    storage.setItem = jest.fn(async (key, value) => { await gate; await original(key, value); });
    const oldQueue = createProofQueue(storage);
    const newQueue = createProofQueue(storage);
    const oldSave = oldQueue.save(proof());
    const clearing = newQueue.clear(USER);
    release();
    await Promise.all([oldSave, clearing]);
    expect(storage.values.has(PROOF_STORAGE_KEY)).toBe(false);
  });
  test('old identity cleanup cannot erase new identity proof and never touches preferences', async () => {
    const storage = memoryStorage();
    storage.values.set('close-call-nyang.preferences.v1', 'local collection');
    const queue = createProofQueue(storage);
    await queue.save({ ...proof(), userId: OTHER });
    await queue.clear(USER);
    expect(parsePendingProof(storage.values.get(PROOF_STORAGE_KEY)!, OTHER, NOW).kind).toBe('valid');
    expect(storage.values.get('close-call-nyang.preferences.v1')).toBe('local collection');
  });
  test('takes immutable serialized snapshots and rejects capacity without truncation', async () => {
    const storage = memoryStorage(); const queue = createProofQueue(storage); const value = proof();
    const saving = queue.save(value); value.chunks[0].spans[0].ticks = 10;
    await saving;
    expect(JSON.parse(storage.values.get(PROOF_STORAGE_KEY)!).chunks[0].spans[0].ticks).toBe(80);
    await expect(queue.save({ ...proof(), updatedAt: 'x'.repeat(MAX_PROOF_BYTES) })).rejects.toThrow('PROOF_CAPACITY');
    expect(JSON.parse(storage.values.get(PROOF_STORAGE_KEY)!).chunks[0].spans[0].ticks).toBe(80);
  });
  test('cleanup of an older run cannot remove a newer run for the same identity', async () => {
    const storage = memoryStorage(); const queue = createProofQueue(storage);
    const oldRunId = proof().run.runId;
    const newer = proof(); newer.run.runId = 'd1111111-1111-4111-8111-111111111111'; newer.chunks[0].runId = newer.run.runId;
    await queue.save(newer);
    await queue.clear(USER, oldRunId);
    expect(JSON.parse(storage.values.get(PROOF_STORAGE_KEY)!).run.runId).toBe(newer.run.runId);
    await queue.clear(USER, newer.run.runId);
    expect(storage.values.has(PROOF_STORAGE_KEY)).toBe(false);
  });
  test('automatic cleanup without an owned run cannot erase data; corrupt data requires explicit discard', async () => {
    const storage = memoryStorage(); const queue = createProofQueue(storage);
    storage.values.set(PROOF_STORAGE_KEY, '{corrupt');
    await queue.clear(USER, null);
    await queue.clear(USER, proof().run.runId);
    expect(storage.values.get(PROOF_STORAGE_KEY)).toBe('{corrupt');
    await queue.clear(USER);
    expect(storage.values.has(PROOF_STORAGE_KEY)).toBe(false);
  });
});
