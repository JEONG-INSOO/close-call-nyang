import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import sharp from 'sharp';
import { buildVeteranAtlas } from './build-veteran-frames.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const scratchRoot = join(root, 'output');
const names = [
  'frame-1.png', 'frame-2.png', 'frame-3.png', 'frame-4.png',
  'alarm-expression.png', 'fall-expression.png',
];

async function createScratch(t) {
  await mkdir(scratchRoot, { recursive: true });
  const directory = await mkdtemp(join(scratchRoot, 'veteran-atlas-test-'));
  t.after(async () => {
    const target = resolve(directory);
    if (!target.startsWith(`${resolve(scratchRoot)}${sep}`)) {
      throw new Error(`Refusing to remove unexpected test directory: ${target}`);
    }
    await rm(target, { recursive: true });
  });
  return directory;
}

async function sourcePng({ width = 1186, height = 1326, opaque = false } = {}) {
  const background = opaque ? '#ffffffff' : '#00000000';
  const base = sharp({ create: { width, height, channels: 4, background } });
  if (opaque || width < 600 || height < 1200) return base.png().toBuffer();
  const paw = await sharp({ create: {
    width: 110, height: 90, channels: 4, background: '#ff8844ff',
  } }).png().toBuffer();
  return base.composite([{ input: paw, left: 500, top: 1150 }]).png().toBuffer();
}

async function writeSources(sourceDir) {
  await mkdir(sourceDir, { recursive: true });
  for (const name of names) await writeFile(join(sourceDir, name), await sourcePng());
}

test('builds a deterministic six-slot transparent atlas and checks without writing', async (t) => {
  const directory = await createScratch(t);
  const sourceDir = join(directory, 'source');
  const destination = join(directory, 'atlas.png');
  await writeSources(sourceDir);

  assert.deepEqual(await buildVeteranAtlas({ sourceDir, destination }), {
    width: 2280, height: 425, slots: 6,
  });
  const original = await readFile(destination);
  const metadata = await sharp(original).metadata();
  assert.equal(metadata.width, 2280);
  assert.equal(metadata.height, 425);
  assert.equal(metadata.channels, 4);
  assert.equal(metadata.hasAlpha, true);
  await buildVeteranAtlas({ sourceDir, destination, checkOnly: true });
  assert.deepEqual(await readFile(destination), original);

  for (let slot = 0; slot < 6; slot += 1) {
    const { data, info } = await sharp(original)
      .extract({ left: slot * 380, top: 0, width: 380, height: 425 })
      .raw().toBuffer({ resolveWithObject: true });
    let bottom = -1;
    for (let y = 0; y < info.height; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        if (data[(y * info.width + x) * info.channels + 3] > 8) bottom = y;
      }
    }
    assert.equal(bottom, 415, `slot ${slot} foot baseline`);
  }

  await writeFile(destination, Buffer.from('different'));
  await assert.rejects(
    buildVeteranAtlas({ sourceDir, destination, checkOnly: true }),
    /differs from its sources/,
  );
  assert.deepEqual(await readFile(destination), Buffer.from('different'));
});

test('names a missing source and never creates an atlas', async (t) => {
  const directory = await createScratch(t);
  const sourceDir = join(directory, 'empty');
  const destination = join(directory, 'atlas.png');
  await mkdir(sourceDir);
  await assert.rejects(buildVeteranAtlas({ sourceDir, destination }), /frame-1\.png/);
  await assert.rejects(readFile(destination), { code: 'ENOENT' });
});

test('rejects invalid dimensions and opaque alpha before writing', async (t) => {
  const directory = await createScratch(t);
  const sourceDir = join(directory, 'source');
  const destination = join(directory, 'atlas.png');
  await writeSources(sourceDir);
  await writeFile(join(sourceDir, 'frame-3.png'), await sourcePng({ width: 32, height: 32 }));
  await assert.rejects(buildVeteranAtlas({ sourceDir, destination }), /frame-3\.png/);
  await assert.rejects(readFile(destination), { code: 'ENOENT' });

  await writeFile(join(sourceDir, 'frame-3.png'), await sourcePng());
  await writeFile(join(sourceDir, 'alarm-expression.png'), await sourcePng({ opaque: true }));
  await assert.rejects(buildVeteranAtlas({ sourceDir, destination }), /alarm-expression\.png/);
  await assert.rejects(readFile(destination), { code: 'ENOENT' });
});
