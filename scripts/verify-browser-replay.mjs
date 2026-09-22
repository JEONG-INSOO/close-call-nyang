import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = ['types', 'balance', 'deterministicMath', 'difficulty', 'random', 'engine'];
const fixtures = JSON.parse(await readFile(join(root, 'test-fixtures/ranked-replays.json'), 'utf8'));
// Only this isolated test page receives the canonical pure kernel; never the App.
const factories = await Promise.all(files.map(async name => {
  const source = await readFile(join(root, `src/game/${name}.ts`), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  return `${JSON.stringify(name)}:function(module,exports,require){${js}\n}`;
}));
const bundle = `(() => {const factories={${factories.join(',')}};const cache={};
  function require(id){const name=id.replace(/^\.\\//,'').replace(/\\.ts$/,'');
    if(!Object.hasOwn(factories,name))throw new Error('Unexpected kernel import '+id);
    if(!cache[name]){const module={exports:{}};cache[name]=module;factories[name](module,module.exports,require);}return cache[name].exports;}
  globalThis.__nyangReplayKernel=require('engine');})();`;
const html = '<!doctype html><html lang="ko"><meta charset="utf-8"><link rel="icon" href="data:,">' +
  '<title>TEST FIXTURE — numeric replay</title><h1>TEST FIXTURE — 수치 재생 검증 / 실제 플레이 아님</h1>' +
  `<script>${bundle.replaceAll('</script', '<\\/script')}</script></html>`;
const server = createServer((request, response) => {
  response.writeHead(request.url === '/' ? 200 : 404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(request.url === '/' ? html : 'Not found');
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const observations = await page.evaluate(async fixture => {
    const { createInitialState, transition } = globalThis.__nyangReplayKernel;
    const flags = { mockAdsEnabled: false };
    const output = [];
    for (const example of fixture.cases) {
      let state = transition(createInitialState(), { type: 'START', runId: example.engineRunId, seed: example.seed }, flags).state;
      for (let index = 0; index < 360; index++) state = transition(state, { type: 'TICK', dt: 1 / 120, input: { left: false, right: false } }, flags).state;
      if (state.screen !== 'playing') throw new Error('Countdown mismatch');
      let ticks = 0, eventWarnings = 0;
      for (const span of example.spans) for (let index = 0; index < span.ticks; index++) {
        if (state.screen !== 'playing') throw new Error('Fixture has input after a fall');
        const result = transition(state, { type: 'TICK', dt: 1 / 120,
          input: { left: span.direction === -1, right: span.direction === 1 } }, flags);
        state = result.state; ticks++;
        eventWarnings += result.effects.filter(effect => effect.type === 'eventWarning').length;
      }
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(state)));
      const stateDigest = Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, '0')).join('');
      output.push({ name: example.name, expected: { ticks, score: Math.floor(state.run.distanceM),
        terminal: state.screen === 'result', stateDigest, hasCoffee: state.run.hasCoffee, eventWarnings } });
    }
    return output;
  }, fixtures);
  assert.deepEqual(errors, []);
  assert.deepEqual(observations, fixtures.cases.map(({ name, expected }) => ({ name, expected })));
  const report = { checkedAt: new Date().toISOString(), browser: browser.version(), rulesVersion: fixtures.rulesVersion,
    synthetic: true, actualPlayEvidence: false, status: 'pass', cases: observations };
  await mkdir(join(root, 'output'), { recursive: true });
  await writeFile(join(root, 'output/ranked-browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`PASS: ${observations.length} Chromium golden replays (${browser.version()}); ${fixtures.rulesVersion}`);
} finally {
  if (browser) await browser.close();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
