import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createHandler } from '../../leaderboard-api/handler.ts';
import { ApiFailure } from '../api-error.ts';
import type { AuthService } from '../auth.ts';
import { createInitialState, transition } from '../game/engine.ts';
import { BALANCE } from '../game/balance.ts';
import { RULES_VERSION } from '../game/rulesVersion.ts';
import type { RankingRepository, RunCheckpoint } from '../repository.ts';
import { digestSpans, MAX_BODY_BYTES } from '../validation.ts';

const USER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const PUBLIC = '33333333-3333-4333-8333-333333333333';
const RUN = '44444444-4444-4444-8444-444444444444';
const ORIGIN = 'https://jeong-insoo.github.io';
const NOW = '2026-09-22T00:00:00Z';
const EXPIRES = '2026-09-23T00:00:00Z';
const FLAGS = { mockAdsEnabled: false };
const nickname = { publicId: PUBLIC, nickname: '냥대리', updatedAt: NOW };
const entry = { publicId: PUBLIC, nickname: '냥대리', score: 123, rank: 1, achievedAt: NOW, isMe: true };

function initialCheckpoint(): RunCheckpoint {
  let state = transition(createInitialState(), { type: 'START', runId: 123, seed: 456 }, FLAGS).state;
  for (let index = 0; index < 360; index++) state = transition(state, {
    type: 'TICK', dt: BALANCE.fixedDt, input: { left: false, right: false },
  }, FLAGS).state;
  return {
    runId: RUN, engineRunId: 123, seed: 456, rulesVersion: RULES_VERSION, issuedAt: NOW,
    expiresAt: EXPIRES, userId: USER, state, acceptedSeq: -1, lastDigest: null,
    totalTicks: 0, status: 'active', receipt: null,
  };
}

function harness(options: { repository?: Partial<RankingRepository>; auth?: Partial<AuthService>; checkpoint?: RunCheckpoint } = {}) {
  const calls: { method: string; args: unknown[] }[] = [];
  const checkpoint = options.checkpoint ?? initialCheckpoint();
  const record = (method: string, ...args: unknown[]) => calls.push({ method, args });
  const repository: RankingRepository = {
    async upsertProfile(...args) { record('upsertProfile', ...args); return { ...nickname, nickname: args[1] }; },
    async getProfile(...args) { record('getProfile', ...args); return nickname; },
    async getBoard(...args) { record('getBoard', ...args); return { entries: [{ ...entry, isMe: args[0] === USER }], me: args[0] === USER ? entry : null, rulesVersion: RULES_VERSION, fetchedAt: NOW }; },
    async startRun(...args) {
      record('startRun', ...args);
      return { ...checkpoint, state: args[2], seed: args[3], engineRunId: args[4] };
    },
    async getRun(...args) { record('getRun', ...args); return checkpoint; },
    async commitChunk(...args) {
      record('commitChunk', ...args);
      return { acceptedSeq: args[2], totalTicks: checkpoint.totalTicks + args[5], terminal: args[6], expiresAt: EXPIRES };
    },
    async finalizeRun(...args) { record('finalizeRun', ...args); return { runId: RUN, score: 123, bestScore: 123, rank: 1, improved: true }; },
    async getDeletionStatus(...args) { record('getDeletionStatus', ...args); return null; },
    async deletePlayerData(...args) { record('deletePlayerData', ...args); return { status: 'pending_auth_delete' }; },
    async completeDeletion(...args) { record('completeDeletion', ...args); },
    async report(...args) { record('report', ...args); },
    async limit(...args) { record('limit', ...args); return { allowed: true, retryAfterSeconds: 0 }; },
    ...options.repository,
  };
  const auth: AuthService = {
    async authenticate(token) { record('authenticate', token); if (token !== 'valid') throw new ApiFailure('UNAUTHORIZED'); return USER; },
    async verifyDeletionToken(...args) { record('verifyDeletionToken', ...args); return USER; },
    async deleteUser(...args) { record('deleteUser', ...args); },
    ...options.auth,
  };
  const handler = createHandler({
    admin: {} as SupabaseClient, allowedOrigins: [ORIGIN], rulesVersion: RULES_VERSION,
    rateLimitSalt: 'unit-test-only-salt-never-a-deployed-secret', repository, auth,
  });
  const request = (path: string, method = 'GET', body?: unknown, token: string | null = 'valid', headers: Record<string, string> = {}) => {
    const values: Record<string, string> = { ...headers };
    if (token !== null) values.authorization = `Bearer ${token}`;
    if (body !== undefined) values['content-type'] = 'application/json';
    return handler(new Request(`https://project.supabase.co/functions/v1/leaderboard-api${path}`, {
      method, headers: values, body: body === undefined ? undefined : JSON.stringify(body),
    }));
  };
  return { handler, request, calls, checkpoint };
}

