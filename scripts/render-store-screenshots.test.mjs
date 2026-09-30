import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { manifestPath, validateManifest, safePath, captureGeometry, verifyScreenshots } from './render-store-screenshots.mjs';
import { stripPrivateJpegMetadata } from './sanitize-screenshot-sources.mjs';

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const copy = () => structuredClone(manifest);

test('JPEG sanitization removes private segments without touching colour info or compressed scan', () => {
  const soi = Buffer.from([0xff, 0xd8]);
  const segment = marker => Buffer.from([0xff, marker, 0, 4, 0x61, 0x62]);
  const scan = Buffer.from([0xff, 0xda, 0, 2, 9, 8, 7, 0xff, 0xd9]);
  const original = Buffer.concat([soi, segment(0xe1), segment(0xed), segment(0xfe), segment(0xe2), segment(0xee), scan]);
  const expected = Buffer.concat([soi, segment(0xe2), segment(0xee), scan]);
  assert.deepEqual(stripPrivateJpegMetadata(original), expected);
  assert.deepEqual(stripPrivateJpegMetadata(expected), expected);
  assert.throws(() => stripPrivateJpegMetadata(Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0, 99])), /segment size/);
  assert.throws(() => stripPrivateJpegMetadata(Buffer.from('not a jpeg')), /JPEG SOI/);
});

test('draft manifest preserves five input scenes and excludes third-party ranking names', () => {
  assert.doesNotThrow(() => validateManifest(manifest));
  assert.deepEqual(manifest.items.map(item => item.source.match(/photo-(\d)/)[1]), ['1', '5', '6', '3', '2']);
  assert.equal(manifest.captureBuildNumber, null);
  assert.equal(manifest.status, 'draft_awaiting_approval');
});
test('paths cannot leave the screenshot subtree or overwrite sources', () => {
  for (const path of ['../test', 'store/screenshots/../../test', 'C:/test', 'store\\screenshots\\test']) {
    assert.throws(() => safePath(path));
  }
  const invalid = copy(); invalid.items[0].output = invalid.items[0].source;
  assert.throws(() => validateManifest(invalid), /unique draft PNG/);
});
test('order, hash, dimensions, duplicate destinations and state are validated', () => {
  for (const mutate of [
    m => { m.items[0].sourceSha256 = 'invalid'; },
    m => { m.items[0].sourceWidth = 1290; },
    m => { m.items[0].source = 'store/screenshots/source/2026-09-30/photo-4.jpg'; },
    m => { m.items[0].output = m.items[1].output; },
    m => { m.status = 'submitted'; },
  ]) { const invalid = copy(); mutate(invalid); assert.throws(() => validateManifest(invalid)); }
});
test('geometry preserves aspect ratio up to one rounding pixel and remains inside canvas', () => {
  for (const item of manifest.items) {
    const g = captureGeometry(item);
    assert.ok(Math.abs(g.height - g.width * item.sourceHeight / item.sourceWidth) < 0.5);
    assert.ok(g.left >= 0 && g.top > 180 && g.left + g.width < manifest.width && g.top + g.height < manifest.height);
  }
});
test('five files match generated RGB dimensions, source hashes and unmodified screenshot regions', async () => {
  assert.deepEqual(await verifyScreenshots(), []);
});
