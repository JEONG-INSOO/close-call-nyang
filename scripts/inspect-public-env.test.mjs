import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { detectUnsafeText, inspectPublicEnvironment, parseInspectionArgs, parsePublicEnvFile,
  runInspectionCli, selectPublicEnvironment } from './inspect-public-env.mjs';

// Invented fixtures only: no local .env or external account is read by these tests.
const URL_NAME = 'EXPO_PUBLIC_SUPABASE_URL';
const KEY_NAME = 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY';
const URL_VALUE = 'https://fixture-project.supabase.co';
const KEY_VALUE = 'sb_publishable_invented_env_check_fixture';
const ENV = { [URL_NAME]: URL_VALUE, [KEY_NAME]: KEY_VALUE,
  EXPO_PUBLIC_ENABLE_MOCK_AD: 'false', EXPO_PUBLIC_REPLAY_DIAGNOSTICS: 'false' };
const BUNDLE = `globalThis.config = { url: ${JSON.stringify(URL_VALUE)}, key: ${JSON.stringify(KEY_VALUE)} };`;
const check = (report, id) => report.checks.find(item => item.id === id);
async function withExport(action, bundle = BUNDLE) {
  const root = await mkdtemp(join(tmpdir(), 'nyang-public-env-test-'));
  try {
    await mkdir(join(root, 'assets'));
    await writeFile(join(root, 'index.html'), '<html><script src="assets/app.js"></script></html>');
    await writeFile(join(root, 'assets', 'app.js'), bundle);
    return await action(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('valid config passes static checks without claiming runtime/hosted evidence', async () => withExport(async directory => {
  const report = await inspectPublicEnvironment({ directory, environment: ENV });
  assert.equal(report.status, 'passed');
  assert.equal(report.mode, 'hosted-config');
  assert.equal(report.scannedFiles, 2);
  assert.match(report.limitations.join(' '), /do not prove runtime/);
  assert.match(report.limitations.join(' '), /mock ads are unreachable/);
  assert.equal(JSON.stringify(report).includes(KEY_VALUE), false);
  assert.equal(JSON.stringify(report).includes(URL_VALUE), false);
}));

test('unconfigured default fails; explicit local-only permits only offline bundle', async () => withExport(async directory => {
  const closed = await inspectPublicEnvironment({ directory });
  assert.equal(closed.status, 'failed');
  assert.equal(check(closed, 'public-config').status, 'failed');
  const allowed = await inspectPublicEnvironment({ directory, allowUnconfigured: true });
  assert.equal(allowed.status, 'passed');
  assert.equal(allowed.mode, 'local-only');
}, 'globalThis.localOnly = true;'));

test('local-only cannot hide a previously configured bundle', async () => withExport(async directory => {
  const result = await inspectPublicEnvironment({ directory, allowUnconfigured: true });
  assert.equal(check(result, 'dist-config-match').status, 'failed');
}));

test('partial config never uses local-only exception', async () => withExport(async directory => {
  for (const environment of [{ [URL_NAME]: URL_VALUE }, { [KEY_NAME]: KEY_VALUE }]) {
    const result = await inspectPublicEnvironment({ directory, environment, allowUnconfigured: true });
    assert.equal(result.status, 'failed');
    assert.equal(check(result, 'public-config').status, 'failed');
  }
}));

for (const [label, value] of [
  ['http', 'http://fixture-project.supabase.co'], ['userinfo', 'https://username:password@fixture-project.supabase.co'],
  ['path', `${URL_VALUE}/functions/v1`], ['query', `${URL_VALUE}?secret=fixture`], ['fragment', `${URL_VALUE}#fixture`],
  ['local host', 'https://localhost'], ['invalid host', 'https://project.invalid'], ['empty', ''],
]) test(`reject unsafe URL shape: ${label}`, async () => withExport(async directory => {
  const result = await inspectPublicEnvironment({ directory, environment: { ...ENV, [URL_NAME]: value } });
  assert.equal(check(result, 'public-url').status, 'failed');
}));

test('only publishable key format accepted', async () => withExport(async directory => {
  for (const key of ['sb_secret_invented_fixture_only', 'legacy-jwt-key', 'sb_publishable_', 'sb_publishable_invalid whitespace']) {
    const result = await inspectPublicEnvironment({ directory, environment: { ...ENV, [KEY_NAME]: key } });
    assert.equal(check(result, 'public-key').status, 'failed');
  }
}));

test('public secret names and values fail without exposing them', async () => withExport(async directory => {
  for (const environment of [
    { ...ENV, EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: 'invented-sensitive-value' },
    { ...ENV, EXPO_PUBLIC_DB_PASSWORD: 'invented-sensitive-value' },
    { ...ENV, EXPO_PUBLIC_ACCESS_TOKEN: 'invented-sensitive-value' },
    { ...ENV, EXPO_PUBLIC_RANKING_RATE_LIMIT_SALT: 'invented-sensitive-value' },
    { ...ENV, EXPO_PUBLIC_PICTURE: 'sb_secret_invented_sensitive_value' },
  ]) {
    const result = await inspectPublicEnvironment({ directory, environment });
    assert.equal(check(result, 'public-secret-boundary').status, 'failed');
    assert.equal(JSON.stringify(result).includes('invented-sensitive-value'), false);
    assert.equal(JSON.stringify(result).includes('sb_secret_invented_sensitive_value'), false);
  }
}));

test('private process env fields are neither copied nor accessed', () => {
  const environment = { ...ENV };
  Object.defineProperty(environment, 'SUPABASE_ACCESS_TOKEN', { enumerable: true, get() { throw new Error('Must not read.'); } });
  assert.deepEqual(selectPublicEnvironment(environment), ENV);
});

test('production flag inputs accept only blank or exact false', async () => withExport(async directory => {
  for (const name of ['EXPO_PUBLIC_ENABLE_MOCK_AD', 'EXPO_PUBLIC_REPLAY_DIAGNOSTICS']) {
    for (const value of ['true', 'TRUE', '1', 'unexpected']) {
      const result = await inspectPublicEnvironment({ directory, environment: { ...ENV, [name]: value } });
      assert.equal(result.status, 'failed');
    }
  }
}));

const JWT = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role: 'service_role', exp: 1 })).toString('base64url')}.inventedsignature`;
for (const [label, content, category] of [
  ['secret token', 'sb_secret_invented_fixture_abcdefgh', 'known-secret-token'],
  ['access token', 'sbp_invented_fixture_abcdefgh', 'known-secret-token'],
  ['database password', 'postgresql://postgres:invented_password@db.fixture.invalid/postgres', 'database-credentials'],
  ['private key', '-----BEGIN PRIVATE KEY-----', 'private-key'],
  ['legacy JWT', JWT, 'embedded-auth-jwt'],
  ['server env name', 'SUPABASE_SERVICE_ROLE_KEY', 'forbidden-server-name'],
  ['ranking rate salt', 'RANKING_RATE_LIMIT_SALT', 'forbidden-server-name'],
  ['server-only origins', 'RANKING_ALLOWED_ORIGINS', 'forbidden-server-name'],
  ['public secret name', 'EXPO_PUBLIC_DB_PASSWORD', 'forbidden-server-name'],
  ['hardcoded assignment', 'serviceRoleKey: "invented-secret-value"', 'credential-assignment'],
  ['mock hostname', 'https://nyang-ranking-fixture.invalid', 'simulated-api-marker'],
  ['mock key', 'sb_publishable_simulated_api_fixture_only', 'simulated-api-marker'],
  ['diagnostic function', 'RankedReplayDiagnostics', 'development-diagnostic-marker'],
  ['diagnostic UI', '개발용 합성 재현 검사', 'development-diagnostic-marker'],
  ['diagnostic fixture', 'office-hundred-fall', 'development-diagnostic-marker'],
  ['escaped token', String.raw`sb_\u0073ecret_invented_fixture_abcdefgh`, 'known-secret-token'],
]) test(`detect export marker: ${label}`, async () => withExport(async directory => {
  await writeFile(join(directory, 'assets', 'extra.txt'), content);
  const result = await inspectPublicEnvironment({ directory, environment: ENV });
  assert.equal(result.status, 'failed');
  assert.match(check(result, 'dist-secret-markers').message, new RegExp(category));
  assert.equal(JSON.stringify(result).includes(content), false);
}));

test('ordinary SDK field names and public format prefix are not secrets', () => {
  assert.deepEqual(detectUnsafeText('function getSession(access_token) {}; const role = "service_role"; const prefix="sb_publishable_";'), []);
  assert.deepEqual(detectUnsafeText('const names={access_token:"access_token"};'), []);
  assert.ok(detectUnsafeText('const x={access_token:"actual-token-fixture"};').includes('credential-assignment'));
  assert.ok(detectUnsafeText('process.env.SUPABASE_SECRET_KEYS').includes('forbidden-server-name'));
});

test('mismatched public config fails', async () => withExport(async directory => {
  const result = await inspectPublicEnvironment({ directory, environment: { ...ENV, [KEY_NAME]: 'sb_publishable_other_fixture_key' } });
  assert.equal(check(result, 'dist-config-match').status, 'failed');
}));

test('config only in metadata or split JS is not a bundle match', async () => withExport(async directory => {
  await writeFile(join(directory, 'metadata.json'), JSON.stringify(ENV));
  await writeFile(join(directory, 'assets', 'app.js'), `const url = ${JSON.stringify(URL_VALUE)};`);
  await writeFile(join(directory, 'assets', 'key.js'), `const key = ${JSON.stringify(KEY_VALUE)};`);
  const result = await inspectPublicEnvironment({ directory, environment: ENV });
  assert.equal(check(result, 'dist-config-match').status, 'failed');
}));

test('trailing-slash URL and common JS escapes are supported', async () => withExport(async directory => {
  const result = await inspectPublicEnvironment({ directory, environment: { ...ENV, [URL_NAME]: `${URL_VALUE}/` } });
  assert.equal(result.status, 'passed');
}, BUNDLE.replace('https://', String.raw`https:\/\/`).replace('fixture-project', String.raw`\u0066ixture-project`)));

test('missing export fails even in local-only mode', async () => withExport(async directory => {
  const result = await inspectPublicEnvironment({ directory: join(directory, 'missing'), allowUnconfigured: true });
  assert.equal(result.status, 'failed');
  assert.equal(check(result, 'dist-readable').status, 'failed');
}));

test('binary assets counted as skipped, never certified safe', async () => withExport(async directory => {
  await writeFile(join(directory, 'assets', 'fixture.wav'), Buffer.from([0, 1, 2, 3]));
  const result = await inspectPublicEnvironment({ directory, environment: ENV });
  assert.equal(result.status, 'passed');
  assert.equal(result.skippedBinaryFiles, 1);
  assert.match(result.limitations.join(' '), /binary assets are not proven safe/);
}));

test('accidental .env export is forbidden even if empty', async () => withExport(async directory => {
  await writeFile(join(directory, '.env.local'), '');
  const result = await inspectPublicEnvironment({ directory, environment: ENV });
  assert.equal(result.status, 'failed');
  assert.match(check(result, 'dist-secret-markers').message, /environment-file-in-export/);
}));

test('symlinks fail closed without following outside export', async () => withExport(async directory => {
  await symlink(join(directory, 'assets'), join(directory, 'linked-assets'), process.platform === 'win32' ? 'junction' : 'dir');
  const result = await inspectPublicEnvironment({ directory, environment: ENV });
  assert.equal(check(result, 'dist-readable').status, 'failed');
}));

test('explicit env parser ignores private entries and disallows interpolation', () => {
  assert.deepEqual(parsePublicEnvFile(`SUPABASE_ACCESS_TOKEN=ignored\nexport ${URL_NAME}="${URL_VALUE}" # public\n${KEY_NAME}='${KEY_VALUE}'\n`),
    { [URL_NAME]: URL_VALUE, [KEY_NAME]: KEY_VALUE });
  for (const input of [`${URL_NAME}=$PRIVATE`, `${URL_NAME}="unterminated`, `${URL_NAME}=one\n${URL_NAME}=two`, `${URL_NAME}`]) {
    assert.throws(() => parsePublicEnvFile(input));
  }
});

