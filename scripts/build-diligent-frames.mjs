// Aligns the two approved ragdoll poses to the same transparent canvas/feet baseline.
// Usage: node scripts/build-diligent-frames.mjs [--check]
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = join(root, 'docs/art/source/diligent-walk-sheet.png');
const target = join(root, 'assets/characters/diligent');
const outputNames = ['step-a.png', 'step-b.png'];
const canvas = { width: 760, height: 850, baseline: 830 };
// The rendered cat is at most ~267 CSS pixels tall on desktop; halve texture dimensions
// to avoid decoding two unnecessarily large 760×850 RGBA textures on a phone.
const outputSize = { width: 380, height: 425 };
const checkOnly = process.argv.includes('--check');

const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
if (info.width % 2 !== 0 || info.width < 1200 || info.height < 700 || info.channels !== 4) {
  throw new Error(`Unexpected sheet layout: ${info.width}x${info.height}x${info.channels}`);
}
const halfWidth = info.width / 2;

function bounds(half) {
  const box = { left: halfWidth, top: info.height, right: -1, bottom: -1 };
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < halfWidth; x++) {
      const alpha = data[(y * info.width + half * halfWidth + x) * 4 + 3];
      if (alpha <= 1) continue;
      box.left = Math.min(box.left, x);
      box.top = Math.min(box.top, y);
      box.right = Math.max(box.right, x);
      box.bottom = Math.max(box.bottom, y);
    }
  }
  if (box.right < box.left) throw new Error(`No artwork in frame ${half}`);
  return box;
}

const boxes = [bounds(0), bounds(1)];
for (let half = 0; half < 2; half++) {
  const box = boxes[half];
  const width = box.right - box.left + 1;
  const height = box.bottom - box.top + 1;
  if (width < 500 || height < 700 || width > canvas.width - 16 || height > canvas.baseline - 16) {
    throw new Error(`Unexpected character bounds in frame ${half}: ${JSON.stringify(box)}`);
  }
  const pad = 4;
  const crop = {
    left: half * halfWidth + box.left - pad,
    top: box.top - pad,
    width: width + 2 * pad,
    height: height + 2 * pad,
  };
  if (crop.left < half * halfWidth || crop.left + crop.width > (half + 1) * halfWidth) {
    throw new Error(`Frame ${half} touches the vertical split`);
  }
  const isolated = await sharp(source).extract(crop).png().toBuffer();
  const left = Math.round((canvas.width - crop.width) / 2);
  const top = canvas.baseline - pad - height;
  const fullSize = await sharp({
    create: { width: canvas.width, height: canvas.height, channels: 4, background: '#00000000' },
  }).composite([{ input: isolated, left, top }]).png().toBuffer();
  const output = await sharp(fullSize).resize(outputSize.width, outputSize.height, {
    kernel: sharp.kernel.lanczos3,
  }).png().toBuffer();
  const destination = join(target, outputNames[half]);
  if (checkOnly) {
    const actual = await readFile(destination);
    if (!actual.equals(output)) throw new Error(`${outputNames[half]} differs from the approved sheet; rebuild it`);
  } else {
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, output);
  }
  console.log(`${outputNames[half]}: ${outputSize.width}x${outputSize.height}, source bounds ${JSON.stringify(box)}, feet y=${canvas.baseline / 2}`);
}
if (Math.abs(boxes[0].bottom - boxes[1].bottom) > 6) {
  throw new Error('The two walk poses do not share a usable feet baseline');
}
console.log(checkOnly ? 'Diligent frames match source.' : 'Diligent frames built.');
