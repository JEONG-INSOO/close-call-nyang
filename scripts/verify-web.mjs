import { readFile, readdir, lstat } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

export async function verifyFavicon(bytes) {
  if (bytes.length >= 6 && bytes.readUInt16LE(0) === 0 && bytes.readUInt16LE(2) === 1) {
    // Expo converts source PNG to ICO containing bottom-up BGRA DIB frames.
    const count = bytes.readUInt16LE(4);
    if (!count || bytes.length < 6 + count * 16) throw new Error('Invalid ICO directory');
    let frame48 = false;
    for (let i = 0; i < count; i++) {
      const entry = 6 + i * 16;
      const width = bytes[entry] || 256, height = bytes[entry + 1] || 256;
      const size = bytes.readUInt32LE(entry + 8), offset = bytes.readUInt32LE(entry + 12);
      if (offset < 6 + count * 16 || offset + size > bytes.length || size < 40) throw new Error('Truncated ICO frame');
      const frame = bytes.subarray(offset, offset + size);
      const pixelsEnd = 40 + width * height * 4;
      // Expo's 32-bit encoder omits the legacy AND mask; alpha carries opacity.
      if (frame.readUInt32LE(0) !== 40 || frame.readInt32LE(4) !== width || frame.readInt32LE(8) !== height * 2 || frame.readUInt16LE(12) !== 1 || frame.readUInt16LE(14) !== 32 || frame.readUInt32LE(16) !== 0 || (size !== pixelsEnd && size !== pixelsEnd + Math.ceil(width / 32) * 4 * height)) throw new Error('Unsupported ICO frame');
      for (let pixel = 43; pixel < 40 + width * height * 4; pixel += 4) if (frame[pixel] !== 255) throw new Error('ICO frame contains transparency');
      const mask = frame.subarray(40 + width * height * 4);
      if (mask.some(value => value !== 0)) throw new Error('ICO transparency mask is not opaque');
      if (width === 48 && height === 48) frame48 = true;
    }
    if (!frame48) throw new Error('ICO missing 48px frame');
    return 'ICO with opaque 48px frame';
  }
  const meta = await sharp(bytes).metadata();
  if (meta.format !== 'png' || meta.width !== 48 || meta.height !== 48 || meta.hasAlpha) throw new Error('Favicon must be opaque 48px PNG or Expo ICO');
  return '48px opaque PNG';
}

// Static export validation only; does not claim public deployment or browser QA.
export async function verifyWeb(directory = 'dist') {
  const root = resolve(directory);
  const html = await readFile(resolve(root, 'index.html'), 'utf8');
  const local = async url => {
    const pathname = decodeURIComponent(url.split(/[?#]/)[0]);
    if (!pathname.startsWith('/close-call-nyang/')) throw new Error('Asset missing Pages base path');
    const path = resolve(root, pathname.slice('/close-call-nyang/'.length));
    const rel = relative(root, path);
    if (!rel || rel.startsWith(`..${sep}`) || rel === '..' || pathname.includes('\\')) throw new Error('Invalid export asset path');
    const stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink() || !stat.size) throw new Error('Missing or empty export asset');
    return path;
  };
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(match => match[1]);
  if (!scripts.length) throw new Error('No bundled JavaScript');
  let bundledAssets = 0;
  for (const url of scripts) {
    const content = await readFile(await local(url), 'utf8');
    if (content.trimStart().startsWith('<') || content.length < 10) throw new Error('JavaScript contains an HTML fallback or empty content');
    for (const match of content.matchAll(/["'](\/close-call-nyang\/assets\/[^"']+)["']/g)) {
      await local(match[1]); bundledAssets++;
    }
  }
  const icon = [...html.matchAll(/<link\b[^>]*>/gi)].find(match => /\brel=["'](?:shortcut )?icon["']/i.test(match[0]))?.[0];
  const href = icon?.match(/\bhref=["']([^"']+)["']/i)?.[1];
  if (!href) throw new Error('Favicon link missing');
  const favicon = await verifyFavicon(await readFile(await local(href)));
  const policyPages = {};
  const names = await readdir(root);
  for (const name of ['privacy', 'support']) {
    if (!names.includes(name)) { policyPages[name] = 'pending (not in export)'; continue; }
    const text = await readFile(await local(`/close-call-nyang/${name}/index.html`), 'utf8');
    if (!/<html\b/i.test(text) || text === html) throw new Error(`${name} must be an actual document, not the game fallback`);
    policyPages[name] = 'present; content approval still required';
  }
  return { status: 'passed', scripts: scripts.length, bundledAssets, favicon, policyPages,
    limitation: 'Static files only. No public URL, native device or legal-content approval verified.' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 2 || args[0] !== '--dist')) throw new Error('Usage: verify-web.mjs [--dist directory]');
    console.log(JSON.stringify(await verifyWeb(args[1] ?? 'dist'), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
