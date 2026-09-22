import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, appendFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import fixtures from '../../../test-fixtures/ranked-replays.json';
import { RULES_VERSION } from '../../online/rulesVersion';
import { BALANCE } from '../balance';
import { quantize, stableLog1p, stableSin } from '../deterministicMath';
import { createInitialState, transition } from '../engine';
import { difficultyAt, scoreOf, stageOf } from '../difficulty';

const FLAGS = { mockAdsEnabled: false };

describe('fixed arithmetic primitives', () => {
  test('degree-17 sine stays within 3e-8 on the reduced interval and repeats by 2pi', () => {
    for (let index = -1000; index <= 1000; index += 1) {
      const value = index * Math.PI / 1000;
      expect(Math.abs(stableSin(value) - Math.sin(value))).toBeLessThan(3e-8);
      expect(stableSin(value + 40 * Math.PI)).toBeCloseTo(stableSin(value), 6);
    }
    expect(stableSin(NaN)).toBeNaN();
    expect(stableSin(Infinity)).toBeNaN();
    expect(Object.is(stableSin(-0), -0)).toBe(false);
  });

  test('twenty-term log matches the original tuning over small and huge nonnegative values', () => {
    for (const value of [0, 1e-12, 0.001, 0.5, 1, 1.01, 35, 85, 1000, 1e20, Number.MAX_VALUE]) {
      expect(stableLog1p(value)).toBeCloseTo(Math.log1p(value), 12);
    }
    expect(stableLog1p(-1)).toBeNaN();
    expect(stableLog1p(NaN)).toBeNaN();
    expect(stableLog1p(Infinity)).toBe(Infinity);
  });

  test('quantization normalizes negative zero and cannot overflow a finite checkpoint', () => {
    expect(quantize(1.12345678949)).toBe(1.123456789);
    expect(quantize(1.12345678951)).toBe(1.123456790);
    expect(Object.is(quantize(-1e-12), -0)).toBe(false);
    expect(quantize(Number.MAX_VALUE)).toBe(Number.MAX_VALUE);
  });

  test('a rounded critical angle is terminal in the same credited tick, not the following tick', () => {
    const started = transition(createInitialState(), { type: 'START', seed: 42, runId: 1 }, FLAGS).state;
    const angleRad = 0.69;
    const target = 0.6999999998;
    const difficulty = difficultyAt(0);
    const phase = 42 / 1000;
    const accelerationWithoutDamping = difficulty.instability * stableSin(angleRad)
      + difficulty.disturbance * (stableSin(phase) + 0.35 * stableSin(phase));
    const angularVelocity = ((target - angleRad) / BALANCE.fixedDt
      - accelerationWithoutDamping * BALANCE.fixedDt) / (1 - BALANCE.damping * BALANCE.fixedDt);
    const state = { ...started, screen: 'playing' as const, countdownSeconds: 0,
      run: { ...started.run!, angleRad, angularVelocity,
        distanceM: 14.9999999998 - difficulty.speedMps * BALANCE.fixedDt } };
    const next = transition(state, { type: 'TICK', dt: BALANCE.fixedDt,
      input: { left: false, right: false } }, FLAGS);
    expect(next.state.run!.angleRad).toBe(BALANCE.criticalAngleRad);
    expect(next.state.screen).toBe('result');
    expect(next.state.run!.stepIndex).toBe(1);
    expect(next.state.run!.elapsedSeconds).toBeGreaterThan(0);
    expect(next.effects.filter(effect => effect.type === 'fall')).toHaveLength(1);
    expect(next.state.run!.distanceM).toBe(15);
    expect(next.state.run!.hasCoffee).toBe(true);
    expect(next.effects.findIndex(effect => effect.type === 'coffee'))
      .toBeLessThan(next.effects.findIndex(effect => effect.type === 'fall'));
  });

  test('rounding onto 15 meters grants coffee immediately and exactly once', () => {
    const started = transition(createInitialState(), { type: 'START', seed: 42, runId: 1 }, FLAGS).state;
    const state = { ...started, screen: 'playing' as const, countdownSeconds: 0,
      run: { ...started.run!, distanceM: 14.9999999998 - BALANCE.baseSpeedMps * BALANCE.fixedDt } };
    const action = { type: 'TICK' as const, dt: BALANCE.fixedDt, input: { left: false, right: false } };
    const next = transition(state, action, FLAGS);
    expect(next.state.screen).toBe('playing');
    expect(next.state.run!.distanceM).toBe(15);
    expect(next.state.run!.hasCoffee).toBe(true);
    expect(next.state.run!.nextEventAt).toBe(next.state.run!.elapsedSeconds + 6);
    expect(next.effects.filter(effect => effect.type === 'coffee')).toHaveLength(1);
    expect(transition(next.state, action, FLAGS).effects.some(effect => effect.type === 'coffee')).toBe(false);
  });

  test('the canonical game never calls ambient transcendental implementations', () => {
    const spies = (['sin', 'log', 'log1p'] as const).map(name =>
      jest.spyOn(Math, name).mockImplementation(() => { throw new Error('Runtime transcendental used'); }));
    try {
      let state = transition(createInitialState(), { type: 'START', seed: 42, runId: 1 }, FLAGS).state;
      for (let tick = 0; tick < 600; tick += 1) {
        state = transition(state, { type: 'TICK', dt: BALANCE.fixedDt, input: { left: false, right: false } }, FLAGS).state;
      }
      expect(state.run!.distanceM).toBeGreaterThan(0);
    } finally { spies.forEach(spy => spy.mockRestore()); }
  });
});

