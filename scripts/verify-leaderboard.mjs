import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const REF = /^[a-z]{20}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BASE = '/functions/v1/leaderboard-api';
const MANUAL = ['DB_CATALOG_RLS_GRANTS', 'TOP_100_TIES_FIXTURE', 'CROSS_RUN_MAX_CONCURRENCY',
  'EXPIRY_AND_MODERATION', 'PROVIDER_LIMITS_AND_GATEWAY', 'RETENTION_CRON_BACKUP',
  'LIVE_BROWSER_OFFLINE_RECOVERY', 'HERMES_NATIVE'];
class CheckError extends Error { constructor(code) { super(code); this.code = code; } }
const requireCheck = (condition, code) => { if (!condition) throw new CheckError(code); };

export function parseOptions(argv) {
  const options = { allowTestWrites: false };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === '--allow-test-writes') { requireCheck(!options.allowTestWrites, 'DUPLICATE_OPTION'); options.allowTestWrites = true; continue; }
    const name = { '--environment': 'environment', '--project-ref': 'projectRef', '--env-file': 'envFile' }[key];
    requireCheck(name && options[name] === undefined && argv[index + 1] && !argv[index + 1].startsWith('--'), 'INVALID_OPTION');
    options[name] = argv[++index];
  }
  requireCheck(['staging', 'production'].includes(options.environment), 'ENVIRONMENT_REQUIRED');
  return options;
}

/** Only public connection material is consumed. Never accept an admin key. */
export function readTarget(env, options) {
  const projectRef = env.RANKING_PROJECT_REF ?? '';
  const otherRef = env.RANKING_OTHER_PROJECT_REF ?? '';
  requireCheck(REF.test(projectRef) && REF.test(otherRef) && projectRef !== otherRef, 'DISTINCT_PROJECT_REFS_REQUIRED');
  requireCheck(env.RANKING_ENVIRONMENT === options.environment, 'ENVIRONMENT_MISMATCH');
  requireCheck(options.projectRef === projectRef, 'EXPLICIT_PROJECT_CONFIRMATION_REQUIRED');
  const url = env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  requireCheck(url === `https://${projectRef}.supabase.co`, 'PROJECT_URL_MISMATCH');
  const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
  requireCheck(/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(key), 'PUBLISHABLE_KEY_REQUIRED');
  const origin = options.environment === 'production' ? 'https://jeong-insoo.github.io' : 'http://127.0.0.1:4173';
  return { projectRef, environment: options.environment, url, key, origin };
}

