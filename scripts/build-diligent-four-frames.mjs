// Prepare the four user-supplied walking poses on one transparent game canvas.
// Usage: node scripts/build-diligent-four-frames.mjs [--check]
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourceDir = join(root, 'docs/art/source/diligent-four-frame');
const targetDir = join(root, 'assets/characters/diligent');
const checkOnly = process.argv.includes('--check');
const width = 380;
const height = 425;
const offsetY = 10;

async function buildFrame(sourceName, outputName) {
  const source = join(sourceDir, sourceName);
  const metadata = await sharp(source).metadata();
  if (metadata.width !== 1186 || metadata.height !== 1326 || !metadata.hasAlpha) {
    throw new Error(`Unexpected diligent source ${sourceName}: ${metadata.width}x${metadata.height}, alpha=${metadata.hasAlpha}`);
  }
  // The bottom ten pixels of the square input are empty; shift the art down so
  // the stepping paws land near the renderer's existing y=415 anchor.
  const resized = await sharp(source).resize(width, height, { kernel: sharp.kernel.lanczos3 })
    .extract({ left: 0, top: 0, width, height: height - offsetY }).png().toBuffer();
  const output = await sharp({ create: { width, height, channels: 4, background: '#00000000' } })
    .composite([{ input: resized, left: 0, top: offsetY }]).png().toBuffer();
  const destination = join(targetDir, outputName);
  if (checkOnly) {
    const actual = await readFile(destination);
    if (!actual.equals(output)) throw new Error(`${outputName} differs from its source`);
  } else {
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, output);
  }
  console.log(`${outputName}: ${width}x${height}`);
  return output;
}

const frames = [];
for (let index = 1; index <= 4; index++) {
  frames.push(await buildFrame(`frame-${index}.png`, `step-${index}-v3.png`));
}
const alarm = await buildFrame('alarm-expression.png', 'alarm-v3.png');
const fall = await buildFrame('fall-expression.png', 'fall-v3.png');
// Playback order is 1, 2, 4, 3. A single texture replaces six overlapping
// full-body SVG images and their opacity worklets on the hot animation path.
const ordered = [frames[0], frames[1], frames[3], frames[2], alarm, fall];
const atlas = await sharp({ create: { width: width * ordered.length, height, channels: 4, background: '#00000000' } })
  .composite(ordered.map((input, index) => ({ input, left: index * width, top: 0 })))
  .png().toBuffer();
const atlasDestination = join(targetDir, 'walk-atlas-v4.png');
if (checkOnly) {
  const actual = await readFile(atlasDestination);
  if (!actual.equals(atlas)) throw new Error('walk-atlas-v4.png differs from its sources');
} else {
  await writeFile(atlasDestination, atlas);
}
console.log(`walk-atlas-v4.png: ${width * ordered.length}x${height}`);
