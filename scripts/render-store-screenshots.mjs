import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
export const manifestPath = resolve(root, 'store/screenshots/manifest.json');
export const frame = Object.freeze({ left: 284, top: 210, width: 2300, height: 1060 });
const expectedSources = [1, 5, 6, 3, 2];
const fontFiles = { bold: 'C:/Windows/Fonts/malgunbd.ttf', regular: 'C:/Windows/Fonts/malgun.ttf' };
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function safePath(path) {
  if (typeof path !== 'string' || !path.startsWith('store/screenshots/') || path.includes('\\')) {
    throw new Error('Screenshot paths must use the store/screenshots subtree.');
  }
  const result = resolve(root, path);
  const rel = relative(resolve(root, 'store/screenshots'), result);
  if (rel.startsWith('..') || isAbsolute(rel) || path.split('/').includes('..')) throw new Error('Unsafe screenshot path.');
  return result;
}

export function validateManifest(manifest) {
  if (manifest.schemaVersion !== 1 || manifest.status !== 'draft_awaiting_approval' || manifest.width !== 2868 || manifest.height !== 1320) {
    throw new Error('Expected unapproved 2868x1320 screenshot draft manifest.');
  }
  if (!Array.isArray(manifest.items) || manifest.items.length !== 5) throw new Error('Expected five privacy-screened screenshots.');
  safePath(manifest.background.path);
  if (!/^[a-f0-9]{64}$/.test(manifest.background.sha256)) throw new Error('Missing background hash.');
  const outputs = new Set();
  manifest.items.forEach((item, index) => {
    const expected = `store/screenshots/source/2026-09-30/photo-${expectedSources[index]}.jpg`;
    if (item.order !== index + 1 || item.source !== expected || item.sourceWidth !== 1280 || item.sourceHeight !== 590) {
      throw new Error('Incorrect screenshot order/source dimensions; ranking photo-4 is excluded.');
    }
    safePath(item.source);
    safePath(item.output);
    if (!/^store\/screenshots\/iphone-landscape\/drafts-v1\/\d{2}-[a-z]+\.png$/.test(item.output) || outputs.has(item.output)) {
      throw new Error('Output must be a unique draft PNG.');
    }
    if (!/^[a-f0-9]{64}$/.test(item.sourceSha256) || !/^[a-f0-9]{64}$/.test(item.sourceOriginalSha256)) throw new Error('Missing source hash.');
    for (const text of [item.title, item.subtitle]) {
      if (typeof text !== 'string' || !text.trim() || text.length > 80) throw new Error('Invalid caption.');
    }
    outputs.add(item.output);
  });
}

export function captureGeometry(item) {
  const width = frame.width;
  const height = Math.round(width * item.sourceHeight / item.sourceWidth);
  if (height > frame.height) throw new Error('Capture would leave its frame.');
  return { left: frame.left, top: frame.top, width, height };
}

async function readInputs() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  validateManifest(manifest);
  const background = await readFile(safePath(manifest.background.path));
  if (sha256(background) !== manifest.background.sha256) throw new Error('Background hash mismatch.');
  const captures = [];
  for (const item of manifest.items) {
    const bytes = await readFile(safePath(item.source));
    if (sha256(bytes) !== item.sourceSha256) throw new Error(`Source hash mismatch: ${item.source}`);
    const meta = await sharp(bytes).metadata();
    if (meta.format !== 'jpeg' || meta.width !== item.sourceWidth || meta.height !== item.sourceHeight || meta.exif || meta.iptc || meta.xmp || (meta.orientation && meta.orientation !== 1)) {
      throw new Error(`Source dimensions/orientation mismatch: ${item.source}`);
    }
    captures.push(bytes);
  }
  return { manifest, background, captures };
}

export async function resizeCapture(bytes, item) {
  const { width, height } = captureGeometry(item);
  return sharp(bytes).resize(width, height, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .toColourspace('srgb').removeAlpha().png().toBuffer();
}

const escapeMarkup = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

async function caption(text, bold, size, color) {
  const buffer = await sharp({ text: {
    text: `<span foreground="${color}">${escapeMarkup(text)}</span>`,
    font: `Malgun Gothic ${bold ? 'Bold ' : ''}${size}`, fontfile: bold ? fontFiles.bold : fontFiles.regular,
    rgba: true,
  } }).png().toBuffer();
  const meta = await sharp(buffer).metadata();
  if (meta.width > 2000 || meta.height > 82) throw new Error('Caption exceeds its clear headline region.');
  return buffer;
}

async function renderOne(inputs, index) {
  const { manifest, background, captures } = inputs;
  const item = manifest.items[index];
  const geometry = captureGeometry(item);
  const capture = await resizeCapture(captures[index], item);
  const border = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="2868" height="1320"><rect x="272" y="198" width="2324" height="1084" rx="20" fill="#ffffff"/><rect x="272" y="198" width="2324" height="1084" rx="20" fill="none" stroke="#e4ddd6" stroke-width="2"/></svg>`);
  const title = await caption(item.title, true, 64, '#303946');
  const subtitle = await caption(item.subtitle, false, 35, '#5d6975');
  return sharp(background).resize(manifest.width, manifest.height, { fit: 'cover' })
    .composite([
      { input: border, left: 0, top: 0 },
      { input: title, left: frame.left, top: 58 },
      { input: subtitle, left: frame.left, top: 140 },
      { input: capture, left: geometry.left, top: geometry.top },
    ]).flatten({ background: '#fff8ee' }).removeAlpha().toColourspace('srgb').png().toBuffer();
}

async function renderAll(inputs) {
  const results = [];
  for (let index = 0; index < inputs.manifest.items.length; index++) results.push(await renderOne(inputs, index));
  return results;
}

export async function verifyScreenshots() {
  const inputs = await readInputs();
  const expected = await renderAll(inputs);
  const errors = [];
  for (const [index, item] of inputs.manifest.items.entries()) {
    try {
      const actual = await readFile(safePath(item.output));
      const meta = await sharp(actual).metadata();
      if (meta.width !== 2868 || meta.height !== 1320 || meta.format !== 'png' || meta.channels !== 3 || meta.hasAlpha || meta.exif) {
        errors.push(`${item.order}: expected exact opaque RGB PNG without EXIF.`);
      }
      const actualPixels = await sharp(actual).raw().toBuffer();
      if (!actualPixels.equals(await sharp(expected[index]).raw().toBuffer())) errors.push(`${item.order}: draft pixels are stale.`);
      const geometry = captureGeometry(item);
      const region = await sharp(actual).extract(geometry).raw().toBuffer();
      const capture = await resizeCapture(inputs.captures[index], item);
      if (!region.equals(await sharp(capture).raw().toBuffer())) errors.push(`${item.order}: real screenshot pixels were altered.`);
    } catch (error) { errors.push(`${item.order}: ${error.message}`); }
  }
  return errors;
}

export async function renderScreenshots({ check = false } = {}) {
  if (!check) {
    const inputs = await readInputs();
    const outputs = await renderAll(inputs); // Validate/render every input before writing any output.
    for (const [index, item] of inputs.manifest.items.entries()) {
      const destination = safePath(item.output);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, outputs[index]);
    }
  }
  const errors = await verifyScreenshots();
  if (errors.length) throw new Error(errors.join('\n'));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 1 || args[0] !== '--check')) throw new Error('Usage: render-store-screenshots.mjs [--check]');
    await renderScreenshots({ check: args.length === 1 });
    console.log('5 drafts verified: 2868x1320 opaque RGB; input hashes and actual screenshot regions match. Approval/device QA pending.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