Deno.test('anonymous leaderboard read never creates an identity and caches privately', async () => {
  const h = harness();
  const response = await h.request(`/leaderboard?rulesVersion=${RULES_VERSION}`, 'GET', undefined, null);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, max-age=30');
  assert.match(response.headers.get('vary')!, /Authorization/);
  const body = await response.json();
  assert.equal(body.me, null);
  assert.equal(body.entries[0].isMe, false);
  assert.equal(h.calls.some(call => call.method === 'authenticate'), false);
  assert.deepEqual(h.calls.find(call => call.method === 'getBoard')!.args, [null, RULES_VERSION]);
});

Deno.test('authenticated board caps public rows at 30 and preserves my position outside the list', async () => {
  const h = harness({ repository: { async getBoard() {
    const entries = Array.from({ length: 31 }, (_, index) => ({ ...entry, publicId: index === 1 ? OTHER : `00000000-0000-4000-8000-${(index + 1).toString(16).padStart(12, '0')}`, rank: index < 2 ? 1 : index + 1, isMe: false }));
    return { entries,
      me: { ...entry, rank: 31, score: 2 }, rulesVersion: RULES_VERSION, fetchedAt: NOW,
      userId: USER, lastDigest: 'private' } as Awaited<ReturnType<RankingRepository['getBoard']>>;
  } } });
  const response = await h.request(`/leaderboard?rulesVersion=${RULES_VERSION}`);
  const body = await response.json();
  assert.equal(body.entries.length, 30);
  assert.deepEqual(body.entries.slice(0, 2).map((value: { rank: number }) => value.rank), [1, 1]);
  assert.equal(body.me.rank, 31);
  assert.equal('userId' in body, false);
  assert.equal('lastDigest' in body, false);
  assert.deepEqual(Object.keys(body.entries[0]).sort(), ['publicId', 'nickname', 'score', 'rank', 'achievedAt', 'isMe'].sort());
});

Deno.test('invalid optional bearer fails instead of becoming an anonymous or cached personalized request', async () => {
  const h = harness();
  const response = await h.request(`/leaderboard?rulesVersion=${RULES_VERSION}`, 'GET', undefined, 'invalid');
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(h.calls.some(call => call.method === 'getBoard'), false);
});

Deno.test('CORS permits exact deployed origin and no-Origin native calls but rejects other origins', async () => {
  const h = harness();
  const good = await h.request('/profile', 'GET', undefined, 'valid', { origin: ORIGIN });
  assert.equal(good.status, 200);
  assert.equal(good.headers.get('access-control-allow-origin'), ORIGIN);
  for (const origin of ['null', 'https://evil.example', `${ORIGIN}/close-call-nyang`, 'http://localhost:8081']) {
    const response = await h.request('/profile', 'GET', undefined, 'valid', { origin });
    assert.equal(response.status, 403);
    assert.equal(response.headers.has('access-control-allow-origin'), false);
  }
  assert.equal((await h.request('/profile')).status, 200);
  assert.equal((await h.request('/profile', 'OPTIONS', undefined, null, { origin: ORIGIN })).status, 204);
});

Deno.test('every write and private read requires verified authentication', async () => {
  const h = harness();
  for (const [method, path] of [['GET', '/profile'], ['POST', '/profile'], ['DELETE', '/profile'], ['POST', '/runs'], ['POST', '/runs/chunks'], ['POST', '/runs/finalize'], ['POST', '/reports']]) {
    assert.equal((await h.request(path, method, undefined, null)).status, 401);
  }
});

