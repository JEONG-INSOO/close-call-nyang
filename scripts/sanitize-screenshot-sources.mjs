import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { manifestPath, safePath, sha256 } from './render-store-screenshots.mjs';

// Preserve compressed image data and ICC/Adobe colour information; strip private metadata without JPEG recompression.
export function stripPrivateJpegMetadata(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Expected JPEG SOI.');
  const kept = [bytes.subarray(0, 2)];
  let offset = 2;
  while (offset < bytes.length) {
    const start = offset;
    if (bytes[offset++] !== 0xff) throw new Error('Expected JPEG marker.');
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xda || marker === 0xd9) {
      kept.push(bytes.subarray(start));
      return Buffer.concat(kept);
    }
    if (offset + 2 > bytes.length) throw new Error('Truncated JPEG segment.');
    const size = bytes.readUInt16BE(offset);
    if (size < 2 || offset + size > bytes.length) throw new Error('Invalid JPEG segment size.');
    offset += size;
    if (![0xe1, 0xed, 0xfe].includes(marker)) kept.push(bytes.subarray(start, offset));
  }
  throw new Error('JPEG has no scan.');
}

async function sanitizeSources() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const results = [];
  for (const item of manifest.items) {
    const original = await readFile(safePath(item.source));
    if (sha256(original) !== item.sourceSha256) throw new Error('Unexpected source bytes.');
    const sanitized = stripPrivateJpegMetadata(original);
    const before = await sharp(original).raw().toBuffer();
    const after = await sharp(sanitized).raw().toBuffer();
    if (!before.equals(after)) throw new Error('Removing metadata changed image pixels.');
    const meta = await sharp(sanitized).metadata();
    if (meta.exif || meta.iptc || meta.xmp) throw new Error('Private metadata remains.');
    results.push({ item, sanitized, originalHash: item.sourceOriginalSha256 ?? sha256(original) });
  }
  for (const { item, sanitized, originalHash } of results) {
    await writeFile(safePath(item.source), sanitized);
    item.sourceOriginalSha256 = originalHash;
    item.sourceSha256 = sha256(sanitized);
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log('5 source JPEGs sanitized without recompression; decoded pixels unchanged; EXIF/IPTC/XMP absent.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await sanitizeSources(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
