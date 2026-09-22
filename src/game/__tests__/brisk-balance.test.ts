import { BALANCE } from '../balance';
import { adaptationAt, balanceDrift } from '../difficulty';
import { createInitialState, transition } from '../engine';
import type { GameState } from '../types';

const FLAGS = { mockAdsEnabled: false };
const SEEDS = [1, 42, 241, 7654, 98765];
function tick(state: GameState, direction = 0) {
  return transition(state, { type: 'TICK', dt: BALANCE.fixedDt,
    input: { left: direction === -1, right: direction === 1 } }, FLAGS);
}
function start(seed = 42): GameState {
  let state = transition(createInitialState(), { type: 'START', seed, runId: 1 }, FLAGS).state;
  for (let index = 0; index < 360; index += 1) state = tick(state).state;
  return state;
}
function feedback(state: GameState, deadband = 0.025): number {
  const correction = 4 * state.run!.angleRad + state.run!.angularVelocity;
  return correction > deadband ? -1 : correction < -deadband ? 1 : 0;
}

describe('gentle opening and stateless seeded pressure', () => {
  test.each([[0, 0], [2.999, 0], [3, 0], [4, 0.5], [5, 1], [500, 1]])(
    'adaptationAt(%s) is %s', (time, expected) => expect(adaptationAt(time)).toBe(expected));
  test('invalid times are safe and ramp edges are continuous and monotonic', () => {
    for (const time of [NaN, Infinity, -Infinity, -1]) expect(adaptationAt(time)).toBe(0);
    for (const time of [3, 5]) expect(Math.abs(adaptationAt(time + 1e-8) - adaptationAt(time - 1e-8))).toBeLessThan(1e-7);
    let previous = 0;
    for (let index = 0; index <= 100; index += 1) {
      const pressure = adaptationAt(3 + index / 50);
      expect(pressure).toBeGreaterThanOrEqual(previous); expect(pressure).toBeLessThanOrEqual(1); previous = pressure;
    }
  });
  test('drift is bounded, seed-specific, stateless and continuous at noise knots', () => {
    for (const seed of [...SEEDS, 0xffffffff]) {
      for (let index = 0; index < 1000; index += 1) {
        const time = index / 20, value = balanceDrift(time, seed);
        expect(value).toBeGreaterThanOrEqual(-1); expect(value).toBeLessThanOrEqual(1);
        expect(balanceDrift(time, seed)).toBe(value);
      }
      for (const period of [0.8, 1.15]) for (let knot = 1; knot <= 20; knot += 1) {
        expect(Math.abs(balanceDrift(period * knot + 1e-8, seed) - balanceDrift(period * knot - 1e-8, seed))).toBeLessThan(1e-6);
      }
    }
    expect(Array.from({ length: 20 }, (_, i) => balanceDrift(i / 4, 42)))
      .not.toEqual(Array.from({ length: 20 }, (_, i) => balanceDrift(i / 4, 43)));
    for (const time of [NaN, Infinity, -1, Number.MAX_VALUE]) expect(Number.isFinite(balanceDrift(time, 42))).toBe(true);
  });
  test('adaptation is not protection and consumes no event RNG', () => {
    let state = start(); const rng = state.run!.rng;
    for (let index = 0; index < 720; index += 1) state = tick(state, feedback(state)).state;
    expect(state.screen).toBe('playing'); expect(state.run!.protectionSeconds).toBe(0);
    expect(state.run!.reviveUsed).toBe(false); expect(state.run!.rng).toBe(rng); expect(state.run!.event).toBeNull();
    expect(adaptationAt(state.run!.elapsedSeconds)).toBe(1);
    let held = start();
    for (let index = 0; index < 360 && held.screen === 'playing'; index += 1) held = tick(held, 1).state;
    expect(held.screen).toBe('result'); expect(held.run!.elapsedSeconds).toBeLessThan(3);
  });
  test('pause inside the ramp freezes both pressure and noise until resume', () => {
    let state = start();
    for (let index = 0; index < 480; index += 1) state = tick(state, feedback(state)).state;
    const paused = transition(state, { type: 'PAUSE' }, FLAGS).state;
    const pressure = adaptationAt(paused.run!.elapsedSeconds), drift = balanceDrift(paused.run!.elapsedSeconds, paused.run!.seed);
    expect(pressure).toBeCloseTo(0.5, 5);
    for (let index = 0; index < 1000; index += 1) expect(tick(paused).state).toBe(paused);
    expect(adaptationAt(paused.run!.elapsedSeconds)).toBe(pressure);
    expect(balanceDrift(paused.run!.elapsedSeconds, paused.run!.seed)).toBe(drift);
    expect(transition(paused, { type: 'RESUME' }, FLAGS).state).toEqual(state);
  });
  test.each(SEEDS)('seed %s can recover either 50-degree lean after full adaptation', seed => {
    for (const sign of [-1, 1]) {
      const initial = start(seed);
      let state: GameState = { ...initial, run: { ...initial.run!, elapsedSeconds: 6, distanceM: 5,
        angleRad: sign * 50 * Math.PI / 180, angularVelocity: sign * 0.5, nextFootstepAt: 6.3 } };
      let count = 0;
      while (Math.abs(state.run!.angleRad) >= 0.1 && state.screen === 'playing' && count < 180) {
        state = tick(state, -sign).state; count += 1;
      }
      expect(state.screen).toBe('playing'); expect(Math.abs(state.run!.angleRad)).toBeLessThan(0.1); expect(count).toBeLessThan(180);
    }
  });
});