Deno.test('nickname normalization supports duplicates; public name changes never change ownership', async () => {
  const h = harness();
  for (let count = 0; count < 2; count++) {
    const response = await h.request('/profile', 'POST', { nickname: '  냥   대리  ' });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ...nickname, nickname: '냥 대리' });
  }
  assert.deepEqual(h.calls.filter(call => call.method === 'upsertProfile').map(call => call.args), [[USER, '냥 대리'], [USER, '냥 대리']]);
});

Deno.test('shape, nickname moderation and arbitrary score/ownership fields are rejected', async () => {
  const h = harness();
  for (const nickname of ['냥', '이메일@test.com', 'f u c k', '냥\n대리', 'https://evil']) {
    assert.equal((await h.request('/profile', 'POST', { nickname })).status, 422);
  }
  assert.equal((await h.request('/profile', 'POST', { nickname: '냥대리', user_id: OTHER })).status, 400);
  assert.equal((await h.request('/runs', 'POST', { rulesVersion: RULES_VERSION, seed: 1 })).status, 400);
  assert.equal((await h.request('/runs/finalize', 'POST', { runId: RUN, score: 99999 })).status, 400);
  assert.equal((await h.request('/profile?user_id=other')).status, 400);
  assert.equal((await h.request('/profile', 'DELETE', { user_id: OTHER })).status, 400);
});

Deno.test('run challenges are server-seeded and finish countdown before checkpoint verification', async () => {
  const h = harness();
  const response = await h.request('/runs', 'POST', { rulesVersion: RULES_VERSION });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(Object.keys(body).sort(), ['runId', 'engineRunId', 'seed', 'rulesVersion', 'issuedAt', 'expiresAt'].sort());
  assert.ok(Number.isInteger(body.seed) && body.seed > 0 && body.seed <= 0xffffffff);
  assert.ok(Number.isInteger(body.engineRunId) && body.engineRunId > 0 && body.engineRunId <= 0x7fffffff);
  const args = h.calls.find(call => call.method === 'startRun')!.args;
  assert.equal(args[0], USER);
  const state = args[2] as RunCheckpoint['state'];
  assert.equal(state.screen, 'playing');
  assert.equal(state.run!.elapsedSeconds, 0);
  assert.equal(state.run!.distanceM, 0);
  assert.equal(state.run!.seed, body.seed);
  assert.equal(state.run!.protectionSeconds, 0);
});

Deno.test('unsupported rules are rejected before start or replay', async () => {
  const different = 'nyang-v1-0000000000000000';
  const h = harness();
  assert.equal((await h.request('/runs', 'POST', { rulesVersion: different })).status, 409);
  assert.equal((await h.request(`/leaderboard?rulesVersion=${different}`)).status, 409);
  h.checkpoint.rulesVersion = different;
  assert.equal((await h.request('/runs/chunks', 'POST', { runId: RUN, seq: 0, spans: [{ direction: 0, ticks: 1 }] })).status, 409);
  assert.equal(h.calls.some(call => call.method === 'commitChunk'), false);
});

Deno.test('chunk replay commits only the server-generated state under the verified caller', async () => {
  const h = harness();
  const response = await h.request('/runs/chunks', 'POST', { runId: RUN, seq: 0, spans: [{ direction: 0, ticks: 2 }, { direction: 0, ticks: 3 }] });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.totalTicks, 5);
  const args = h.calls.find(call => call.method === 'commitChunk')!.args;
  assert.deepEqual(args.slice(0, 3), [USER, RUN, 0]);
  assert.equal(args[3], await digestSpans([{ direction: 0, ticks: 5 }]));
  assert.equal((args[4] as RunCheckpoint['state']).run!.stepIndex, 5);
  assert.equal(args[5], 5);
});

