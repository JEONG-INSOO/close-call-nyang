import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Read-only comparison tool. All controllers below exist only in this offline script.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baseline = '4caea00';
const names = ['types', 'balance', 'deterministicMath', 'difficulty', 'random', 'engine'];
async function kernel(revision) {
  const sources = new Map();
  for (const name of names) {
    const file = `src/game/${name}.ts`;
    const text = revision
      ? execFileSync('git', ['-c', `safe.directory=${root}`, '-C', root, 'show', `${revision}:${file}`], { encoding: 'utf8' })
      : await readFile(resolve(root, file), 'utf8');
    sources.set(name, ts.transpileModule(text, { compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
    } }).outputText);
  }
  const cache = new Map();
  function load(name) {
    if (!names.includes(name)) throw new Error('Unexpected kernel import');
    if (cache.has(name)) return cache.get(name).exports;
    const module = { exports: {} }; cache.set(name, module);
    const requirePure = value => {
      if (!/^\.\/[a-zA-Z]+$/.test(value)) throw new Error('Noncanonical import');
      return load(value.slice(2));
    };
    new Function('require', 'module', 'exports', sources.get(name))(requirePure, module, module.exports);
    return module.exports;
  }
  return { ...load('engine'), balance: load('balance').BALANCE };
}
const seeds = [1, 42, 241, 7654, 98765];
const modes = ['idle', 'both', 'heldLeft', 'heldRight', 'alternating100ms', 'alternating300ms',
  'settledIdle', 'settledAlternating100ms', 'settledAlternating300ms', 'feedback100ms', 'feedback200ms',
  'feedback200msRelaxed', 'feedback250msRelaxed', 'feedbackFullRate'];
function replay(core, seed, mode) {
  const flags = { mockAdsEnabled: false };
  const dt = core.balance.fixedDt;
  const step = (state, direction, both = false) => core.transition(state, { type: 'TICK', dt,
    input: { left: both || direction === -1, right: both || direction === 1 } }, flags).state;
  let state = core.transition(core.createInitialState(), { type: 'START', seed, runId: 1 }, flags).state;
  for (let index = 0; index < 360; index += 1) state = step(state, 0);
  let direction = 0, corrections = 0, activeTicks = 0, peakAngle = 0, ticks = 0;
  for (; ticks < 14400 && state.screen === 'playing' && state.run.distanceM < 101; ticks += 1) {
    const previousDirection = direction;
    const warmup = mode.startsWith('settled') && ticks < 600;
    if (warmup && ticks % 12 === 0) {
      const correction = 4 * state.run.angleRad + state.run.angularVelocity;
      direction = correction > 0.025 ? -1 : correction < -0.025 ? 1 : 0;
    } else if (warmup) { /* Hold the preceding ordinary input until the next 100ms decision. */ }
    else if (mode === 'settledIdle') direction = 0;
    else if (mode === 'settledAlternating100ms') direction = Math.floor((ticks - 600) / 12) % 2 ? 1 : -1;
    else if (mode === 'settledAlternating300ms') direction = Math.floor((ticks - 600) / 36) % 2 ? 1 : -1;
    else if (mode === 'heldLeft') direction = -1;
    else if (mode === 'heldRight') direction = 1;
    else if (mode === 'alternating100ms') direction = Math.floor(ticks / 12) % 2 ? 1 : -1;
    else if (mode === 'alternating300ms') direction = Math.floor(ticks / 36) % 2 ? 1 : -1;
    else if (mode.startsWith('feedback') && (mode === 'feedbackFullRate' ||
        ticks % (mode === 'feedback250msRelaxed' ? 30 : mode.startsWith('feedback200ms') ? 24 : 12) === 0)) {
      const correction = 4 * state.run.angleRad + state.run.angularVelocity;
      const deadband = mode === 'feedback200msRelaxed' ? 0.25 : mode === 'feedback250msRelaxed' ? 0.5 : 0.025;
      direction = correction > deadband ? -1 : correction < -deadband ? 1 : 0;
    }
    if (direction !== previousDirection) corrections += 1;
    if (direction !== 0) activeTicks += 1;
    state = step(state, direction, mode === 'both');
    peakAngle = Math.max(peakAngle, Math.abs(state.run.angleRad));
  }
  return { seed, mode, survivedTo101: state.run.distanceM >= 101,
    seconds: Number(state.run.elapsedSeconds.toFixed(6)), score: Math.floor(state.run.distanceM),
    corrections, correctionsPerSecond: Number((corrections / state.run.elapsedSeconds).toFixed(3)),
    activeFraction: Number((activeTicks / ticks).toFixed(3)), peakAngleDegrees: Number((peakAngle * 180 / Math.PI).toFixed(3)) };
}
const result = { baseline, seeds, rows: [] };
for (const [version, core] of [['before', await kernel(baseline)], ['after', await kernel()]]) {
  for (const mode of modes) for (const seed of seeds) result.rows.push({ version, ...replay(core, seed, mode) });
}
const summary = [];
for (const version of ['before', 'after']) for (const mode of modes) {
  const rows = result.rows.filter(row => row.version === version && row.mode === mode);
  const average = key => Number((rows.reduce((sum, row) => sum + row[key], 0) / rows.length).toFixed(3));
  summary.push({ version, mode, successes: rows.filter(row => row.survivedTo101).length,
    meanSeconds: average('seconds'), meanCorrectionsPerSecond: average('correctionsPerSecond'),
    meanActiveFraction: average('activeFraction'), meanPeakAngleDegrees: average('peakAngleDegrees') });
}
console.log(JSON.stringify({ ...result, summary }, null, 2));
