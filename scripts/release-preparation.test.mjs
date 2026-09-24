import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, writeFile, mkdtemp, mkdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { brandingAssets, renderBranding, verifyBranding, validateSvg } from './render-branding.mjs';
import { verifyWeb, verifyFavicon } from './verify-web.mjs';
import { generateFaviconAsync } from '@expo/image-utils';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
test('accepts Expo ICO conversion but rejects truncated or transparent frames', async () => {
  const ico = await generateFaviconAsync(await readFile(brandingAssets[1].destination));
  assert.equal(await verifyFavicon(ico), 'ICO with opaque 48px frame');
  await assert.rejects(verifyFavicon(ico.subarray(0, ico.length - 1)), /Truncated/);
  const transparent = Buffer.from(ico);
  transparent[transparent.readUInt32LE(18) + 43] = 0;
  await assert.rejects(verifyFavicon(transparent), /transparency/);
});
test('draft metadata respects Apple field limits without inventing operator input', async () => {
  const draft = JSON.parse(await read('store/ko-KR/metadata.json'));
  assert.equal(draft.name, '우당탕탕 냥대리');
  assert.equal(draft.locale, 'ko-KR');
  assert.equal(draft.status, 'draft');
  assert.ok(draft.name.length <= 30 && draft.subtitle.length <= 30);
  assert.ok(draft.promotionalText.length <= 170 && draft.description.length <= 4000);
  assert.ok(Buffer.byteLength(draft.keywords.join(','), 'utf8') <= 100);
  assert.match(draft.description, /Top 30/);
  assert.doesNotMatch(draft.description, /Top 100|광고 시청|무료 게임/);
  assert.equal(draft.madeForKids, false);
  const input = JSON.parse(await read('store/release-inputs.json'));
  assert.equal(input.schemaVersion, 1);
  for (const name of ['supportEmail', 'copyrightHolder', 'price', 'territories', 'ascAppId']) assert.equal(input[name], null);
  assert.equal(input.appleTeamId, 'S9RLQ8474U');
});
test('app config points at original opaque source-matched branding', async () => {
  const config = await read('app.config.ts');
  assert.match(config, /icon: '\.\/assets\/branding\/icon.png'/);
  assert.match(config, /favicon: '\.\/assets\/branding\/favicon.png'/);
  assert.deepEqual(await verifyBranding(), []);
  assert.throws(() => validateSvg('<svg viewBox="0 0 1024 1024"><image href="remote"/></svg>'));
  assert.throws(() => validateSvg('<svg viewBox="0 0 1024 1024" onload="bad"/>'));
});
test('branding check detects stale pixels and never repairs files implicitly', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nyang-branding-'));
  try {
    const assets = brandingAssets.map(asset => ({ ...asset, destination: join(dir, `${asset.width}.png`) }));
    await renderBranding(assets);
    assert.deepEqual(await verifyBranding(assets), []);
    await writeFile(assets[0].destination, await readFile(assets[1].destination));
    const before = await stat(assets[0].destination);
    assert.ok((await verifyBranding(assets)).length >= 1);
    assert.equal((await stat(assets[0].destination)).mtimeMs, before.mtimeMs);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('web verifier checks base path, real scripts and favicon while exposing pending policies', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nyang-web-release-'));
  try {
    await mkdir(join(dir, 'assets'));
    await writeFile(join(dir, 'index.html'), '<html><link rel="icon" href="/close-call-nyang/favicon.png"><script src="/close-call-nyang/app.js"></script></html>');
    await writeFile(join(dir, 'app.js'), 'console.log("release fixture")');
    await writeFile(join(dir, 'favicon.png'), await readFile(brandingAssets[1].destination));
    const report = await verifyWeb(dir);
    assert.equal(report.status, 'passed');
    assert.match(report.policyPages.privacy, /pending/);
    await writeFile(join(dir, 'app.js'), '<html>fallback</html>');
    await assert.rejects(verifyWeb(dir), /HTML fallback/);
    await writeFile(join(dir, 'app.js'), 'const x="/close-call-nyang/assets/missing.png"');
    await assert.rejects(verifyWeb(dir));
    await writeFile(join(dir, 'index.html'), '<html><script src="/app.js"></script></html>');
    await assert.rejects(verifyWeb(dir), /base path/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
