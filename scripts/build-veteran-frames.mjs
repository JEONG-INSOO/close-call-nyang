// Build the approved veteran cat's six animation poses into one game texture.
// Usage: node scripts/build-veteran-frames.mjs [--check]
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const defaultSourceDir = join(root, 'docs/art/source/veteran-mentor');
const defaultDestination = join(root, 'assets/characters/veteran/walk-atlas-v1.png');
const sourceNames = [
  'frame-1.png',
  'frame-2.png',
  'frame-3.png',
  'frame-4.png',
  'alarm-expression.png',
  'fall-expression.png',
];
const frameWidth = 380;
const frameHeight = 425;
const feetBaseline = 415;

async function prepareFrame(sourceDir, name) {
  const source = join(sourceDir, name);
  let metadata;
  try {
    metadata = await sharp(source).metadata();
  } catch (error) {
    throw new Error(`Cannot read veteran source ${name}: ${error.message}`, { cause: error });
  }
  if (metadata.format !== 'png' || metadata.width !== 1186 || metadata.height !== 1326 ||
      metadata.channels !== 4 || !metadata.hasAlpha) {
    throw new Error(`Invalid veteran source ${name}: expected 1186x1326 RGBA PNG with transparency`);
  }

  const alpha = await sharp(source).extractChannel(3).stats();
  if (alpha.channels[0].min !== 0 || alpha.channels[0].max === 0) {
    throw new Error(`Invalid veteran source ${name}: actual transparent and visible pixels required`);
  }

  const { data, info } = await sharp(source)
    .resize(frameWidth, frameHeight, { kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let firstVisibleRow = frameHeight;
  let lastVisibleRow = -1;
  for (let y = 0; y < frameHeight; y += 1) {
    for (let x = 0; x < frameWidth; x += 1) {
      if (data[(y * frameWidth + x) * info.channels + 3] > 8) {
        firstVisibleRow = Math.min(firstVisibleRow, y);
        lastVisibleRow = y;
      }
    }
  }
  if (lastVisibleRow < 0) throw new Error(`Empty resized veteran source ${name}`);
  const shift = feetBaseline - lastVisibleRow;
  if (firstVisibleRow + shift < 0 || lastVisibleRow + shift >= frameHeight) {
    throw new Error(`Cannot align veteran source ${name} to foot baseline`);
  }

  const resized = await sharp(data, { raw: info }).png().toBuffer();
  const cropped = shift === 0 ? resized : await sharp(resized).extract({
    left: 0,
    top: Math.max(0, -shift),
    width: frameWidth,
    height: frameHeight - Math.abs(shift),
  }).png().toBuffer();
  return sharp({ create: {
    width: frameWidth,
    height: frameHeight,
    channels: 4,
    background: '#00000000',
  } }).composite([{ input: cropped, left: 0, top: Math.max(0, shift) }]).png().toBuffer();
}

/**
 * @param {{ sourceDir?: string, destination?: string, checkOnly?: boolean }} options
 * @returns {Promise<{ width: 2280, height: 425, slots: 6 }>}
 */
export async function buildVeteranAtlas({
  sourceDir = defaultSourceDir,
  destination = defaultDestination,
  checkOnly = false,
} = {}) {
  const frames = [];
  for (const name of sourceNames) frames.push(await prepareFrame(sourceDir, name));
  const atlas = await sharp({ create: {
    width: frameWidth * sourceNames.length,
    height: frameHeight,
    channels: 4,
    background: '#00000000',
  } }).composite(frames.map((input, index) => ({
    input,
    left: index * frameWidth,
    top: 0,
  }))).png().toBuffer();

  if (checkOnly) {
    let actual;
    try {
      actual = await readFile(destination);
    } catch (error) {
      throw new Error(`Cannot check veteran atlas ${destination}: ${error.message}`, { cause: error });
    }
    if (!actual.equals(atlas)) throw new Error(`Veteran atlas differs from its sources: ${destination}`);
  } else {
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, atlas);
  }
  return { width: 2280, height: 425, slots: 6 };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    console.error('Usage: node scripts/build-veteran-frames.mjs [--check]');
    process.exitCode = 1;
  } else {
    buildVeteranAtlas({ checkOnly: args[0] === '--check' })
      .then(({ width, height, slots }) => console.log(`Veteran atlas ${slots} slots: ${width}x${height}`))
      .catch((error) => { console.error(error.message); process.exitCode = 1; });
  }
}
