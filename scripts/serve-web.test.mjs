import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { request } from 'node:http';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { createStaticServer, parseServeArgs } from './serve-web.mjs';

let temporaryRoot;
let directory;
let outside;
let server;
let port;
const BASE = '/close-call-nyang';
const HTML = '<!doctype html><title>Nyang production fixture</title>';

async function listen(instance) {
  await new Promise((accept, reject) => {
    instance.once('error', reject);
    instance.listen(0, '127.0.0.1', accept);
  });
  assert.equal(instance.address().address, '127.0.0.1');
  return instance.address().port;
}

function close(instance) {
  return new Promise((accept, reject) => instance.close(error => error ? reject(error) : accept()));
}

function fetchRaw(path, method = 'GET', targetPort = port) {
  return new Promise((accept, reject) => {
    const req = request({ hostname: '127.0.0.1', port: targetPort, path, method }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => accept({ status: response.statusCode, headers: response.headers,
        body: Buffer.concat(chunks).toString('utf8') }));
      response.on('error', reject);
    });
    req.setTimeout(5000, () => req.destroy(new Error('Test HTTP request timed out.')));
    req.on('error', reject);
    req.end();
  });
}

before(async () => {
  temporaryRoot = await mkdtemp(join(tmpdir(), 'close-call-nyang-web-'));
  directory = join(temporaryRoot, 'dist');
  outside = join(temporaryRoot, 'outside');
  await mkdir(directory);
  await mkdir(outside);
  await mkdir(join(directory, 'assets'));
  await mkdir(join(directory, 'support'));
  const files = {
    'index.html': HTML,
    'support/index.html': '<!doctype html><title>Support</title>',
    'assets/app.js': 'globalThis.nyangFixture = true;',
    'assets/app.mjs': 'export const name = "nyang";',
    'assets/app.css': 'body { margin: 0; }',
    'assets/icon.svg': '<svg xmlns="http://www.w3.org/2000/svg" />',
    'assets/music.wav': 'RIFFfixtureWAVE',
    'assets/café.wav': 'RIFFunicodeWAVE',
    'assets/font.woff': 'font-fixture',
    'assets/font.woff2': 'font-fixture-2',
    'assets/font.ttf': 'font-fixture-ttf',
    'assets/font.otf': 'font-fixture-otf',
    'assets/module.wasm': 'wasm-fixture',
    'assets/data.json': '{"fixture":true}',
    'assets/unknown.bin': 'binary-fixture',
    'assets/space name.txt': 'spaced filename',
  };
  await Promise.all(Object.entries(files).map(([name, contents]) => writeFile(join(directory, name), contents)));
  await writeFile(join(outside, 'secret.txt'), 'must not escape the explicit root');
  await symlink(outside, join(directory, 'outside-link'), process.platform === 'win32' ? 'junction' : 'dir');
  await symlink(join(directory, 'support'), join(directory, 'inside-link'), process.platform === 'win32' ? 'junction' : 'dir');
  server = await createStaticServer({ directory, base: BASE });
  port = await listen(server);
});

after(async () => {
  if (server) await close(server);
  if (temporaryRoot) {
    // Only remove the exact mkdtemp directory owned by this suite, never a broad temp root.
    const resolved = resolve(temporaryRoot);
    assert.equal(dirname(resolved), resolve(tmpdir()));
    assert.ok(basename(resolved).startsWith('close-call-nyang-web-'));
    await rm(resolved, { recursive: true, force: true });
  }
});

test('CLI options preserve defaults and resolve an explicit fixture root', () => {
  assert.deepEqual(parseServeArgs([], temporaryRoot), {
    port: 4173, base: BASE, directory: join(temporaryRoot, 'dist'),
  });
  assert.deepEqual(parseServeArgs(['--port', '4174', '--base', '/fixtures/', '--dir', 'output/qa-fixtures'], temporaryRoot), {
    port: 4174, base: '/fixtures', directory: resolve(temporaryRoot, 'output/qa-fixtures'),
  });
  assert.equal(parseServeArgs(['--dir', directory], temporaryRoot).directory, directory);
  assert.equal(parseServeArgs(['--base', '/'], temporaryRoot).base, '/');
});

