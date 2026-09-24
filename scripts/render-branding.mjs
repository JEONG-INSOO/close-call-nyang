import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
export const brandingAssets = [1024, 48].map(size => ({
  source: resolve(root, 'assets/branding/icon.svg'),
  destination: resolve(root, `assets/branding/${size === 1024 ? 'icon' : 'favicon'}.png`),
  width: size, height: size, opaque: true,
}));

export function validateSvg(source) {
  if (!/viewBox="0 0 1024 1024"/.test(source) || /<(?:script|image|text|foreignObject|style)\b|\bon\w+\s*=|(?:href|url\s*\(|<!DOCTYPE|<!ENTITY)/i.test(source)) {
    throw new Error('Branding source must be a self-contained shape-only 1024 SVG.');
  }
}

async function render(asset) {
  const source = await readFile(asset.source, 'utf8');
  validateSvg(source);
  return sharp(Buffer.from(source)).resize(asset.width, asset.height)
    .flatten({ background: '#d9eee8' }).removeAlpha().toColourspace('srgb').png().toBuffer();
}

export async function renderBranding(assets = brandingAssets) {
  // Render all outputs before writing either one, so invalid source cannot replace a valid asset.
  const buffers = await Promise.all(assets.map(render));
  for (const [index, asset] of assets.entries()) {
    await mkdir(dirname(asset.destination), { recursive: true });
    await writeFile(asset.destination, buffers[index]);
  }
}

export async function verifyBranding(assets = brandingAssets) {
  const errors = [];
  for (const asset of assets) {
    try {
      const actual = await readFile(asset.destination);
      const meta = await sharp(actual).metadata();
      if (meta.format !== 'png' || meta.width !== asset.width || meta.height !== asset.height || meta.channels !== 3 || meta.hasAlpha) {
        errors.push(`${asset.width}px: expected opaque RGB PNG with exact dimensions`);
      }
      const expectedPixels = await sharp(await render(asset)).raw().toBuffer();
      if (!(await sharp(actual).raw().toBuffer()).equals(expectedPixels)) errors.push(`${asset.width}px: stale pixels; rerun branding:render`);
    } catch (error) { errors.push(`${asset.width}px: ${error.message}`); }
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 1 || args[0] !== '--check')) throw new Error('Usage: render-branding.mjs [--check]');
    if (!args.length) await renderBranding();
    const errors = await verifyBranding();
    if (errors.length) throw new Error(errors.join('\n'));
    console.log('Branding: 1024px / 48px source-matched opaque RGB PNGs verified.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