Deno.test('wrong ownership, out-of-order chunks and modified duplicate proofs never commit', async () => {
  const h = harness();
  h.checkpoint.userId = OTHER;
  const chunk = { runId: RUN, seq: 0, spans: [{ direction: 0, ticks: 1 }] };
  assert.equal((await h.request('/runs/chunks', 'POST', chunk)).status, 403);
  h.checkpoint.userId = USER;
  const response = await h.request('/runs/chunks', 'POST', { ...chunk, seq: 2 });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).expectedSeq, 0);
  h.checkpoint.acceptedSeq = 0;
  h.checkpoint.lastDigest = 'different-proof';
  assert.equal((await h.request('/runs/chunks', 'POST', chunk)).status, 409);
  assert.equal(h.calls.some(call => call.method === 'commitChunk'), false);
});

Deno.test('canonical latest duplicate asks the atomic repository for its original ack with no ticks added', async () => {
  const h = harness();
  h.checkpoint.acceptedSeq = 0;
  h.checkpoint.totalTicks = 3;
  h.checkpoint.lastDigest = await digestSpans([{ direction: 0, ticks: 3 }]);
  const response = await h.request('/runs/chunks', 'POST', { runId: RUN, seq: 0, spans: [{ direction: 0, ticks: 1 }, { direction: 0, ticks: 2 }] });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).totalTicks, 3);
  assert.equal(h.calls.find(call => call.method === 'commitChunk')!.args[5], 0);
});

Deno.test('bounded proof payloads reject oversized sequences, illegal controls and client revive data', async () => {
  const h = harness();
  for (const spans of [[{ direction: 0, ticks: 1201 }], [{ direction: 2, ticks: 1 }], [{ direction: 0, ticks: 0 }], [{ direction: 0, ticks: 1, revive: true }], []]) {
    assert.equal((await h.request('/runs/chunks', 'POST', { runId: RUN, seq: 0, spans })).status, 400);
  }
  h.checkpoint.state.run!.reviveUsed = true;
  assert.equal((await h.request('/runs/chunks', 'POST', { runId: RUN, seq: 0, spans: [{ direction: 0, ticks: 1 }] })).status, 422);
});

Deno.test('terminal proof only permits failure on the final submitted tick', async () => {
  const h = harness();
  h.checkpoint.state.run!.angleRad = BALANCE.criticalAngleRad - 0.0001;
  h.checkpoint.state.run!.angularVelocity = 4;
  const response = await h.request('/runs/chunks', 'POST', { runId: RUN, seq: 0, spans: [{ direction: 0, ticks: 1 }] });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).terminal, true);
  assert.equal((await h.request('/runs/chunks', 'POST', { runId: RUN, seq: 0, spans: [{ direction: 0, ticks: 2 }] })).status, 422);
});

Deno.test('finalize delegates ownership and idempotent maximum update to one repository transaction', async () => {
  const h = harness();
  const first = await h.request('/runs/finalize', 'POST', { runId: RUN });
  const second = await h.request('/runs/finalize', 'POST', { runId: RUN });
  assert.deepEqual(await first.json(), await second.json());
  assert.deepEqual(h.calls.filter(call => call.method === 'finalizeRun').map(call => call.args), [[USER, RUN], [USER, RUN]]);
  const unfinished = harness({ repository: { async finalizeRun() { throw new ApiFailure('NOT_FINISHED'); } } });
  assert.equal((await unfinished.request('/runs/finalize', 'POST', { runId: RUN })).status, 409);
});

Deno.test('atomic repository expiry, wall-clock rejection and CAS race errors remain safe API failures', async () => {
  for (const [code, status] of [['EXPIRED', 410], ['PROOF_REJECTED', 422], ['OUT_OF_ORDER', 409]] as const) {
    const h = harness({ repository: { async commitChunk() { throw new ApiFailure(code, code === 'OUT_OF_ORDER' ? { expectedSeq: 1 } : {}); } } });
    const response = await h.request('/runs/chunks', 'POST', { runId: RUN, seq: 0, spans: [{ direction: 0, ticks: 1 }] });
    assert.equal(response.status, status);
    assert.equal((await response.json()).code, code);
  }
});