describe('Node canonical replay goldens', () => {
  test('fixture rules match the generated source hash', () => {
    expect(fixtures.rulesVersion).toBe(RULES_VERSION);
    expect(fixtures.formatVersion).toBe(1);
  });
  test.each(fixtures.cases)('$name retains its complete state digest', fixture => {
    let state = transition(createInitialState(), {
      type: 'START', seed: fixture.seed, runId: fixture.engineRunId,
    }, FLAGS).state;
    for (let index = 0; index < 360; index += 1) {
      state = transition(state, { type: 'TICK', dt: BALANCE.fixedDt, input: { left: false, right: false } }, FLAGS).state;
    }
    expect(state.screen).toBe('playing');
    let ticks = 0;
    let eventWarnings = 0;
    for (const span of fixture.spans) {
      const input = { left: span.direction === -1, right: span.direction === 1 };
      for (let index = 0; index < span.ticks; index += 1) {
        if (state.screen !== 'playing') throw new Error('Fixture contains ticks after its first fall');
        const next = transition(state, { type: 'TICK', dt: BALANCE.fixedDt, input }, FLAGS);
        state = next.state;
        ticks += 1;
        eventWarnings += next.effects.filter(effect => effect.type === 'eventWarning').length;
      }
    }
    expect({
      ticks, score: scoreOf(state.run!.distanceM), terminal: state.screen === 'result',
      stateDigest: createHash('sha256').update(JSON.stringify(state)).digest('hex'),
      hasCoffee: state.run!.hasCoffee, eventWarnings,
    }).toEqual(fixture.expected);
    if (fixture.expected.score >= 100) expect(stageOf(state.run!.distanceM)).toBe('office');
    for (const key of ['angleRad', 'angularVelocity', 'distanceM', 'elapsedSeconds'] as const) {
      expect(quantize(state.run![key])).toBe(state.run![key]);
    }
  });
});

test('sync --check detects drift without rewriting it, and canonical dependencies cannot import a platform', () => {
  const root = resolve(__dirname, '../../..');
  const temporary = mkdtempSync(join(tmpdir(), 'nyang-kernel-test-'));
  try {
    mkdirSync(join(temporary, 'scripts'), { recursive: true });
    mkdirSync(join(temporary, 'src/game'), { recursive: true });
    copyFileSync(join(root, 'scripts/sync-ranked-engine.mjs'), join(temporary, 'scripts/sync-ranked-engine.mjs'));
    for (const name of ['types', 'balance', 'deterministicMath', 'difficulty', 'random', 'engine']) {
      copyFileSync(join(root, `src/game/${name}.ts`), join(temporary, `src/game/${name}.ts`));
    }
    const script = join(temporary, 'scripts/sync-ranked-engine.mjs');
    execFileSync(process.execPath, [script], { stdio: 'pipe' });
    expect(() => execFileSync(process.execPath, [script, '--check'], { stdio: 'pipe' })).not.toThrow();
    const generated = join(temporary, 'supabase/functions/_shared/game/engine.ts');
    const windowsCheckout = readFileSync(generated, 'utf8').replace(/\r?\n/g, '\r\n');
    writeFileSync(generated, windowsCheckout);
    expect(() => execFileSync(process.execPath, [script, '--check'], { stdio: 'pipe' })).not.toThrow();
    expect(readFileSync(generated, 'utf8')).toBe(windowsCheckout);
    appendFileSync(generated, '// unauthorized drift\n');
    const before = readFileSync(generated, 'utf8');
    expect(() => execFileSync(process.execPath, [script, '--check'], { stdio: 'pipe' })).toThrow();
    expect(readFileSync(generated, 'utf8')).toBe(before);
    appendFileSync(join(temporary, 'src/game/engine.ts'), '\nimport React from \'react\';\n');
    expect(() => execFileSync(process.execPath, [script], { stdio: 'pipe' })).toThrow();
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});