test('invalid, duplicate and incomplete options are rejected', () => {
  for (const args of [
    ['--port', '0'], ['--port', '65536'], ['--port', '-1'], ['--port', '4.5'],
    ['--port', 'NaN'], ['--port', ''], ['--port'], ['--port=4173'],
    ['--base', 'relative'], ['--base', '/bad/../escape'], ['--base', '/encoded%2fpath'],
    ['--base', '//fixtures'], ['--base', '/fixtures?query'], ['--base'],
    ['--dir'], ['--dir', ''], ['--dir', '\0'], ['--unknown', 'value'],
    ['--port', '4173', '--port', '4174'],
  ]) assert.throws(() => parseServeArgs(args, temporaryRoot), undefined, JSON.stringify(args));
});

test('the base landing page redirects only its exact prefix and serves real index HTML', async () => {
  const redirect = await fetchRaw(BASE);
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.location, `${BASE}/`);
  const response = await fetchRaw(`${BASE}/`);
  assert.equal(response.status, 200);
  assert.equal(response.body, HTML);
  assert.equal(response.headers['content-type'], 'text/html; charset=utf-8');
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal((await fetchRaw(`${BASE}-other/`)).status, 404);
  assert.equal((await fetchRaw('/')).status, 404);
});

test('JavaScript, audio, SVG, WebAssembly and fonts retain their resource MIME types', async () => {
  const expected = {
    'app.js': 'text/javascript; charset=utf-8', 'app.mjs': 'text/javascript; charset=utf-8',
    'app.css': 'text/css; charset=utf-8', 'icon.svg': 'image/svg+xml',
    'music.wav': 'audio/wav', 'module.wasm': 'application/wasm',
    'font.woff': 'font/woff', 'font.woff2': 'font/woff2', 'font.ttf': 'font/ttf', 'font.otf': 'font/otf',
    'data.json': 'application/json; charset=utf-8', 'unknown.bin': 'application/octet-stream',
  };
  for (const [name, contentType] of Object.entries(expected)) {
    const response = await fetchRaw(`${BASE}/assets/${name}`);
    assert.equal(response.status, 200, name);
    assert.equal(response.headers['content-type'], contentType, name);
    assert.equal(Number(response.headers['content-length']), Buffer.byteLength(response.body));
    assert.notEqual(response.body, HTML);
  }
});

test('missing assets and nonexistent routes are 404, never a successful HTML fallback', async () => {
  for (const path of ['/assets/missing.js', '/assets/missing.wav', '/unknown-route', '/missing/']) {
    const response = await fetchRaw(`${BASE}${path}`);
    assert.equal(response.status, 404, path);
    assert.equal(response.headers['content-type'], 'text/plain; charset=utf-8');
    assert.equal(response.body, 'Not Found\n');
  }
});

test('HEAD returns actual content headers with no response body; unsupported methods fail', async () => {
  const head = await fetchRaw(`${BASE}/index.html`, 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.headers['content-type'], 'text/html; charset=utf-8');
  assert.equal(Number(head.headers['content-length']), Buffer.byteLength(HTML));
  assert.equal(head.body, '');
  assert.equal((await fetchRaw(`${BASE}/missing.js`, 'HEAD')).body, '');
  const post = await fetchRaw(`${BASE}/`, 'POST');
  assert.equal(post.status, 405);
  assert.equal(post.headers.allow, 'GET, HEAD');
});

test('decoding supports actual Unicode/spaces and ignores query values', async () => {
  assert.equal((await fetchRaw(`${BASE}/assets/caf%C3%A9.wav`)).body, 'RIFFunicodeWAVE');
  assert.equal((await fetchRaw(`${BASE}/assets/space%20name.txt`)).body, 'spaced filename');
  assert.equal((await fetchRaw(`${BASE}/assets/app.js?cache=%ZZ&next=../../outside`)).status, 200);
});