/** Same six pure source modules as the browser golden runner. No app/platform imports. */
export async function loadKernel(root = ROOT) {
  const names = ['types', 'balance', 'deterministicMath', 'difficulty', 'random', 'engine'];
  const factories = new Map(); const cache = new Map();
  for (const name of names) {
    const source = await readFile(resolve(root, `src/game/${name}.ts`), 'utf8');
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    factories.set(name, new Function('module', 'exports', 'require', js));
  }
  function localRequire(id) {
    const name = id.replace(/^\.\//, '').replace(/\.ts$/, '');
    requireCheck(factories.has(name), 'UNEXPECTED_KERNEL_IMPORT');
    if (!cache.has(name)) { const module = { exports: {} }; cache.set(name, module); factories.get(name)(module, module.exports, localRequire); }
    return cache.get(name).exports;
  }
  const source = await readFile(resolve(root, 'src/online/rulesVersion.ts'), 'utf8');
  const version = source.match(/nyang-v1-[a-f0-9]{16}/)?.[0];
  requireCheck(version, 'RULES_VERSION_MISSING');
  return { ...localRequire('engine'), rulesVersion: version };
}

/** Generated legal inputs for this server-issued seed, not an injected score. */
export function generateProof(kernel, challenge, direction = 1) {
  requireCheck(UUID.test(challenge?.runId) && Number.isSafeInteger(challenge.engineRunId) && challenge.engineRunId > 0 &&
    challenge.engineRunId <= 0x7fffffff && Number.isInteger(challenge.seed) && challenge.seed > 0 && challenge.seed <= 0xffffffff &&
    challenge.rulesVersion === kernel.rulesVersion && Number.isFinite(Date.parse(challenge.issuedAt)) &&
    Date.parse(challenge.expiresAt) > Date.parse(challenge.issuedAt), 'INVALID_CHALLENGE');
  const flags = { mockAdsEnabled: false };
  let state = kernel.transition(kernel.createInitialState(), { type: 'START', runId: challenge.engineRunId, seed: challenge.seed }, flags).state;
  for (let tick = 0; tick < 360; tick += 1) state = kernel.transition(state,
    { type: 'TICK', dt: 1 / 120, input: { left: false, right: false } }, flags).state;
  requireCheck(state.screen === 'playing', 'COUNTDOWN_MISMATCH');
  let ticks = 0; let chunkTicks = 0; const chunks = [];
  while (state.screen === 'playing' && ticks < 3600) {
    state = kernel.transition(state, { type: 'TICK', dt: 1 / 120,
      input: { left: direction === -1, right: direction === 1 } }, flags).state;
    ticks += 1; chunkTicks += 1;
    if (chunkTicks === 1200 || state.screen === 'result') {
      chunks.push({ runId: challenge.runId, seq: chunks.length, spans: [{ direction, ticks: chunkTicks }] }); chunkTicks = 0;
    }
  }
  requireCheck(state.screen === 'result', 'SMOKE_RUN_DID_NOT_FALL');
  return { chunks, ticks, score: Math.floor(state.run.distanceM) };
}

export async function waitForProofTicks(receivedAt, ticks, { monotonic, sleep, signal, progress = () => {} }) {
  // Receipt time is later than issued_at. Use monotonic elapsed time to avoid
  // PC/server clock skew and never exploit the server's two-second tolerance.
  const target = receivedAt + 3000 + ticks / 120 * 1000 + 100;
  let lastNotice = -Infinity;
  while (monotonic() < target) {
    requireCheck(!signal?.aborted, 'INTERRUPTED');
    if (monotonic() - lastNotice >= 1000) { progress('PACING_LEGAL_INPUT'); lastNotice = monotonic(); }
    await sleep(Math.min(250, target - monotonic()));
  }
  requireCheck(!signal?.aborted, 'INTERRUPTED');
}

export async function runSmoke(target, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const monotonic = options.monotonic ?? (() => performance.now());
  const sleep = options.sleep ?? (ms => new Promise(done => setTimeout(done, ms)));
  const now = options.now ?? (() => new Date().toISOString());
  const progress = options.progress ?? (() => {});
  const report = { schemaVersion: 1, hostedSmokeOnly: true, taskComplete: false,
    evidenceSource: options.fetchImpl ? 'simulated' : 'hosted', environment: target.environment,
    projectRef: target.projectRef, checkedAt: now(), checks: [], cleanupRequired: [], signupResponseUncertain: false };
  const users = [];
  const record = (id, status, evidence) => { report.checks.push({ id, status, checkedAt: now(), projectRef: target.projectRef,
    environment: target.environment, evidence }); progress(`${id}:${status}`); };
  async function check(id, body, evidence = 'Expected response and local contract assertions matched.') {
    try { await body(); record(id, 'passed', evidence); }
    catch (error) { record(id, 'failed', error instanceof CheckError ? error.code : 'REQUEST_OR_LOCAL_CHECK_FAILED'); throw new CheckError('SMOKE_STOPPED'); }
  }
  async function request(path, { method = 'GET', user, body, origin = target.origin, token, schema, cleanup = false } = {}) {
    requireCheck(cleanup || !options.signal?.aborted, 'INTERRUPTED');
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 10_000);
    const stop = () => controller.abort();
    if (!cleanup) options.signal?.addEventListener('abort', stop, { once: true });
    try {
      const headers = { apikey: target.key, Origin: origin, 'Cache-Control': 'no-cache' };
      if (schema !== undefined) {
        requireCheck(schema === 'private' || schema === 'public', 'INVALID_REST_SCHEMA');
        headers['Content-Profile'] = schema;
      }
      if (user || token) headers.Authorization = `Bearer ${token ?? user.token}`;
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      const response = await fetchImpl(`${target.url}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal, redirect: 'error' });
      const raw = await response.text(); requireCheck(raw.length <= 524288, 'RESPONSE_TOO_LARGE');
      let value; try { value = JSON.parse(raw); } catch { throw new CheckError('INVALID_RESPONSE'); }
      return { status: response.status, value, headers: response.headers };
    } catch (error) { throw error instanceof CheckError ? error : new CheckError('NETWORK_OR_TIMEOUT'); }
    finally { clearTimeout(timer); if (!cleanup) options.signal?.removeEventListener('abort', stop); }
  }
  const api = (path, args) => request(`${BASE}${path}`, args);
  const ok = response => { requireCheck(response.status === 200, `UNEXPECTED_HTTP_${Number(response.status) || 0}`); return response.value; };
  const denied = (response, status, code) => requireCheck(response.status === status && response.value?.code === code, 'EXPECTED_DENIAL_MISSING');
  const sameAck = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  try {
    requireCheck(options.allowTestWrites === true, 'TEST_WRITES_NOT_AUTHORIZED');
    const kernel = options.kernel ?? await loadKernel();
    await check('PUBLIC_BOARD', async () => {
      const result = await api(`/leaderboard?rulesVersion=${kernel.rulesVersion}`); const board = ok(result);
      requireCheck(board.rulesVersion === kernel.rulesVersion && Array.isArray(board.entries) && board.entries.length <= 30 && board.me === null, 'INVALID_PUBLIC_BOARD');
      requireCheck(result.headers.get('access-control-allow-origin') === target.origin, 'CORS_ORIGIN_MISSING');
    });
    await check('UNAUTHENTICATED_WRITES_AND_BAD_JWT', async () => {
      const routes = [['/profile', 'POST', { nickname: '검사냥' }], ['/profile', 'DELETE'], ['/runs', 'POST', { rulesVersion: kernel.rulesVersion }],
        ['/runs/chunks', 'POST', {}], ['/runs/finalize', 'POST', {}], ['/reports', 'POST', {}]];
      for (const [path, method, body] of routes) denied(await api(path, { method, body }), 401, 'UNAUTHORIZED');
      denied(await api('/profile', { token: 'not-a-valid-jwt' }), 401, 'UNAUTHORIZED');
      denied(await api(`/leaderboard?rulesVersion=${kernel.rulesVersion}`, { origin: 'https://untrusted.invalid' }), 403, 'FORBIDDEN');
    });
    await check('TWO_EXPLICIT_ANONYMOUS_PROFILES', async () => {
      for (const label of ['A', 'B']) {
        report.signupResponseUncertain = true;
        const auth = ok(await request('/auth/v1/signup', { method: 'POST', body: { data: {} } }));
        requireCheck(UUID.test(auth.user?.id) && typeof auth.access_token === 'string' && auth.access_token.length > 20, 'SIGNUP_NOT_CONFIRMED');
        const user = { label, id: auth.user.id, token: auth.access_token }; users.push(user);
        report.signupResponseUncertain = false;
        requireCheck(auth.user.is_anonymous === true, 'EXPECTED_ANONYMOUS_USER');
        const profile = ok(await api('/profile', { method: 'POST', user, body: { nickname: '검사냥대리' } }));
        requireCheck(UUID.test(profile.publicId) && profile.nickname === '검사냥대리', 'PROFILE_MISMATCH'); user.publicId = profile.publicId;
      }
      requireCheck(users[0].id !== users[1].id && users[0].publicId !== users[1].publicId, 'IDENTITIES_NOT_DISTINCT');
    });
    const [a, b] = users;
    await check('STRICT_FIELDS', async () => {
      denied(await api('/profile', { method: 'POST', user: a, body: { nickname: '검사냥대리', userId: b.id } }), 400, 'INVALID_INPUT');
      denied(await api('/runs', { method: 'POST', user: a, body: { rulesVersion: kernel.rulesVersion, score: 999 } }), 400, 'INVALID_INPUT');
      denied(await api('/runs', { method: 'POST', user: a, body: { rulesVersion: 'nyang-v1-0000000000000000' } }), 409, 'RULES_MISMATCH');
    });
    let challenge; let proof; let receivedAt; let receipt;
    await check('ISSUED_RUN_AND_OWNERSHIP', async () => {
      challenge = ok(await api('/runs', { method: 'POST', user: a, body: { rulesVersion: kernel.rulesVersion } })); receivedAt = monotonic();
      proof = generateProof(kernel, challenge);
      denied(await api('/runs/chunks', { method: 'POST', user: b, body: proof.chunks[0] }), 403, 'FORBIDDEN');
    });
    await check('PACED_REPLAY_AND_IDEMPOTENT_ACK', async () => {
      let ticks = 0;
      for (const chunk of proof.chunks) {
        ticks += chunk.spans.reduce((sum, span) => sum + span.ticks, 0);
        await waitForProofTicks(receivedAt, ticks, { monotonic, sleep, signal: options.signal, progress });
        const ack = ok(await api('/runs/chunks', { method: 'POST', user: a, body: chunk }));
        requireCheck(ack.acceptedSeq === chunk.seq && ack.totalTicks === ticks && ack.terminal === (ticks === proof.ticks), 'ACK_MISMATCH');
        const retried = ok(await api('/runs/chunks', { method: 'POST', user: a, body: chunk }));
        requireCheck(sameAck(ack, retried), 'RETRY_ACK_CHANGED');
        denied(await api('/runs/chunks', { method: 'POST', user: a,
          body: { ...chunk, spans: [{ ...chunk.spans[0], direction: -1 }] } }), 409, 'OUT_OF_ORDER');
      }
      denied(await api('/runs/chunks', { method: 'POST', user: a,
        body: { runId: challenge.runId, seq: proof.chunks.length, spans: [{ direction: 1, ticks: 1 }] } }), 422, 'PROOF_REJECTED');
    });
    await check('CONCURRENT_DUPLICATE_FINALIZE', async () => {
      const replies = await Promise.all([0, 1].map(() => api('/runs/finalize', { method: 'POST', user: a, body: { runId: challenge.runId } })));
      receipt = ok(replies[0]); const duplicate = ok(replies[1]);
      requireCheck(receipt.runId === challenge.runId && receipt.score === proof.score && receipt.bestScore === proof.score && receipt.improved === true &&
        Number.isSafeInteger(receipt.rank) && receipt.rank > 0 && sameAck(receipt, duplicate), 'RECEIPT_MISMATCH');
    });
    await check('PRIVATE_SCHEMA_NOT_EXPOSED', async () => {
      // Only the just-created A's already earned score is used. No UPSERT or
      // fabricated points: a mistaken grant cannot introduce an inflated score.
      // PGRST106 proves API non-exposure, NOT the database's RLS/table grants.
      const existingScore = { user_id: a.id, rules_version: kernel.rulesVersion,
        score: receipt.score, source_run_id: challenge.runId };
      for (const user of [undefined, b]) {
        denied(await request('/rest/v1/best_scores', { method: 'POST', user, schema: 'private', body: existingScore }), 406, 'PGRST106');
        denied(await request(`/rest/v1/best_scores?user_id=eq.${a.id}&rules_version=eq.${kernel.rulesVersion}`,
          { method: 'PATCH', user, schema: 'private', body: { score: receipt.score } }), 406, 'PGRST106');
      }
    }, 'Anonymous and authenticated direct score INSERT/PATCH rejected with 406/PGRST106: private schema not exposed. Catalog/RLS verification remains separate.');
    await check('SERVICE_ONLY_RPC_DENIALS', async () => {
      // Valid named arguments distinguish permission denial from unknown RPCs
      // or bad signatures. All targets belong to this smoke; finalize is a retry.
      const probes = [
        ['rank_get_profile', { p_user_id: a.id }],
        ['rank_upsert_profile', { p_user_id: a.id, p_nickname: '검사냥대리' }],
        ['rank_finalize_run', { p_user_id: a.id, p_run_id: challenge.runId }],
      ];
      for (const user of [undefined, b]) {
        for (const [name, body] of probes) {
          denied(await request(`/rest/v1/rpc/${name}`, { method: 'POST', user, schema: 'public', body }), user ? 403 : 401, '42501');
        }
      }
    }, 'Three existing public RPCs rejected anonymous/authenticated calls with SQLSTATE 42501 (401/403). Missing-route 404 is not permission evidence; catalog covers the remaining RPCs.');
    await check('RENAME_RANK_AND_REPORT', async () => {
      const renamed = ok(await api('/profile', { method: 'POST', user: a, body: { nickname: '검사냥수정' } }));
      requireCheck(renamed.publicId === a.publicId, 'RENAME_CHANGED_ID');
      const board = ok(await api(`/leaderboard?rulesVersion=${kernel.rulesVersion}`, { user: a }));
      requireCheck(board.me?.publicId === a.publicId && board.me.nickname === '검사냥수정' && board.me.score === proof.score && board.me.rank > 0, 'MY_RANK_MISMATCH');
      requireCheck(ok(await api('/reports', { method: 'POST', user: a, body: { targetPublicId: b.publicId, reason: 'other' } })).reported === true, 'REPORT_NOT_CONFIRMED');
    });
  } catch (error) {
    if (!(error instanceof CheckError && error.code === 'SMOKE_STOPPED')) record('RUN_ABORTED', 'failed', error instanceof CheckError ? error.code : 'LOCAL_CHECK_FAILED');
  } finally {
    // Never enumerate users or use administrator deletion. Only our successful signups.
    for (const user of users) {
      let removed = false;
      for (let attempt = 0; attempt < 2 && !removed; attempt += 1) {
        try { removed = ok(await api('/profile', { method: 'DELETE', user, cleanup: true })).deleted === true; }
        catch { /* One same-token retry handles a lost response. */ }
      }
      record(`CLEANUP_${user.label}`, removed ? 'passed' : 'failed', removed ? 'Own temporary profile deletion confirmed.' : 'OWN_GUEST_CLEANUP_REQUIRES_OPERATOR');
      if (!removed) { report.cleanupRequired.push({ label: user.label, userId: user.id, publicId: user.publicId ?? null }); continue; }
      try {
        requireCheck(ok(await api('/profile', { method: 'DELETE', user, cleanup: true })).deleted === true, 'DELETE_RETRY_NOT_SETTLED');
        const auth = await request('/auth/v1/user', { user, cleanup: true });
        requireCheck(auth.status === 401 || auth.status === 403 || (auth.status === 404 && auth.value?.code === 'user_not_found'), 'AUTH_USER_STILL_ACCESSIBLE');
        record(`DELETE_RETRY_AUTH_${user.label}`, 'passed', 'Same-token deletion settled and Auth user rejected.');
      } catch { record(`DELETE_RETRY_AUTH_${user.label}`, 'failed', 'DELETE_RETRY_OR_AUTH_REMOVAL_UNVERIFIED'); }
    }
    if (report.signupResponseUncertain) record('UNCERTAIN_SIGNUP', 'not_run', 'A signup response was not confirmed; inspect provider logs without bulk user deletion.');
    for (const id of MANUAL) record(id, 'not_run', 'Separate actual environment verification required; this smoke runner does not certify it.');
  }
  report.smokePassed = report.checks.some(check => check.id === 'RENAME_RANK_AND_REPORT' && check.status === 'passed') &&
    !report.checks.some(check => check.status === 'failed') && !report.signupResponseUncertain;
  return report;
}

export async function main(argv = process.argv.slice(2)) {
  let options; let target; let report;
  const abort = new AbortController(); const stop = () => abort.abort();
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  try {
    options = parseOptions(argv);
    const fileEnv = options.envFile ? parseEnv(await readFile(resolve(ROOT, options.envFile), 'utf8')) : {};
    target = readTarget({ ...fileEnv, ...process.env }, options);
    // Print only validated, nonsecret target metadata before any network operation.
    console.log(`Target: ${target.environment} / ${target.projectRef}`);
    requireCheck(options.allowTestWrites, 'TEST_WRITES_NOT_AUTHORIZED');
    report = await runSmoke(target, { allowTestWrites: true, signal: abort.signal, progress: message => console.log(message) });
  } catch (error) {
    const code = error instanceof CheckError ? error.code : 'LOCAL_CONFIGURATION_UNAVAILABLE';
    const environment = options?.environment ?? null; const projectRef = target?.projectRef ?? null;
    report = { schemaVersion: 1, hostedSmokeOnly: true, taskComplete: false, evidenceSource: 'not_run', smokePassed: false,
      checkedAt: new Date().toISOString(), environment, projectRef, checks: [{ id: 'PREFLIGHT', status: 'not_run',
        checkedAt: new Date().toISOString(), environment, projectRef, evidence: code }], cleanupRequired: [] };
    console.error(`Hosted verification not run: ${code}. Use explicit environment/ref and public configuration; never paste secrets into chat.`);
  } finally { process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop); }
  const output = resolve(ROOT, 'output', `ranking-${options?.environment ?? 'unconfigured'}-${randomUUID()}.json`);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log('Sanitized report saved under ignored output/. No tokens are recorded. Hosted smoke is not full Task completion.');
  return report.smokePassed ? 0 : 2;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(code => { process.exitCode = code; }).catch(() => { console.error('Verification report could not be saved.'); process.exitCode = 2; });
}
