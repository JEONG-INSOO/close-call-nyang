import { BALANCE } from '../balance';
import { createInitialState, transition } from '../engine';
import type { GameState, InputState } from '../types';

const FLAGS = { mockAdsEnabled: false };
const IDLE: InputState = { left: false, right: false };
const RIGHT: InputState = { left: false, right: true };
const BOTH: InputState = { left: true, right: true };

function tick(state: GameState, input = IDLE) {
  return transition(state, { type: 'TICK', dt: BALANCE.fixedDt, input }, FLAGS);
}
function start(seed = 42): GameState {
  let state = transition(createInitialState(), { type: 'START', runId: 1, seed }, FLAGS).state;
  for (let index = 0; index < 360; index += 1) state = tick(state).state;
  return state;
}

// Measured from the unchanged nyang-v1-2093a8b42d416f8a kernel, before tuning.
// Same seed, neutral countdown, 24 right-held ticks; idle replay ends at first fall.
const BEFORE = [
  { seed: 1, heldDisplacementRad: 0.082290544, idleFallSeconds: 8.826040668 },
  { seed: 42, heldDisplacementRad: 0.082402993, idleFallSeconds: 8.928131760 },
  { seed: 241, heldDisplacementRad: 0.082933463, idleFallSeconds: 9.248371076 },
  { seed: 7654, heldDisplacementRad: 0.084677050, idleFallSeconds: 6.896448961 },
  { seed: 98765, heldDisplacementRad: 0.079129509, idleFallSeconds: 5.376471357 },
];

describe('responsive balance with a visible 65-degree failure boundary', () => {
  test('failure angle is about 65 degrees on the fixed replay precision grid', () => {
    expect(BALANCE.criticalAngleRad * 180 / Math.PI).toBeCloseTo(65, 6);
    expect(BALANCE.criticalAngleRad).toBe(Math.round(BALANCE.criticalAngleRad * 1e9) / 1e9);
    expect(BALANCE.fixedDt).toBe(1 / 120);
  });

  test.each(BEFORE)('seed $seed retains a strong response during the gentle opening', before => {
    const initial = start(before.seed);
    let held = initial;
    for (let index = 0; index < 24; index += 1) held = tick(held, RIGHT).state;
    expect(held.screen).toBe('playing');
    expect(held.run!.angleRad - initial.run!.angleRad).toBeGreaterThan(before.heldDisplacementRad * 2);
  });

  test.each([-1, 1])('side %s has room at 40/60 degrees but still fails immediately at 65', sign => {
    const initial = start();
    for (const degrees of [40, 60]) {
      const state = { ...initial, run: { ...initial.run!, angleRad: sign * degrees * Math.PI / 180, angularVelocity: 0 } };
      expect(tick(state).state.screen).toBe('playing');
    }
    const critical = { ...initial, run: { ...initial.run!, angleRad: sign * BALANCE.criticalAngleRad, angularVelocity: -sign } };
    const failed = tick(critical);
    expect(failed.state.screen).toBe('result');
    expect(failed.state.run!.distanceM).toBe(0);
    expect(failed.state.run!.elapsedSeconds).toBe(0);
    expect(failed.effects).toEqual([{ type: 'fall', runId: 1 }]);
    expect(tick(failed.state).effects).toEqual([]);
  });

  test.each([-1, 1])('opposite held input rescues side %s from 50 degrees with outward velocity', sign => {
    const initial = start();
    let state = { ...initial, run: { ...initial.run!, angleRad: sign * 50 * Math.PI / 180, angularVelocity: sign * 0.5 } };
    const counter = { left: sign === 1, right: sign === -1 };
    let steps = 0;
    while (Math.abs(state.run!.angleRad) >= 0.1 && steps < 120 && state.screen === 'playing') {
      state = tick(state, counter).state as typeof state;
      expect(Math.abs(state.run!.angleRad)).toBeLessThan(BALANCE.criticalAngleRad);
      steps += 1;
    }
    expect(state.screen).toBe('playing');
    expect(Math.abs(state.run!.angleRad)).toBeLessThan(0.1);
    expect(steps).toBeLessThan(120);
  });

  test('both held controls remain exactly idle and do not prevent an unassisted fall', () => {
    let idle = start(42);
    let both = start(42);
    for (let index = 0; index < 1200 && idle.screen === 'playing'; index += 1) {
      const neutral = tick(idle);
      const cancelled = tick(both, BOTH);
      expect(cancelled).toEqual(neutral);
      idle = neutral.state;
      both = cancelled.state;
    }
    expect(both.screen).toBe('result');
  });

  test('releasing controls does not add automatic centering', () => {
    const initial = start();
    const angleRad = 10 * Math.PI / 180;
    let state = { ...initial, run: { ...initial.run!, angleRad, angularVelocity: 0 } };
    for (let index = 0; index < 24; index += 1) state = tick(state).state as typeof state;
    expect(state.screen).toBe('playing');
    expect(state.run!.angleRad).toBeGreaterThan(angleRad);
  });
});
