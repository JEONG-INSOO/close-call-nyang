import { BALANCE } from '../balance';
import { difficultyAt } from '../difficulty';
import { createInitialState, transition } from '../engine';
import type { GameState, WorkEvent } from '../types';

const flags = { mockAdsEnabled: false };
function checkpoint(distance: number, direction: -1 | 1, phase: WorkEvent['phase'] = 'active', protection = 0): GameState {
  const started = transition(createInitialState(), { type: 'START', runId: 1, seed: 42 }, flags).state;
  return { ...started, screen: 'playing', countdownSeconds: 0,
    run: { ...started.run!, distanceM: distance, elapsedSeconds: 50, hasCoffee: true,
      protectionSeconds: protection, angleRad: 0, angularVelocity: 0, nextEventAt: 100,
      event: { id: 'bossCall', direction, phase, remainingSeconds: 0.5, strength: difficultyAt(distance).eventStrength } } };
}
const tick = (state: GameState) => transition(state, {
  type: 'TICK', dt: BALANCE.fixedDt, input: { left: false, right: false },
}, flags).state;

test.each([-1, 1] as const)('later events give progressively stronger angular acceleration (%s)', direction => {
  let previous = 0;
  for (const distance of [30, 51, 100, 200]) {
    const state = checkpoint(distance, direction);
    const baseline = tick({ ...state, run: { ...state.run!, event: null } });
    const result = tick(state);
    const impulse = direction * (result.run!.angularVelocity - baseline.run!.angularVelocity);
    expect(impulse).toBeGreaterThan(previous);
    expect(impulse).toBeCloseTo(difficultyAt(distance).eventStrength * BALANCE.fixedDt, 7);
    expect(Math.abs(result.run!.angleRad)).toBeLessThan(0.01); // Force integrates, no angle teleport.
    expect(tick(state)).toEqual(result);
    previous = impulse;
  }
});

test.each(['warning', 'protected'] as const)('%s events never push the character', mode => {
  const state = checkpoint(200, 1, mode === 'warning' ? 'warning' : 'active', mode === 'protected' ? 1 : 0);
  const withoutEvent = { ...state, run: { ...state.run!, event: null } };
  expect(tick(state).run!.angularVelocity).toBe(tick(withoutEvent).run!.angularVelocity);
});

test('100% event is noticeably stronger while the opening and warning remain unchanged', () => {
  const oldStrengthAt100 = 1.6 + 0.65 * Math.log1p(85 / 35);
  expect(difficultyAt(100).eventStrength / oldStrengthAt100).toBeGreaterThan(1.5);
  expect(difficultyAt(15).eventStrength).toBe(1.6);
  expect(BALANCE.warningSeconds).toBe(1.2);
  expect(BALANCE.activeEventSeconds).toBe(0.7);
});

test('resignation is issued only in the office and pushes in the runner direction', () => {
  const seen = new Set<string>();
  for (let seed = 1; seed <= 60; seed++) {
    const state = checkpoint(70, 1);
    state.run = { ...state.run!, seed, rng: Math.imul(seed, 0x9e3779b9) >>> 0, event: null, nextEventAt: 50 };
    const warning = tick(state);
    seen.add(warning.run!.event!.id);
    if (warning.run!.event!.id !== 'resignation') continue;
    const active = { ...warning, run: { ...warning.run!, event: { ...warning.run!.event!, phase: 'active' as const } } };
    const neutral = tick({ ...active, run: { ...active.run, event: null, nextEventAt: 100 } });
    const pushed = tick(active);
    expect(Math.sign(pushed.run!.angularVelocity - neutral.run!.angularVelocity)).toBe(active.run.event.direction);
  }
  expect(seen).toContain('resignation');
});
