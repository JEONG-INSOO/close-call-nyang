import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyPublicPages, PUBLIC_PAGE_NAMES, validatePublicPage, validatePublicOutputRoot } from './public-pages.mjs';
import { verifyWeb } from './verify-web.mjs';

const workspace = fileURLToPath(new URL('../', import.meta.url));
const page = name => readFile(resolve(workspace, 'web-static', name, 'index.html'), 'utf8');

test('both source pages provide bilingual contact, deletion and safe links', async () => {
  for (const name of PUBLIC_PAGE_NAMES) validatePublicPage(await page(name), name);
});

const mutations = [
  ['missing English', html => html.replace('id="en" lang="en"', 'id="en" lang="ko"'), /bilingual/],
  ['missing contact', html => html.replaceAll('mailto:mocca3232@naver.com', 'mailto:placeholder@example.com'), /contact/],
  ['missing deletion', html => html.replaceAll('온라인 프로필과 기록 삭제', '삭제'), /deletion/],
  ['wrong Pages base', html => html.replaceAll('/close-call-nyang/privacy/', '/privacy/'), /cross-link/],
  ['wrong home link', html => html.replace('href="/close-call-nyang/"', 'href="/"'), /Pages link/],
  ['missing language target', html => html.replace('href="#en"', 'href="#english"'), /anchor/],
  ['embedded script', html => html.replace('</body>', '<script>alert(1)</script></body>'), /active/],
  ['inline event', html => html.replace('<body>', '<body onload="bad()">'), /active/],
  ['tracking CSS', html => html.replace('</style>', 'body{background:url(https://tracker.example/pixel)}</style>'), /embedded/],
  ['secret key', html => html.replace('</body>', 'sb_secret_test123456789</body>'), /credential/],
  ['JWT', html => html.replace('</body>', 'eyJ1234567890.encoded.signature</body>'), /credential/],
  ['private identifier', html => html.replace('</body>', '00000000-1111-2222-3333-444444444444</body>'), /identifier/],
  ['confidential config', html => html.replace('</body>', 'SUPABASE_SERVICE_ROLE_KEY</body>'), /configuration/],
  ['unexpected external link', html => html.replace('</body>', '<a href="https://tracker.example">x</a></body>'), /external link/],
  ['single-quoted active link', html => html.replace('</body>', "<a href='javascript:alert(1)'>x</a></body>"), /external link/],
  ['unquoted link', html => html.replace('</body>', '<a href=javascript:alert(1)>x</a></body>'), /quoted/],
  ['tracking pixel', html => html.replace('</body>', '<img src="https://tracker.example/pixel">'), /embedded/],
  ['CSS import', html => html.replace('</style>', '@import "https://tracker.example/style";</style>'), /embedded/],
];
for (const [name, mutate, expected] of mutations) {
  test(`public page validation rejects ${name}`, async () => {
    const html = await page('support');
    assert.throws(() => validatePublicPage(mutate(html), 'support'), expected);
  });
}

test('public page copying is repeatable and does not remove existing export files', async () => {
  await mkdir(resolve(workspace, 'output'), { recursive: true });
  const dir = await mkdtemp(resolve(workspace, 'output', 'public-pages-test-'));
  try {
    await writeFile(join(dir, 'index.html'), '<html>game export</html>');
    await writeFile(join(dir, 'keep.txt'), 'preserve');
    assert.deepEqual(await copyPublicPages({ outputRoot: dir }), ['/close-call-nyang/support/', '/close-call-nyang/privacy/']);
    await copyPublicPages({ outputRoot: dir });
    for (const name of PUBLIC_PAGE_NAMES) assert.equal(await readFile(join(dir, name, 'index.html'), 'utf8'), await page(name));
    assert.equal(await readFile(join(dir, 'keep.txt'), 'utf8'), 'preserve');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('copying refuses broad/outside outputs, wrong base, and an incomplete export', async () => {
  for (const target of [workspace, resolve(workspace, '..'), resolve(workspace, 'output'), tmpdir(), resolve(workspace, 'output', '..', 'src')]) {
    await assert.rejects(validatePublicOutputRoot(target), /output must/);
  }
  await assert.rejects(validatePublicOutputRoot(resolve(workspace, 'dist'), '/'), /output must/);
  const dir = await mkdtemp(resolve(workspace, 'output', 'public-pages-missing-'));
  try { await assert.rejects(copyPublicPages({ outputRoot: dir }), /ENOENT/); }
  finally { await rm(dir, { recursive: true, force: true }); }
});

test('verifier refuses missing documents, game fallback and unsafe policy content', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nyang-web-policy-'));
  try {
    const html = '<html><link rel="icon" href="/close-call-nyang/favicon.png"><script src="/close-call-nyang/app.js"></script></html>';
    await writeFile(join(dir, 'index.html'), html);
    await writeFile(join(dir, 'app.js'), 'console.log("game fixture")');
    await writeFile(join(dir, 'favicon.png'), await readFile(resolve(workspace, 'assets/branding/favicon.png')));
    await assert.rejects(verifyWeb(dir), /ENOENT/);
    for (const name of PUBLIC_PAGE_NAMES) {
      await mkdir(join(dir, name));
      await writeFile(join(dir, name, 'index.html'), await page(name));
    }
    assert.equal((await verifyWeb(dir)).status, 'passed');
    await writeFile(join(dir, 'privacy/index.html'), html);
    await assert.rejects(verifyWeb(dir), /fallback/);
    await writeFile(join(dir, 'privacy/index.html'), (await page('privacy')) + 'sb_secret_fake123');
    await assert.rejects(verifyWeb(dir), /credential/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
