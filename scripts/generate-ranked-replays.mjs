import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && !['--write', '--check'].includes(args[0]))) {
  throw new Error('Use no flag for a read-only summary, --check, or explicit --write.');
}
// Isolated test generation, using only the six canonical pure modules. No app/network imports.
const names = ['types', 'balance', 'deterministicMath', 'difficulty', 'random', 'engine'];
const sources = new Map();
const hash = createHash('sha256');
for (const name of names) {
  const filename = `src/game/${name}.ts`;
  const source = (await readFile(resolve(root, filename), 'utf8')).replace(/\r\n?/g, '\n').replace(/\n*$/, '\n');
  hash.update(filename).update('\0').update(source).update('\0');
  sources.set(name, ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  } }).outputText);
}
const rulesVersion = `nyang-v1-${hash.digest('hex').slice(0, 16)}`;
const generated = await readFile(resolve(root, 'src/online/rulesVersion.ts'), 'utf8');
assert.ok(generated.includes(`'${rulesVersion}'`), 'Run ranked:sync before generating fixtures.');
const cache = new Map();
function load(name) {
  assert.ok(names.includes(name), `Unexpected kernel dependency ${name}`);
  if (cache.has(name)) return cache.get(name).exports;
  const module = { exports: {} };
  cache.set(name, module);
  const requirePure = specifier => {
    assert.match(specifier, /^\.\/[A-Za-z]+$/);
    return load(specifier.slice(2));
  };
  new Function('require', 'module', 'exports', sources.get(name))(requirePure, module, module.exports);
  return module.exports;
}
const { createInitialState, transition } = load('engine');
const { BALANCE } = load('balance');
const flags = { mockAdsEnabled: false };
const tick = (state, direction) => transition(state, { type: 'TICK', dt: BALANCE.fixedDt,
  input: { left: direction === -1, right: direction === 1 } }, flags);
const cases = [];
for (const [name, seed, mode] of [
  ['idle-fall', 7654, 'idle'], ['held-right-fall', 123456789, 'right'], ['office-hundred-fall', 42, 'balanced'],
]) {
  const engineRunId = cases.length + 1;
  let state = transition(createInitialState(), { type: 'START', runId: engineRunId, seed }, flags).state;
  for (let index = 0; index < 360; index += 1) state = tick(state, 0).state;
  assert.equal(state.screen, 'playing');
  const spans = [];
  let ticks = 0;
  let eventWarnings = 0;
  while (state.screen === 'playing' && ticks < 20000) {
    let direction = mode === 'right' ? 1 : 0;
    if (mode === 'balanced') {
      // Ordinary discrete inputs from a deterministic, test-only feedback driver.
      const correction = 4 * state.run.angleRad + state.run.angularVelocity;
      direction = state.run.distanceM >= 101 ? 1 : correction > 0.025 ? -1 : correction < -0.025 ? 1 : 0;
    }
    const previous = spans.at(-1);
    if (previous?.direction === direction) previous.ticks += 1;
    else spans.push({ direction, ticks: 1 });
    const result = tick(state, direction);
    state = result.state;
    ticks += 1;
    eventWarnings += result.effects.filter(effect => effect.type === 'eventWarning').length;
  }
  assert.equal(state.screen, 'result', `${name} must end at a real first fall`);
  assert.equal(state.run.stepIndex, ticks);
  if (mode === 'balanced') {
    assert.ok(state.run.distanceM >= 101 && state.run.hasCoffee && eventWarnings > 0,
      'Office replay must really reach coffee, office and 100% with legal controls.');
  }
  cases.push({ name, engineRunId, seed, spans, expected: {
    ticks, score: Math.floor(state.run.distanceM), terminal: true,
    stateDigest: createHash('sha256').update(JSON.stringify(state)).digest('hex'),
    hasCoffee: state.run.hasCoffee, eventWarnings,
  } });
}
const fixtures = { formatVersion: 1, rulesVersion, cases };
const destination = resolve(root, 'test-fixtures/ranked-replays.json');
if (args[0] === '--write') {
  // Only this explicit opt-in regenerates reviewed test data; --check never writes.
  const content = `{\n  "formatVersion": 1,\n  "rulesVersion": "${rulesVersion}",\n  "cases": [\n${cases.map(value => '    ' + JSON.stringify(value)).join(',\n')}\n  ]\n}\n`;
  await writeFile(destination, content, 'utf8');
} else if (args[0] === '--check') {
  assert.deepEqual(JSON.parse(await readFile(destination, 'utf8')), fixtures, 'Replay fixture drift');
}
console.log(JSON.stringify({ rulesVersion, written: args[0] === '--write',
  cases: cases.map(({ name, spans, expected }) => ({ name, spanCount: spans.length, ...expected })) }, null, 2));