describe('active control versus repeated commands, not a human fun benchmark', () => {
  test('200ms feedback needs more effort than the prior kernel but still reaches 101', () => {
    const rows = SEEDS.map(seed => {
      let state = start(seed), direction = 0, active = 0, changes = 0, ticks = 0;
      for (; ticks < 14400 && state.screen === 'playing' && state.run!.distanceM < 101; ticks += 1) {
        if (ticks % 24 === 0) {
          const next = feedback(state, 0.25); if (next !== direction) changes += 1; direction = next;
        }
        if (direction) active += 1;
        state = tick(state, direction).state;
      }
      expect(state.screen).toBe('playing'); expect(state.run!.distanceM).toBeGreaterThanOrEqual(101);
      expect(state.run!.elapsedSeconds).toBeGreaterThan(90); expect(state.run!.elapsedSeconds).toBeLessThan(92);
      return { fraction: active / ticks, changesPerSecond: changes / state.run!.elapsedSeconds };
    });
    // Measured baseline 4caea00 for identical policy/seeds: active .417, changes 2.537/s.
    expect(rows.reduce((sum, row) => sum + row.fraction, 0) / rows.length).toBeGreaterThan(0.65);
    expect(rows.reduce((sum, row) => sum + row.changesPerSecond, 0) / rows.length).toBeGreaterThan(3);
  });
  test('100ms fixed alternating commands fail after the controlled five-second opening', () => {
    const times = SEEDS.map(seed => {
      let state = start(seed), direction = 0;
      for (let index = 0; index < 600; index += 1) {
        if (index % 12 === 0) direction = feedback(state);
        state = tick(state, direction).state;
      }
      expect(state.screen).toBe('playing');
      for (let index = 0; index < 1200 && state.screen === 'playing'; index += 1) state = tick(state, Math.floor(index / 12) % 2 ? 1 : -1).state;
      expect(state.screen).toBe('result'); return state.run!.elapsedSeconds;
    });
    // Same warmup/pattern on 4caea00: mean first fall at 6.619 active seconds.
    expect(times.reduce((sum, time) => sum + time, 0) / times.length).toBeLessThan(6.5);
  });
  test('coffee adds its warning at +2 seconds and force only after 1.2 warning seconds', () => {
    let state = start();
    let coffeeAt: number | null = null, warningAt: number | null = null, activeAt: number | null = null;
    for (let index = 0; index < 4000 && activeAt === null; index += 1) {
      const next = tick(state, feedback(state)); state = next.state;
      if (next.effects.some(effect => effect.type === 'coffee')) coffeeAt = state.run!.elapsedSeconds;
      if (next.effects.some(effect => effect.type === 'eventWarning')) warningAt = state.run!.elapsedSeconds;
      if (state.run!.event?.phase === 'active') activeAt = state.run!.elapsedSeconds;
    }
    expect(state.screen).toBe('playing');
    expect(coffeeAt).not.toBeNull(); expect(warningAt).not.toBeNull(); expect(activeAt).not.toBeNull();
    // Effects are observed at the end of their fixed tick, never before the scheduled boundary.
    for (const [observed, scheduled] of [[warningAt! - coffeeAt!, 2], [activeAt! - warningAt!, 1.2]]) {
      expect(observed).toBeGreaterThanOrEqual(scheduled - 1e-6);
      expect(observed).toBeLessThanOrEqual(scheduled + BALANCE.fixedDt + 1e-6);
    }
    expect(state.run!.event!.strength).toBeGreaterThanOrEqual(1.6);
  });
});
