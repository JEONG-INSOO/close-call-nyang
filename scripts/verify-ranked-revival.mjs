import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { loadKernel, generateProof } from './verify-leaderboard.mjs';

if (!process.argv.includes('--allow-test-writes')) throw new Error('Explicit --allow-test-writes required');
const env = Object.fromEntries((await readFile('.env.ranking.production', 'utf8')).split(/\r?\n/)
  .map(line => line.match(/^([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^['"]|['"]$/g, '')]));
const base = env.EXPO_PUBLIC_SUPABASE_URL;
if (base !== 'https://fgojrxmpxpzdiwsktjsx.supabase.co') throw new Error('Wrong production target');
const kernel = await loadKernel();
let token, userId, signupResponseUncertain = false;
const report = { environment: 'production', rulesVersion: kernel.rulesVersion, checks: [], cleanupPassed: false, cleanupRequired: [], signupResponseUncertain: false, passed: false };
async function request(path, method = 'GET', body, auth = true) {
  const response = await fetch(base + path, { method, signal: AbortSignal.timeout(15000),
    headers: { apikey: env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json',
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body) });
  const value = await response.json();
  return { status: response.status, value };
}
const api = (path, body) => request(`/functions/v1/leaderboard-api${path}`, body === undefined ? 'GET' : 'POST', body);
function ok(result) { assert.equal(result.status, 200, `Unexpected HTTP ${result.status}`); return result.value; }
function passed(check) { report.checks.push(check); console.log(`${check}:passed`); }
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  const oldBoard = ok(await api('/leaderboard?rulesVersion=nyang-v1-bc732af6f2a7ea66'));
  const corrected = oldBoard.entries.find(e => e.publicId === 'ef99e46b-ed9e-432d-a2a6-e7e67e8f7480');
  assert.ok(corrected && corrected.score >= 131); passed('LEGACY_131_RETAINED');
  ok(await api(`/leaderboard?rulesVersion=${kernel.rulesVersion}`));
  signupResponseUncertain = true;
  const signup = ok(await request('/auth/v1/signup', 'POST', {}, false));
  token = signup.access_token; userId = signup.user?.id;
  assert.ok(token && userId); signupResponseUncertain = false;
  ok(await api('/profile', { nickname: '부활확인냥' }));
  const parent = ok(await api('/runs', { rulesVersion: kernel.rulesVersion }));
  const parentReceived = performance.now();
  const proof = generateProof(kernel, parent);
  await sleep(Math.max(0, 3100 + proof.ticks / 120 * 1000 - (performance.now() - parentReceived)));
  for (const chunk of proof.chunks) ok(await api('/runs/chunks', chunk));
  const firstReceipt = ok(await api('/runs/finalize', { runId: parent.runId }));
  await sleep(5100); // Simulated ad duration only; no claim of external ad receipt verification.
  const child = ok(await api('/runs/revive', { runId: parent.runId }));
  const received = performance.now();
  const retryChild = ok(await api('/runs/revive', { runId: parent.runId }));
  assert.equal(child.runId, retryChild.runId); assert.deepEqual(child.initialState, retryChild.initialState);
  assert.equal(child.initialState.run.reviveUsed, true); passed('SINGLE_IDEMPOTENT_CHILD');
  let state = child.initialState, ticks = 0;
  while (state.screen === 'playing' && ticks < 1200) {
    state = kernel.transition(state, { type: 'TICK', dt: 1 / 120, input: { left: false, right: true } }, { mockAdsEnabled: false }).state;
    ticks++;
  }
  assert.equal(state.screen, 'result');
  await sleep(Math.max(0, 3100 + ticks / 120 * 1000 - (performance.now() - received)));
  const ack = ok(await api('/runs/chunks', { runId: child.runId, seq: 0, spans: [{ direction: 1, ticks }] }));
  assert.equal(ack.terminal, true); assert.equal(ack.totalTicks, ticks);
  const receipt = ok(await api('/runs/finalize', { runId: child.runId }));
  assert.equal(receipt.score, Math.floor(state.run.distanceM)); assert.ok(receipt.score > firstReceipt.score);
  assert.deepEqual(ok(await api('/runs/finalize', { runId: child.runId })), receipt);
  passed('REVIVED_SCORE_REPLAY_AND_RECEIPT');
  assert.equal((await api('/runs/revive', { runId: child.runId })).status, 422); passed('SECOND_REVIVAL_DENIED');
  const board = ok(await api(`/leaderboard?rulesVersion=${kernel.rulesVersion}`));
  const legacy = ok(await api('/leaderboard?rulesVersion=nyang-v1-bc732af6f2a7ea66'));
  assert.equal(board.me.score, receipt.bestScore); assert.equal(legacy.me.score, receipt.bestScore);
  assert.ok(legacy.entries.find(e => e.publicId === corrected.publicId)?.score >= 131);
  passed('LIFETIME_BOARD_BOTH_VERSIONS');
  const oldRun = ok(await api('/runs', { rulesVersion: 'nyang-v1-bc732af6f2a7ea66' }));
  assert.equal(oldRun.rulesVersion, 'nyang-v1-bc732af6f2a7ea66'); passed('OLD_APP_CHALLENGE_SUPPORTED');
  report.passed = true;
} catch (error) {
  console.log('REVIVAL_SMOKE:failed'); report.error = error instanceof assert.AssertionError ? error.message : 'REQUEST_OR_PARSE_FAILED';
  process.exitCode = 1;
} finally {
  if (userId && token) {
    try { ok(await request('/functions/v1/leaderboard-api/profile', 'DELETE')); report.cleanupPassed = true; console.log('OWN_TEST_ACCOUNT_CLEANUP:passed'); }
    catch { report.cleanupRequired = [userId]; report.passed = false; process.exitCode = 1; console.log('OWN_TEST_ACCOUNT_CLEANUP:failed'); }
  }
  report.signupResponseUncertain = signupResponseUncertain;
  await mkdir('output', { recursive: true });
  await writeFile('output/ranked-revival-production.json', JSON.stringify(report, null, 2));
  console.log('Sanitized report: output/ranked-revival-production.json');
}