Deno.test('report only targets the opaque public ID and cannot impersonate another reporter', async () => {
  const h = harness();
  assert.equal((await h.request('/reports', 'POST', { targetPublicId: PUBLIC, reason: 'inappropriate' })).status, 200);
  assert.deepEqual(h.calls.find(call => call.method === 'report')!.args, [USER, PUBLIC, 'inappropriate']);
  assert.equal((await h.request('/reports', 'POST', { targetPublicId: PUBLIC, reason: 'other', reporter_user_id: OTHER })).status, 400);
});

Deno.test('profile removal precedes Auth removal and completes its receipt last', async () => {
  const h = harness();
  assert.equal((await h.request('/profile', 'DELETE')).status, 200);
  const names = h.calls.map(call => call.method);
  assert.ok(names.indexOf('deletePlayerData') < names.indexOf('deleteUser'));
  assert.ok(names.indexOf('deleteUser') < names.indexOf('completeDeletion'));
  assert.deepEqual(h.calls.find(call => call.method === 'deleteUser')!.args, [USER]);
});

Deno.test('gateway-style empty DELETE streams permit deletion only after verified authentication', async () => {
  for (const length of [undefined, '0']) {
    const h = harness();
    const headers: Record<string, string> = { authorization: 'Bearer valid' };
    if (length !== undefined) headers['content-length'] = length;
    const stream = new ReadableStream<Uint8Array>({ start(controller) {
      controller.enqueue(new Uint8Array(0));
      controller.close();
    } });
    const request = new Request('https://project.supabase.co/functions/v1/leaderboard-api/profile', {
      method: 'DELETE', headers, body: stream,
    });
    assert.notEqual(request.body, null);
    const response = await h.handler(request);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { deleted: true });
    const names = h.calls.map(call => call.method);
    assert.ok(names.indexOf('authenticate') < names.indexOf('deletePlayerData'));
    assert.ok(names.indexOf('deletePlayerData') < names.indexOf('deleteUser'));
    assert.ok(names.indexOf('deleteUser') < names.indexOf('completeDeletion'));
    assert.equal(request.body!.locked, false);
  }
});

Deno.test('an empty DELETE stream without authentication still returns UNAUTHORIZED', async () => {
  const h = harness();
  const response = await h.handler(new Request('https://project.supabase.co/functions/v1/leaderboard-api/profile', {
    method: 'DELETE', body: new ReadableStream<Uint8Array>({ start(controller) { controller.close(); } }),
  }));
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, 'UNAUTHORIZED');
  assert.equal(h.calls.length, 0);
});

Deno.test('DELETE rejects and cancels the first received byte even with Content-Length zero', async () => {
  for (const size of [1, MAX_BODY_BYTES + 1]) {
    const h = harness();
    let pulls = 0;
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) { pulls += 1; controller.enqueue(new Uint8Array(size)); },
      cancel() { cancelled = true; },
    }, { highWaterMark: 0 });
    const request = new Request('https://project.supabase.co/functions/v1/leaderboard-api/profile', {
      method: 'DELETE', headers: { authorization: 'Bearer valid', 'content-length': '0' }, body: stream,
    });
    const response = await h.handler(request);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, 'INVALID_INPUT');
    assert.equal(pulls, 1);
    assert.equal(cancelled, true);
    assert.equal(request.body!.locked, false);
    assert.equal(h.calls.length, 0);
  }
});

Deno.test('DELETE bounds zero-byte chunks and tolerates a failed cancellation callback', async () => {
  const h = harness();
  let pulls = 0;
  let cancelled = false;
  const request = new Request('https://project.supabase.co/functions/v1/leaderboard-api/profile', {
    method: 'DELETE', headers: { authorization: 'Bearer valid' },
    body: new ReadableStream<Uint8Array>({
      pull(controller) { pulls += 1; controller.enqueue(new Uint8Array(0)); },
      cancel() { cancelled = true; throw new Error('private-stream-diagnostic'); },
    }, { highWaterMark: 0 }),
  });
  const response = await h.handler(request);
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, 'INVALID_INPUT');
  assert.equal(pulls, 16);
  assert.equal(cancelled, true);
  assert.equal(request.body!.locked, false);
  assert.equal(h.calls.length, 0);
});

