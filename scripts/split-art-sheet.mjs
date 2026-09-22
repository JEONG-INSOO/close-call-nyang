// Local art tool: chroma-key a green-screen parts sheet and split it into one PNG per part.
// Usage: node scripts/split-art-sheet.mjs <sheet.(png|webp)> <outDir> [minArea=400]
// Decoding/encoding runs in the installed Playwright Chromium so WebP input needs no extra package.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from '@playwright/test';

const [src, outDir, minAreaArg] = process.argv.slice(2);
if (!src || !outDir) {
  console.error('Usage: node scripts/split-art-sheet.mjs <sheet> <outDir> [minArea]');
  process.exit(2);
}
const mime = extname(src).toLowerCase() === '.webp' ? 'image/webp' : 'image/png';
const dataUrl = `data:${mime};base64,${readFileSync(src).toString('base64')}`;
// Start clean so stale part files from an earlier sheet never survive a rerun.
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const parts = await page.evaluate(async ({ dataUrl, minArea }) => {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const w = img.naturalWidth, h = img.naturalHeight;
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;
    // Greenness: how much G exceeds the larger of R/B. Soft ramp gives anti-aliased edges.
    const alpha = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
      const green = g - Math.max(r, b);
      const a = green > 90 ? 0 : green < 30 ? 1 : 1 - (green - 30) / 60;
      alpha[i] = a;
      if (a > 0 && green > 0) {
        // Despill: pull green down to the other channels on fringe pixels.
        px[i * 4 + 1] = Math.min(g, Math.max(r, b) + 8);
      }
      px[i * 4 + 3] = Math.round(a * 255);
    }
    // Connected components on the solid mask, dilated by 3px so whiskers stay with the head.
    const solid = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) solid[i] = alpha[i] > 0.5 ? 1 : 0;
    const R = 3, grown = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!solid[y * w + x]) continue;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h) grown[ny * w + nx] = 1;
      }
    }
    const label = new Int32Array(w * h);
    const boxes = [];
    let next = 0;
    const stack = [];
    for (let start = 0; start < w * h; start++) {
      if (!grown[start] || label[start]) continue;
      next++;
      let minX = w, minY = h, maxX = 0, maxY = 0, area = 0;
      stack.push(start); label[start] = next;
      while (stack.length) {
        const i = stack.pop(), x = i % w, y = (i / w) | 0;
        if (solid[i]) { area++; if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y; }
        for (const n of [i - 1, i + 1, i - w, i + w]) {
          if (n < 0 || n >= w * h || label[n] || !grown[n]) continue;
          if ((n === i - 1 && x === 0) || (n === i + 1 && x === w - 1)) continue;
          label[n] = next; stack.push(n);
        }
      }
      if (area >= minArea) boxes.push({ id: next, minX, minY, maxX, maxY, area });
    }
    ctx.putImageData(data, 0, 0);
    const out = [];
    for (const b of boxes) {
      const pad = 2, x0 = Math.max(0, b.minX - pad), y0 = Math.max(0, b.minY - pad);
      const cw = Math.min(w, b.maxX + pad + 1) - x0, ch = Math.min(h, b.maxY + pad + 1) - y0;
      const crop = new OffscreenCanvas(cw, ch);
      const cctx = crop.getContext('2d');
      const piece = ctx.getImageData(x0, y0, cw, ch);
      // Keep only pixels that belong to this component (neighbours may intrude into the box).
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
        if (label[(y0 + y) * w + (x0 + x)] !== b.id) piece.data[(y * cw + x) * 4 + 3] = 0;
      }
      cctx.putImageData(piece, 0, 0);
      const blob = await crop.convertToBlob({ type: 'image/png' });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      out.push({ x: x0, y: y0, w: cw, h: ch, area: b.area, png: btoa(bin) });
    }
    return { width: w, height: h, parts: out };
  }, { dataUrl, minArea: Number(minAreaArg ?? 400) });

  parts.parts.sort((a, b) => (a.y + a.h / 2) - (b.y + b.h / 2) || a.x - b.x);
  const manifest = parts.parts.map((p, index) => {
    const file = `part-${String(index + 1).padStart(2, '0')}.png`;
    writeFileSync(join(outDir, file), Buffer.from(p.png, 'base64'));
    return { file, x: p.x, y: p.y, w: p.w, h: p.h, area: p.area };
  });
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify({ source: src, width: parts.width, height: parts.height, parts: manifest }, null, 2));
  console.log(`${parts.width}x${parts.height} -> ${manifest.length} parts`);
  for (const m of manifest) console.log(`${m.file} at (${m.x},${m.y}) ${m.w}x${m.h} area ${m.area}`);
} finally {
  await browser.close();
}