test('CLI rejects duplicate, unknown and missing options', () => {
  assert.equal(parseInspectionArgs(['--allow-unconfigured']).allowUnconfigured, true);
  for (const args of [['--unknown'], ['--dist'], ['--env-file', '--allow-unconfigured'], ['--allow-unconfigured', '--allow-unconfigured']]) {
    assert.throws(() => parseInspectionArgs(args));
  }
});

test('CLI explicit env file works; public process overrides are checked', async () => withExport(async directory => {
  const envPath = join(directory, 'fixture-public.env');
  await writeFile(envPath, `${URL_NAME}=${URL_VALUE}\n${KEY_NAME}=${KEY_VALUE}\n`);
  const messages = [];
  assert.equal(await runInspectionCli(['--dist', directory, '--env-file', envPath], {}, message => messages.push(message)), 0);
  assert.equal(messages.join('').includes(KEY_VALUE), false);
  assert.equal(await runInspectionCli(['--dist', directory, '--env-file', envPath], { [KEY_NAME]: 'sb_publishable_wrong_fixture' }, () => {}), 1);
}));

test('CLI suppresses error paths and invalid file contents', async () => withExport(async directory => {
  const messages = [];
  const secretPath = join(directory, 'invented-sensitive-path');
  assert.equal(await runInspectionCli(['--env-file', secretPath], {}, message => messages.push(message)), 1);
  assert.equal(messages.join('').includes(secretPath), false);
  const invalidPath = join(directory, 'invalid-public.env');
  await writeFile(invalidPath, `${KEY_NAME}="invented-secret-without-ending-quote`);
  assert.equal(await runInspectionCli(['--env-file', invalidPath], {}, message => messages.push(message)), 1);
  assert.equal(messages.join('').includes('invented-secret'), false);
}));

test('actual CLI exits nonzero by default, zero only for explicit offline fixture', async () => withExport(async directory => {
  const script = fileURLToPath(new URL('./inspect-public-env.mjs', import.meta.url));
  for (const [extra, expected] of [[[], 1], [['--allow-unconfigured'], 0]]) {
    const child = spawnSync(process.execPath, [script, '--dist', directory, ...extra], { env: {}, encoding: 'utf8' });
    assert.equal(child.status, expected, child.stderr);
    assert.equal(JSON.parse(child.stdout).status, expected === 0 ? 'passed' : 'failed');
  }
}, 'globalThis.localOnly = true;'));