test('invalid percent encoding is rejected without crashing the server', async () => {
  for (const path of ['/assets/%', '/assets/%ZZ', '/assets/%C3%28']) {
    assert.equal((await fetchRaw(`${BASE}${path}`)).status, 400);
  }
  assert.equal((await fetchRaw(`${BASE}/`)).status, 200);
});

test('raw and encoded traversal, Windows separators/ADS and device paths stay forbidden', async () => {
  for (const path of [
    '/../outside/secret.txt', '/%2e%2e/outside/secret.txt', '/assets/../../outside/secret.txt',
    '/assets/%2e%2e%2f%2e%2e%2foutside/secret.txt', '/assets/..%5coutside/secret.txt',
    '/assets/..\\outside\\secret.txt', '/assets/%00secret.txt', '/assets/%0asecret.txt',
    '/assets/file.txt%3Asecret', '/%2e%2e%20/outside/secret.txt', '/assets/NUL', '/assets/con.txt',
    '//outside/secret.txt', '/assets//app.js',
  ]) {
    const response = await fetchRaw(`${BASE}${path}`);
    assert.equal(response.status, 403, path);
    assert.equal(response.body, 'Forbidden\n');
    assert.ok(!response.body.includes(temporaryRoot));
  }
  assert.equal((await fetchRaw(`${BASE}/%252e%252e/outside/secret.txt`)).status, 404);
});

test('realpath containment blocks an outside symlink/junction but permits an inside one', async () => {
  const outsideResponse = await fetchRaw(`${BASE}/outside-link/secret.txt`);
  assert.equal(outsideResponse.status, 403);
  assert.ok(!outsideResponse.body.includes('must not escape'));
  const insideResponse = await fetchRaw(`${BASE}/inside-link/`);
  assert.equal(insideResponse.status, 200);
  assert.ok(insideResponse.body.includes('Support'));
});

test('directory indexes must exist and are not directory listings', async () => {
  const redirect = await fetchRaw(`${BASE}/support`);
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.location, `${BASE}/support/`);
  assert.equal((await fetchRaw(`${BASE}/support/`)).status, 200);
  assert.equal((await fetchRaw(`${BASE}/assets/`)).status, 404);
});

test('a separate fixture base/root works without changing the production server', async t => {
  const fixtureRoot = join(temporaryRoot, 'output', 'qa-fixtures');
  await mkdir(fixtureRoot, { recursive: true });
  await writeFile(join(fixtureRoot, 'index.html'), '<title>Isolated scene fixture</title>');
  const options = parseServeArgs(['--port', '4174', '--base', '/fixtures', '--dir', fixtureRoot], temporaryRoot);
  const fixtureServer = await createStaticServer(options);
  const fixturePort = await listen(fixtureServer);
  t.after(() => close(fixtureServer));
  assert.equal((await fetchRaw('/fixtures/', 'GET', fixturePort)).body, '<title>Isolated scene fixture</title>');
  assert.equal((await fetchRaw(`${BASE}/`, 'GET', fixturePort)).status, 404);
  assert.equal((await fetchRaw('/fixtures/')).status, 404);
  assert.equal((await fetchRaw(`${BASE}/`)).body, HTML);
});

test('missing output, files used as roots and empty output fail before listening', async () => {
  await assert.rejects(createStaticServer({ directory: join(temporaryRoot, 'missing'), base: BASE }));
  await assert.rejects(createStaticServer({ directory: join(directory, 'index.html'), base: BASE }));
  const empty = join(temporaryRoot, 'empty');
  await mkdir(empty);
  await assert.rejects(createStaticServer({ directory: empty, base: BASE }));
});

test('CLI invalid arguments and missing dist exit nonzero', () => {
  const script = fileURLToPath(new URL('./serve-web.mjs', import.meta.url));
  for (const args of [['--port', '0'], ['--dir', join(temporaryRoot, 'missing-cli')]]) {
    const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', timeout: 5000, windowsHide: true });
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Web preview failed:/);
  }
});
