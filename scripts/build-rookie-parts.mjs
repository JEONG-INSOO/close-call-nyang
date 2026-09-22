// Rebuilds the rookie's game-ready PNG parts from the generated green-screen sheets.
// Usage: node scripts/build-rookie-parts.mjs
// Sources live in docs/art/source; outputs go to assets/characters/rookie (committed).
// Every part is picked by its sorted index and checked against its expected size so a
// regenerated sheet with a different layout fails loudly instead of shipping the wrong part.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('../', import.meta.url));
const src = join(root, 'docs/art/source');
const work = join(root, 'output/rookie-parts');
const out = join(root, 'assets/characters/rookie');
mkdirSync(out, { recursive: true });

const SHEETS = {
  body: { file: 'rookie-body-sheet.webp', minArea: 400 },
  face: { file: 'rookie-face-sheet.webp', minArea: 150 },
  arm: { file: 'rookie-arm-sheet.png', minArea: 300 },
};
for (const [name, sheet] of Object.entries(SHEETS)) {
  const run = spawnSync(process.execPath, [join(root, 'scripts/split-art-sheet.mjs'), join(src, sheet.file), join(work, name), String(sheet.minArea)], { stdio: 'inherit' });
  if (run.status !== 0) throw new Error(`Splitting ${sheet.file} failed.`);
  sheet.parts = JSON.parse(readFileSync(join(work, name, 'manifest.json'), 'utf8')).parts;
}

// [sheet, 1-based index, expected width, expected height]
function pick(sheet, index, w, h) {
  const part = SHEETS[sheet].parts[index - 1];
  if (!part || Math.abs(part.w - w) > 2 || Math.abs(part.h - h) > 2) {
    throw new Error(`${sheet} part ${index} is ${part ? `${part.w}x${part.h}` : 'missing'}, expected ${w}x${h}. Re-map the parts for the new sheet.`);
  }
  return join(work, sheet, part.file);
}
const dataUrl = file => `data:image/png;base64,${readFileSync(file).toString('base64')}`;

const COPY = {
  'torso.png': pick('body', 4, 225, 282),
  'tail.png': pick('body', 5, 164, 114),
  'leg-far.png': pick('body', 7, 87, 180),
  'leg-near.png': pick('body', 8, 103, 185),
  'arm-up-left.png': pick('arm', 1, 114, 95),
  'arm-hang.png': pick('arm', 5, 68, 156),
  'arm-up-right.png': pick('arm', 6, 121, 93),
  'arm-coffee.png': pick('arm', 7, 153, 108),
};
const HEAD = pick('body', 1, 243, 214);
const F = {
  sweat: pick('face', 1, 52, 79),
  alarmBrowNear: pick('face', 2, 73, 35), alarmBrowFar: pick('face', 3, 73, 35),
  alarmEyeNear: pick('face', 8, 97, 98), alarmEyeFar: pick('face', 9, 97, 98),
  hurtEyeNear: pick('face', 10, 80, 62), hurtEyeFar: pick('face', 11, 80, 62),
  hurtBrowNear: pick('face', 6, 66, 38), hurtBrowFar: pick('face', 7, 66, 38),
  calmEyeNear: pick('face', 12, 100, 80), calmEyeFar: pick('face', 13, 100, 80),
  calmMouth: pick('face', 14, 91, 26), hurtMouth: pick('face', 15, 117, 45), alarmMouth: pick('face', 16, 44, 53),
};

// Face features in head-image pixels: [feature, centreX, centreY, scaleX, scaleY].
const FACES = {
  'face-calm.png': [['calmEyeNear', 104, 118, 0.6, 0.6], ['calmEyeFar', 199, 118, 0.5, 0.6], ['calmMouth', 158, 160, 0.5, 0.5]],
  'face-alarm.png': [['alarmEyeNear', 104, 116, 0.56, 0.56], ['alarmEyeFar', 199, 116, 0.47, 0.56],
    ['alarmBrowNear', 104, 84, 0.6, 0.6], ['alarmBrowFar', 200, 84, 0.44, 0.52], ['alarmMouth', 158, 166, 0.5, 0.5], ['sweat', 30, 60, 0.6, 0.6]],
  'face-hurt.png': [['hurtEyeNear', 106, 120, 0.55, 0.55], ['hurtEyeFar', 198, 120, 0.5, 0.55],
    ['hurtBrowNear', 104, 90, 0.5, 0.5], ['hurtBrowFar', 200, 90, 0.44, 0.5], ['hurtMouth', 158, 164, 0.46, 0.46]],
};

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const encoded = await page.evaluate(async ({ head, faces, features }) => {
    const load = async url => { const img = new Image(); img.src = url; await img.decode(); return img; };
    const toBase64 = async canvas => {
      const bytes = new Uint8Array(await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer());
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(bin);
    };
    const result = {};
    // Blank head: paint the baked-in "ω" mouth out of the white muzzle, keeping the pink nose.
    const headImg = await load(head);
    const hc = new OffscreenCanvas(headImg.width, headImg.height), hx = hc.getContext('2d');
    hx.drawImage(headImg, 0, 0);
    const d = hx.getImageData(0, 0, hc.width, hc.height), a = d.data, W = hc.width;
    for (let y = 146; y <= 172; y++) for (let x = 124; x <= 184; x++) {
      const i = (y * W + x) * 4, lum = (a[i] + a[i + 1] + a[i + 2]) / 3;
      const pinkNose = a[i] > 200 && a[i + 1] < 170 && y < 152;
      if (lum < 235 && !pinkNose) { a[i] = 255; a[i + 1] = 255; a[i + 2] = 255; }
    }
    hx.putImageData(d, 0, 0);
    result['head.png'] = await toBase64(hc);
    // Expressions are composited at 2x in head-image coordinates so they overlay the head exactly.
    const images = {};
    for (const [key, url] of Object.entries(features)) images[key] = await load(url);
    for (const [file, layout] of Object.entries(faces)) {
      const c = new OffscreenCanvas(headImg.width * 2, headImg.height * 2), x = c.getContext('2d');
      x.imageSmoothingQuality = 'high';
      for (const [key, cx, cy, sx, sy] of layout) {
        const img = images[key], w = img.width * sx, h = img.height * sy;
        x.drawImage(img, (cx - w / 2) * 2, (cy - h / 2) * 2, w * 2, h * 2);
      }
      result[file] = await toBase64(c);
    }
    return result;
  }, {
    head: dataUrl(HEAD), faces: FACES,
    features: Object.fromEntries(Object.entries(F).map(([key, file]) => [key, dataUrl(file)])),
  });
  for (const [file, png] of Object.entries(encoded)) writeFileSync(join(out, file), Buffer.from(png, 'base64'));
  for (const [file, from] of Object.entries(COPY)) writeFileSync(join(out, file), readFileSync(from));
  console.log(`Rookie parts written to ${out}: ${[...Object.keys(encoded), ...Object.keys(COPY)].join(', ')}`);
} finally {
  await browser.close();
}
