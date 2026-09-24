import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';

const config = JSON.parse(await readFile(new URL('../eas.json', import.meta.url), 'utf8'));
test('TestFlight uses a store build without development diagnostics or fake ads', () => {
  assert.equal(config.cli.appVersionSource, 'remote');
  const profile = config.build.production;
  assert.equal(profile.distribution, 'store');
  assert.equal(profile.environment, 'production');
  assert.equal(profile.autoIncrement, true);
  assert.notEqual(profile.developmentClient, true);
  assert.notEqual(profile.ios.simulator, true);
  assert.equal(profile.env.EXPO_PUBLIC_ENABLE_MOCK_AD, 'false');
  assert.equal(profile.env.EXPO_PUBLIC_REPLAY_DIAGNOSTICS, 'false');
  assert.match(profile.node, /^24\./);
  assert.equal(profile.ios.image, 'macos-tahoe-26.5-xcode-26.6');
  assert.deepEqual(Object.keys(profile.env).sort(), ['EXPO_PUBLIC_ENABLE_MOCK_AD', 'EXPO_PUBLIC_REPLAY_DIAGNOSTICS']);
});
test('upload exclusions preserve git credential and generated-file boundaries', async () => {
  const rules = text => text.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  const git = rules(await readFile(new URL('../.gitignore', import.meta.url), 'utf8'));
  const eas = rules(await readFile(new URL('../.easignore', import.meta.url), 'utf8'));
  for (const rule of git) assert.ok(eas.includes(rule), `Missing EAS exclusion: ${rule}`);
  for (const rule of ['.git', '/.agents/', '/.memory/', '/docs/', '/supabase/']) assert.ok(eas.includes(rule));
  for (const rule of ['/src/', '/assets/', '/test-fixtures/']) assert.ok(!eas.includes(rule));
});