Deno.test('DELETE stream read failures stay INVALID_INPUT and never start deletion', async () => {
  const h = harness();
  const request = new Request('https://project.supabase.co/functions/v1/leaderboard-api/profile', {
    method: 'DELETE', headers: { authorization: 'Bearer valid' },
    body: new ReadableStream<Uint8Array>({ pull(controller) { controller.error(new Error('private-stream-diagnostic')); } }),
  });
  const response = await h.handler(request);
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, 'INVALID_INPUT');
  assert.equal(request.body!.locked, false);
  assert.equal(h.calls.length, 0);
});

Deno.test('failed Auth deletion returns transient failure and leaves the receipt pending for retry', async () => {
  const h = harness({ auth: { async deleteUser() { throw new Error('secret-provider-diagnostic'); } } });
  const response = await h.request('/profile', 'DELETE');
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes('secret-provider-diagnostic'), false);
  assert.equal(h.calls.some(call => call.method === 'completeDeletion'), false);
});

Deno.test('signed deletion fallback requires an existing tombstone and is forbidden for every other route', async () => {
  const h = harness();
  assert.equal((await h.request('/profile', 'DELETE', undefined, 'deleted-token')).status, 401);
  assert.equal(h.calls.some(call => call.method === 'deletePlayerData'), false);
  assert.equal((await h.request('/profile', 'GET', undefined, 'deleted-token')).status, 401);
  const pending = harness({ repository: { async getDeletionStatus() { return { status: 'pending_auth_delete' }; } } });
  assert.equal((await pending.request('/profile', 'DELETE', undefined, 'deleted-token')).status, 200);
  assert.equal(pending.calls.some(call => call.method === 'completeDeletion'), true);
  const completed = harness({ repository: {
    async getDeletionStatus() { return { status: 'complete' }; },
    async deletePlayerData() { return { status: 'complete' }; },
  } });
  assert.equal((await completed.request('/profile', 'DELETE', undefined, 'deleted-token')).status, 200);
  assert.equal(completed.calls.some(call => call.method === 'deleteUser'), false);
});

Deno.test('Auth outages never enter deletion signature fallback', async () => {
  const h = harness({ auth: { async authenticate() { throw new ApiFailure('UNAVAILABLE'); } } });
  assert.equal((await h.request('/profile', 'DELETE')).status, 503);
  assert.equal(h.calls.some(call => call.method === 'verifyDeletionToken'), false);
});

Deno.test('rate limits return Retry-After and never place raw guest IPs in repository buckets', async () => {
  const h = harness();
  await h.request(`/leaderboard?rulesVersion=${RULES_VERSION}`, 'GET', undefined, null, { 'x-forwarded-for': 'forged, 203.0.113.9' });
  const bucket = h.calls.find(call => call.method === 'limit')!.args[0] as string;
  assert.match(bucket, /^read:guest:[a-f0-9]{64}$/);
  assert.equal(bucket.includes('203.0.113.9'), false);
  const limited = harness({ repository: { async limit() { return { allowed: false, retryAfterSeconds: 12 }; } } });
  const response = await limited.request('/profile');
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '12');
  assert.equal(limited.calls.some(call => call.method === 'getProfile'), false);
});

Deno.test('streamed payload cap is enforced without or despite a dishonest Content-Length', async () => {
  for (const length of [undefined, '3', '999999']) {
    const h = harness();
    const headers: Record<string, string> = { authorization: 'Bearer valid', 'content-type': 'application/json' };
    if (length !== undefined) headers['content-length'] = length;
    const response = await h.handler(new Request('https://project.supabase.co/functions/v1/leaderboard-api/profile', {
      method: 'POST', headers, body: JSON.stringify({ nickname: 'x'.repeat(65536) }),
    }));
    assert.equal(response.status, 400);
    assert.equal(h.calls.some(call => call.method === 'upsertProfile'), false);
  }
});

Deno.test('unknown internal exceptions are masked rather than leaking a token, SQL or stack', async () => {
  const h = harness({ repository: { async getProfile() { throw new Error('secret-token private.sql stack'); } } });
  const response = await h.request('/profile');
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.code, 'UNAVAILABLE');
  assert.equal(JSON.stringify(body).includes('secret'), false);
  assert.equal('stack' in body, false);
});
