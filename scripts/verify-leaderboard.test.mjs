import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOptions, readTarget, loadKernel, generateProof, waitForProofTicks, runSmoke } from './verify-leaderboard.mjs';

const ref = 'abcdefghijklmnopqrst';
const other = 'zyxwvutsrqponmlkjihg';
const env = { RANKING_ENVIRONMENT: 'staging', RANKING_PROJECT_REF: ref, RANKING_OTHER_PROJECT_REF: other,
  EXPO_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture_only_123456789' };
const options = { environment: 'staging', projectRef: ref, allowTestWrites: true };
const target = readTarget(env, options);
const kernel = await loadKernel();
const challenge = { runId: 'c0000000-0000-4000-8000-000000000001', engineRunId: 701, seed: 42,
  rulesVersion: kernel.rulesVersion, issuedAt: '2026-09-22T00:00:00Z', expiresAt: '2026-09-23T00:00:00Z' };

test('CLI requires explicit environment, rejects unknown/duplicate options and defaults to no writes', () => {
  assert.throws(() => parseOptions([]), /ENVIRONMENT_REQUIRED/);
  assert.throws(() => parseOptions(['--environment', 'preview']), /ENVIRONMENT_REQUIRED/);
  assert.throws(() => parseOptions(['--environment', 'staging', '--password', 'do-not-echo']), /INVALID_OPTION/);
  assert.throws(() => parseOptions(['--environment', 'staging', '--environment', 'production']), /INVALID_OPTION/);
  assert.equal(parseOptions(['--environment', 'staging']).allowTestWrites, false);
});
test('missing configuration, same projects, mismatched environment/ref/URL and privileged keys fail closed', () => {
  assert.throws(() => readTarget({}, options), /DISTINCT_PROJECT_REFS_REQUIRED/);
  assert.throws(() => readTarget({ ...env, RANKING_OTHER_PROJECT_REF: ref }, options), /DISTINCT_PROJECT_REFS_REQUIRED/);
  assert.throws(() => readTarget({ ...env, RANKING_ENVIRONMENT: 'production' }, options), /ENVIRONMENT_MISMATCH/);
  assert.throws(() => readTarget(env, { ...options, projectRef: other }), /EXPLICIT_PROJECT_CONFIRMATION_REQUIRED/);
  for (const url of [`http://${ref}.supabase.co`, `https://${ref}.supabase.co/`, `https://${ref}.supabase.co.evil.invalid`]) {
    assert.throws(() => readTarget({ ...env, EXPO_PUBLIC_SUPABASE_URL: url }, options), /PROJECT_URL_MISMATCH/);
  }
  for (const key of ['sb_secret_never_public', 'eyJhbGciOiJIUzI1NiJ9.fake', '']) {
    assert.throws(() => readTarget({ ...env, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key }, options), /PUBLISHABLE_KEY_REQUIRED/);
  }
});
test('production target cannot inherit staging origin', () => {
  assert.equal(readTarget({ ...env, RANKING_ENVIRONMENT: 'production' }, { ...options, environment: 'production' }).origin, 'https://jeong-insoo.github.io');
});
test('proof uses canonical server-issued seed and includes the actual final falling tick', () => {
  const proof = generateProof(kernel, challenge);
  assert.equal(proof.ticks, 67); assert.equal(proof.score, 0);
  assert.deepEqual(proof.chunks, [{ runId: challenge.runId, seq: 0, spans: [{ direction: 1, ticks: 67 }] }]);
  assert.throws(() => generateProof(kernel, { ...challenge, seed: 0 }), /INVALID_CHALLENGE/);
  assert.throws(() => generateProof(kernel, { ...challenge, rulesVersion: 'old' }), /INVALID_CHALLENGE/);
});
test('different server seeds remain legal bounded chunks with no score/user fields', () => {
  for (const seed of [1, 2, 73, 4294967295]) {
    const proof = generateProof(kernel, { ...challenge, seed }, 0);
    assert.ok(proof.ticks > 0 && proof.ticks <= 3600);
    assert.equal(proof.chunks.reduce((sum, c) => sum + c.spans[0].ticks, 0), proof.ticks);
    proof.chunks.forEach((c, index) => { assert.equal(c.seq, index); assert.ok(c.spans[0].ticks <= 1200); assert.deepEqual(Object.keys(c), ['runId', 'seq', 'spans']); });
  }
});
test('pacing waits actual countdown+tick duration in short interruptible intervals', async () => {
  let time = 100; const delays = []; const notices = [];
  await waitForProofTicks(100, 1200, { monotonic: () => time, sleep: async delay => { delays.push(delay); time += delay; }, progress: m => notices.push(m) });
  assert.equal(time, 13200); assert.ok(delays.every(delay => delay > 0 && delay <= 250)); assert.ok(notices.length >= 10);
});
test('pacing handles user cancellation without waiting out a full replay', async () => {
  const abort = new AbortController(); let time = 0;
  await assert.rejects(waitForProofTicks(0, 1200, { monotonic: () => time, signal: abort.signal,
    sleep: async delay => { time += delay; abort.abort(); } }), /INTERRUPTED/);
  assert.equal(time, 250);
});

// Every response below is explicitly simulated. No network call or hosted evidence.
function fakeService({ failFinalize = false, failProfile = false, failCleanup = false, lostFirstDelete = false, badRetry = false, failedSignup = false,
  directRestFailure, directRpcFailure } = {}) {
  const users = []; const calls = []; let ticks = 0; let last = null; let terminal = false; let firstDeleteLost = false;
  const proof = generateProof(kernel, challenge);
  const fetchImpl = async (url, init) => {
    const parsed = new URL(url); const path = parsed.pathname; const body = init.body ? JSON.parse(init.body) : undefined;
    const token = init.headers.Authorization?.slice(7); const user = users.find(u => u.token === token);
    calls.push({ path, search: parsed.search, method: init.method, body, redirect: init.redirect,
      hasAuth: !!init.headers.Authorization, schema: init.headers['Content-Profile'], actor: user?.id ?? null });
    const reply = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Access-Control-Allow-Origin': target.origin } });
    const deny = (code, status) => reply({ code }, status);
    if (init.headers.Origin === 'https://untrusted.invalid') return deny('FORBIDDEN', 403);
    if (path === '/auth/v1/signup') {
      if (failedSignup) throw new Error('secret-response-never-log');
      const n = users.length + 1;
      const account = { id: `a0000000-0000-4000-8000-00000000000${n}`, publicId: `b0000000-0000-4000-8000-00000000000${n}`,
        token: `fixture-access-token-private-${n}`, deleted: false }; users.push(account);
      return reply({ user: { id: account.id, is_anonymous: true }, access_token: account.token });
    }
    if (path === '/auth/v1/user') return user?.deleted ? deny('user_not_found', 401) : reply({ id: user?.id });
    if (path === '/rest/v1/best_scores') return directRestFailure
      ? deny(directRestFailure.code, directRestFailure.status) : deny('PGRST106', 406);
    if (path.startsWith('/rest/v1/rpc/')) return directRpcFailure
      ? deny(directRpcFailure.code, directRpcFailure.status) : deny('42501', user ? 403 : 401);
    if (path.endsWith('/leaderboard')) return reply({ entries: [], me: user?.nickname && terminal && !user.deleted
      ? { publicId: user.publicId, nickname: user.nickname, score: proof.score, rank: 1 } : null, rulesVersion: kernel.rulesVersion });
    if (!user) return deny('UNAUTHORIZED', 401);
    if (path.endsWith('/profile') && init.method === 'DELETE') {
      if (failCleanup) return deny('UNAVAILABLE', 503);
      user.deleted = true;
      if (lostFirstDelete && !firstDeleteLost) { firstDeleteLost = true; throw new Error('response lost'); }
      return reply({ deleted: true });
    }
    if (user.deleted) return deny('UNAUTHORIZED', 401);
    if (path.endsWith('/profile')) {
      if (failProfile) return deny('UNAVAILABLE', 503);
      if (Object.keys(body).length !== 1) return deny('INVALID_INPUT', 400);
      user.nickname = body.nickname; return reply({ publicId: user.publicId, nickname: user.nickname });
    }
    if (path.endsWith('/runs')) {
      if (Object.keys(body).length !== 1) return deny('INVALID_INPUT', 400);
      if (body.rulesVersion !== kernel.rulesVersion) return deny('RULES_MISMATCH', 409);
      return reply(challenge);
    }
    if (path.endsWith('/runs/chunks')) {
      if (user !== users[0]) return deny('FORBIDDEN', 403);
      if (last && body.seq === last.seq) {
        if (JSON.stringify(last) !== JSON.stringify(body)) return deny('OUT_OF_ORDER', 409);
        return reply({ acceptedSeq: body.seq, totalTicks: badRetry ? ticks + 1 : ticks, terminal, expiresAt: challenge.expiresAt });
      }
      if (terminal) return deny('PROOF_REJECTED', 422);
      ticks += body.spans.reduce((sum, s) => sum + s.ticks, 0); last = body; terminal = ticks === proof.ticks;
      return reply({ acceptedSeq: body.seq, totalTicks: ticks, terminal, expiresAt: challenge.expiresAt });
    }
    if (path.endsWith('/runs/finalize')) return failFinalize ? reply({ message: 'secret-response-never-log' }, 500)
      : reply({ runId: challenge.runId, score: proof.score, bestScore: proof.score, improved: true, rank: 1 });
    if (path.endsWith('/reports')) return reply({ reported: true });
    throw new Error('unexpected test route');
  };
  return { fetchImpl, calls, users };
}
async function simulate(settings = {}) {
  const service = fakeService(settings); let time = 0;
  const report = await runSmoke(target, { allowTestWrites: true, fetchImpl: service.fetchImpl, kernel,
    monotonic: () => time, sleep: async delay => { time += delay; }, now: () => '2026-09-22T00:00:00Z' });
  return { ...service, report, time };
}
test('no explicit write permission causes zero requests and cannot report success', async () => {
  let requests = 0;
  const report = await runSmoke(target, { fetchImpl: async () => { requests += 1; } });
  assert.equal(requests, 0); assert.equal(report.smokePassed, false); assert.equal(report.taskComplete, false);
});
test('simulated complete smoke has real local replay pacing, scoped cleanup and unverified manual cases', async () => {
  const { report, users, calls, time } = await simulate();
  assert.equal(report.smokePassed, true); assert.equal(report.taskComplete, false); assert.equal(report.evidenceSource, 'simulated');
  assert.ok(report.checks.filter(c => c.status === 'not_run').length >= 8);
  assert.equal(users.length, 2); assert.ok(users.every(u => u.deleted)); assert.ok(time >= 3000 + 67 / 120 * 1000);
  assert.ok(calls.every(c => c.redirect === 'error')); assert.ok(calls.every(c => !c.path.includes('/admin/')));
  assert.ok(!JSON.stringify(report).includes('fixture-access-token'));
  assert.ok(!JSON.stringify(report).includes(target.key));
});
test('direct REST score denial probes target only existing A scores with anonymous or B identity', async () => {
  const { report, users, calls } = await simulate();
  const direct = calls.filter(call => call.path === '/rest/v1/best_scores');
  assert.equal(direct.length, 4);
  assert.deepEqual(direct.map(call => [call.method, call.actor]), [
    ['POST', null], ['PATCH', null], ['POST', users[1].id], ['PATCH', users[1].id],
  ]);
  assert.ok(direct.every(call => call.schema === 'private'));
  const score = generateProof(kernel, challenge).score;
  for (const call of direct) {
    if (call.method === 'POST') assert.deepEqual(call.body, {
      user_id: users[0].id, rules_version: kernel.rulesVersion, score, source_run_id: challenge.runId,
    });
    else {
      assert.deepEqual(call.body, { score });
      assert.equal(call.search, `?user_id=eq.${users[0].id}&rules_version=eq.${kernel.rulesVersion}`);
    }
  }
  const evidence = report.checks.find(check => check.id === 'PRIVATE_SCHEMA_NOT_EXPOSED');
  assert.equal(evidence.status, 'passed');
  assert.match(evidence.evidence, /not exposed.*Catalog\/RLS verification remains separate/);
  assert.equal(report.checks.find(check => check.id === 'DB_CATALOG_RLS_GRANTS').status, 'not_run');
  assert.ok(calls.indexOf(direct[0]) > calls.findIndex(call => call.path.endsWith('/runs/finalize')));
  assert.ok(!JSON.stringify(report).includes(users[0].id));
});
test('service-only RPC probes use exact real signatures and no targets outside these temporary guests', async () => {
  const { report, users, calls } = await simulate();
  const direct = calls.filter(call => call.path.startsWith('/rest/v1/rpc/'));
  assert.equal(direct.length, 6);
  const signatures = {
    rank_get_profile: { p_user_id: users[0].id },
    rank_upsert_profile: { p_user_id: users[0].id, p_nickname: '검사냥대리' },
    rank_finalize_run: { p_user_id: users[0].id, p_run_id: challenge.runId },
  };
  direct.forEach((call, index) => {
    assert.equal(call.schema, 'public'); assert.equal(call.method, 'POST');
    assert.equal(call.actor, index < 3 ? null : users[1].id);
    assert.deepEqual(call.body, signatures[call.path.split('/').at(-1)]);
  });
  assert.equal(report.checks.find(check => check.id === 'SERVICE_ONLY_RPC_DENIALS').status, 'passed');
});
test('private schema probes never count 404, generic denial or accepted writes as schema non-exposure', async () => {
  for (const directRestFailure of [
    { status: 404, code: 'PGRST205' }, { status: 403, code: '42501' },
    { status: 406, code: 'PGRST116' }, { status: 201, code: 'unexpected' },
  ]) {
    const { report, users } = await simulate({ directRestFailure });
    assert.equal(report.smokePassed, false); assert.ok(users.every(user => user.deleted));
    assert.equal(report.checks.find(check => check.id === 'PRIVATE_SCHEMA_NOT_EXPOSED').status, 'failed');
  }
});
test('RPC probes never mistake missing signatures, invalid JWTs or successful calls for denied permission', async () => {
  for (const directRpcFailure of [
    { status: 404, code: 'PGRST202' }, { status: 401, code: 'PGRST301' },
    { status: 403, code: 'FORBIDDEN' }, { status: 200, code: 'unexpected' },
  ]) {
    const { report, users } = await simulate({ directRpcFailure });
    assert.equal(report.smokePassed, false); assert.ok(users.every(user => user.deleted));
    assert.equal(report.checks.find(check => check.id === 'SERVICE_ONLY_RPC_DENIALS').status, 'failed');
  }
});
test('profile failure still cleans up the exact newly created Auth-only guest', async () => {
  const { report, users } = await simulate({ failProfile: true });
  assert.equal(report.smokePassed, false); assert.equal(users.length, 1); assert.equal(users[0].deleted, true);
  assert.ok(report.checks.some(c => c.id === 'CLEANUP_A' && c.status === 'passed'));
});
test('failure after two signups cleans up both and never leaks response bodies', async () => {
  const { report, users } = await simulate({ failFinalize: true });
  assert.equal(report.smokePassed, false); assert.ok(users.every(u => u.deleted));
  assert.ok(!JSON.stringify(report).includes('secret-response-never-log'));
});
test('unconfirmed signup remains uncertain and never enumerates users to clean them up', async () => {
  const { report, calls } = await simulate({ failedSignup: true });
  assert.equal(report.signupResponseUncertain, true); assert.equal(report.smokePassed, false);
  assert.ok(calls.every(c => c.method !== 'DELETE' || !c.hasAuth)); assert.ok(calls.every(c => !c.path.includes('/admin/')));
});
test('cleanup failures retain only exact created IDs for operator followup, not credentials', async () => {
  const { report } = await simulate({ failCleanup: true });
  assert.equal(report.smokePassed, false); assert.equal(report.cleanupRequired.length, 2);
  assert.deepEqual(Object.keys(report.cleanupRequired[0]), ['label', 'userId', 'publicId']);
  assert.ok(!JSON.stringify(report).includes('fixture-access-token'));
});
test('a lost DELETE response retries with the same identity and settles', async () => {
  const { report, calls } = await simulate({ lostFirstDelete: true });
  assert.equal(report.smokePassed, true); assert.equal(report.cleanupRequired.length, 0);
  assert.equal(calls.filter(c => c.method === 'DELETE').length, 6); // includes the unauthenticated negative probe
});
test('changed acknowledgment on retry fails the smoke and still cleans up', async () => {
  const { report, users } = await simulate({ badRetry: true });
  assert.equal(report.smokePassed, false); assert.ok(users.every(u => u.deleted));
  assert.ok(report.checks.some(c => c.evidence === 'RETRY_ACK_CHANGED'));
});
