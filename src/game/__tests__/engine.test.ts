import { BALANCE } from '../balance';
import { scoreOf, speedAt, stageOf } from '../difficulty';
import { createInitialState, transition } from '../engine';
import type { GameAction, GameEffect, GameState, InputState, RunState, WorkEvent } from '../types';

const FLAGS = Object.freeze({ mockAdsEnabled: false });
const MOCK_FLAGS = Object.freeze({ mockAdsEnabled: true });
const NONE: InputState = Object.freeze({ left: false, right: false });
const DT = BALANCE.fixedDt;

function start(seed = 1234, runId = 1): GameState {
  return transition(createInitialState(), { type: 'START', seed, runId }, FLAGS).state;
}

// Boundary fixtures modify a real run only inside these pure-rule tests.
function playing(patch: Partial<RunState> = {}): GameState {
  const state = start();
  return {
    ...state,
    screen: 'playing',
    countdownSeconds: 0,
    run: {
      ...state.run!,
      angleRad: 0,
      angularVelocity: 0,
      nextEventAt: Number.MAX_VALUE,
      nextFootstepAt: Number.MAX_VALUE,
      ...patch,
    },
  };
}

function tick(state: GameState, input = NONE, dt = DT, mockAdsEnabled = false) {
  return transition(state, { type: 'TICK', dt, input }, { mockAdsEnabled });
}

function advance(state: GameState, count: number, input = NONE, mockAdsEnabled = false) {
  const effects: GameEffect[] = [];
  for (let index = 0; index < count; index += 1) {
    const result = tick(state, input, DT, mockAdsEnabled);
    state = result.state;
    effects.push(...result.effects);
  }
  return { state, effects };
}

function failed(patch: Partial<RunState> = {}): GameState {
  return tick(playing({ angleRad: BALANCE.criticalAngleRad, ...patch })).state;
}

function advertised(state = failed()): GameState {
  return transition(state, { type: 'REQUEST_AD' }, MOCK_FLAGS).state;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

function event(patch: Partial<WorkEvent> = {}): WorkEvent {
  return {
    id: 'coffeeRush',
    direction: 1,
    phase: 'warning',
    remainingSeconds: BALANCE.warningSeconds,
    strength: 1,
    ...patch,
  };
}

describe('run lifecycle and defensive boundaries', () => {
  test('starts on the title without a run or running clocks', () => {
    expect(createInitialState()).toEqual({
      screen: 'title',
      run: null,
      resumeTo: null,
      countdownSeconds: 0,
      adSeconds: 0,
    });
  });

  test('START creates a small seeded lean and an untouched three-second countdown', () => {
    const state = start(0, 7);
    expect(state.screen).toBe('countdown');
    expect(state.countdownSeconds).toBe(3);
    expect(state.run).toMatchObject({
      id: 7,
      seed: 1, // The zero seed is normalized to the nonzero PRNG seed.
      distanceM: 0,
      elapsedSeconds: 0,
      angularVelocity: 0,
      hasCoffee: false,
      reviveUsed: false,
      protectionSeconds: 0,
      stepIndex: 0,
      event: null,
    });
    expect(Math.abs(state.run!.angleRad)).toBeGreaterThan(0);
    expect(Math.abs(state.run!.angleRad)).toBeLessThanOrEqual(0.025);
    expect(state.run!.rng).toBeGreaterThan(0);
    for (const value of Object.values(state.run!)) {
      if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
    }
    expect(start(0, 7)).toEqual(state);
    expect(start(0, 7)).toEqual(start(1, 7));
    expect(start(0xffffffff).screen).toBe('countdown');
  });

  test('rejects invalid IDs and seeds without any effects', () => {
    const state = createInitialState();
    const invalidStarts = [
      { runId: 0, seed: 1 },
      { runId: -1, seed: 1 },
      { runId: 1.5, seed: 1 },
      { runId: Number.MAX_SAFE_INTEGER + 1, seed: 1 },
      { runId: NaN, seed: 1 },
      { runId: 1, seed: -1 },
      { runId: 1, seed: 0x100000000 },
      { runId: 1, seed: 0.5 },
      { runId: 1, seed: Infinity },
    ];
    for (const fields of invalidStarts) {
      const result = transition(state, { type: 'START', ...fields }, FLAGS);
      expect(result.state).toBe(state);
      expect(result.effects).toEqual([]);
    }
  });

  test('cannot restart an active run; retry from result gets a fresh run', () => {
    for (const state of [start(), playing(), advertised()]) {
      expect(transition(state, { type: 'START', seed: 9, runId: 2 }, MOCK_FLAGS))
        .toEqual({ state, effects: [] });
    }
    const result = transition(failed({ hasCoffee: true, reviveUsed: true }),
      { type: 'START', seed: 9, runId: 2 }, FLAGS);
    expect(result.state).toEqual(start(9, 2));
    expect(result.effects).toEqual([]);
  });

  test('countdown lasts 360 fixed ticks without advancing the run or accepting controls', () => {
    const state = start();
    const before = advance(state, 359, { left: true, right: false });
    expect(before.state.screen).toBe('countdown');
    expect(before.state.countdownSeconds).toBeGreaterThan(0);
    expect(before.state.run).toEqual(state.run);
    expect(before.effects).toEqual([]);
    const ready = tick(before.state);
    expect(ready.state.screen).toBe('playing');
    expect(ready.state.countdownSeconds).toBe(0);
    expect(ready.state.run).toEqual(state.run);
    expect(ready.effects).toEqual([]);
    expect(tick(ready.state).state.run!.distanceM).toBeGreaterThan(0);
  });

  test('countdown overshoot is discarded instead of moving the player early', () => {
    const state = { ...start(), countdownSeconds: DT / 2 };
    const result = tick(state);
    expect(result.state.screen).toBe('playing');
    expect(result.state.countdownSeconds).toBe(0);
    expect(result.state.run).toEqual(state.run);
  });

  test('invalid tick durations and malformed controls are harmless no-ops', () => {
    const states = [start(), playing(), advertised()];
    for (const state of states) {
      const invalidActions: unknown[] = [
        ...[0, -DT, NaN, Infinity, -Infinity, 1 / 30 + 0.001].map(dt => ({ type: 'TICK', dt, input: NONE })),
        { type: 'TICK', dt: DT, input: { left: 1, right: false } },
        { type: 'TICK', dt: DT, input: { left: false, right: 'yes' } },
        { type: 'TICK', dt: DT, input: { left: false } },
        { type: 'TICK', dt: DT, input: null },
      ];
      for (const action of invalidActions) {
        expect(transition(state, action as GameAction, MOCK_FLAGS)).toEqual({ state, effects: [] });
      }
    }
  });

  test('title, result and pause do not advance any clock', () => {
    const paused = transition(playing(), { type: 'PAUSE' }, FLAGS).state;
    for (const state of [createInitialState(), failed(), paused]) {
      expect(advance(state, 200)).toEqual({ state, effects: [] });
    }
  });

  test('HOME leaves overlays cleanly but is not an in-play escape action', () => {
    const live = playing();
    expect(transition(live, { type: 'HOME' }, FLAGS)).toEqual({ state: live, effects: [] });
    for (const state of [start(), failed(), advertised(), transition(live, { type: 'PAUSE' }, FLAGS).state]) {
      expect(transition(state, { type: 'HOME' }, MOCK_FLAGS))
        .toEqual({ state: createInitialState(), effects: [] });
    }
  });

  test('illegal resume, ad-cancel and ad-request actions do not change a run', () => {
    for (const state of [createInitialState(), start(), playing()]) {
      for (const type of ['RESUME', 'CANCEL_AD', 'REQUEST_AD'] as const) {
        expect(transition(state, { type }, MOCK_FLAGS)).toEqual({ state, effects: [] });
      }
    }
  });
});

describe('deterministic balance and immediate failure', () => {
  test('left and right apply opposite controls, while simultaneous controls cancel', () => {
    const state = playing();
    const neutral = tick(state).state;
    const left = tick(state, { left: true, right: false }).state;
    const right = tick(state, { left: false, right: true }).state;
    expect(left.run!.angularVelocity).toBeLessThan(neutral.run!.angularVelocity);
    expect(right.run!.angularVelocity).toBeGreaterThan(neutral.run!.angularVelocity);
    expect(tick(state, { left: true, right: true })).toEqual(tick(state));
  });

  test('the same seed and input timeline produce identical states and effects', () => {
    let first = start(98765);
    let second = start(98765);
    let warnings = 0;
    for (let index = 0; index < 14000; index += 1) {
      // A test-only feedback controller supplies ordinary left/right inputs.
      // This keeps the replay live across the cafe, office and several events.
      const correction = first.run!.angleRad * 4 + first.run!.angularVelocity;
      const input = { left: correction > 0.025, right: correction < -0.025 };
      const a = tick(first, input);
      const b = tick(second, input);
      expect(a).toEqual(b);
      warnings += a.effects.filter(effect => effect.type === 'eventWarning').length;
      first = a.state;
      second = b.state;
    }
    expect(first.screen).toBe('playing');
    expect(first.run!.distanceM).toBeGreaterThan(100);
    expect(warnings).toBeGreaterThanOrEqual(5);
  });

  test('never mutates state, its nested event, controls or feature flags', () => {
    const state = deepFreeze(playing({
      distanceM: 20,
      hasCoffee: true,
      event: event({ remainingSeconds: DT / 2 }),
    }));
    const action = deepFreeze<GameAction>({ type: 'TICK', dt: DT, input: { left: true, right: false } });
    const before = JSON.stringify(state);
    const result = transition(state, action, FLAGS);
    expect(result.state).not.toBe(state);
    expect(JSON.stringify(state)).toBe(before);
    expect(state.run!.event!.remainingSeconds).toBe(DT / 2);
    expect(action).toEqual({ type: 'TICK', dt: DT, input: { left: true, right: false } });
  });

  test('exactly critical angles fail immediately on either side, with no distance gain', () => {
    for (const sign of [-1, 1]) {
      const state = playing({ angleRad: sign * BALANCE.criticalAngleRad, angularVelocity: -sign });
      const result = tick(state);
      expect(result.state.screen).toBe('result');
      expect(result.state.run!.distanceM).toBe(0);
      expect(result.state.run!.elapsedSeconds).toBe(0);
      expect(result.effects).toEqual([{ type: 'fall', runId: 1 }]);
      expect(tick(result.state)).toEqual({ state: result.state, effects: [] });
    }
  });

  test('just below the threshold survives if angular velocity moves away from danger', () => {
    for (const sign of [-1, 1]) {
      const state = playing({ angleRad: sign * (BALANCE.criticalAngleRad - 0.001), angularVelocity: -sign });
      const result = tick(state);
      expect(result.state.screen).toBe('playing');
      expect(Math.abs(result.state.run!.angleRad)).toBeLessThan(Math.abs(state.run!.angleRad));
      expect(result.effects.some(effect => effect.type === 'fall')).toBe(false);
    }
  });

  test.each([-1, 1])('a crossing fall on side %s credits only the fraction of time and distance before impact', sign => {
    const state = playing({ distanceM: 60, elapsedSeconds: 12,
      angleRad: sign * (BALANCE.criticalAngleRad - 0.001), angularVelocity: sign * 4 });
    const result = tick(state);
    const run = result.state.run!;
    const creditedSeconds = run.elapsedSeconds - state.run!.elapsedSeconds;
    expect(result.state.screen).toBe('result');
    expect(creditedSeconds).toBeGreaterThan(0);
    expect(creditedSeconds).toBeLessThan(DT);
    // Both distance and elapsed checkpoints are now rounded to 1e-9.
    expect(run.distanceM - 60).toBeCloseTo(speedAt(60) * creditedSeconds, 8);
    expect(run.angleRad).toBeCloseTo(sign * BALANCE.criticalAngleRad, 12);
    expect(result.effects.filter(effect => effect.type === 'fall')).toHaveLength(1);
    expect(tick(result.state)).toEqual({ state: result.state, effects: [] });
  });

  test('no input and indefinitely holding either direction eventually cause a fall', () => {
    for (const input of [NONE, { left: true, right: false }, { left: false, right: true }]) {
      let state = start(7654);
      let falls = 0;
      for (let index = 0; index < 12000 && state.screen !== 'result'; index += 1) {
        const result = tick(state, input);
        state = result.state;
        falls += result.effects.filter(effect => effect.type === 'fall').length;
      }
      expect(state.screen).toBe('result');
      expect(state.run!.elapsedSeconds).toBeGreaterThan(0);
      expect(falls).toBe(1);
    }
  });

  test('numeric precision exhaustion becomes a finite result instead of NaN or a stalled run', () => {
    for (const patch of [
      { distanceM: Number.MAX_VALUE },
      { elapsedSeconds: Number.MAX_VALUE },
      { stepIndex: Number.MAX_SAFE_INTEGER },
    ]) {
      const state = playing(patch);
      const result = tick(state);
      expect(result.state.screen).toBe('result');
      expect(result.effects.filter(effect => effect.type === 'fall')).toHaveLength(1);
      for (const value of Object.values(result.state.run!)) {
        if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
      }
      expect(tick(result.state)).toEqual({ state: result.state, effects: [] });
    }
  });
});

describe('distance milestones and effects', () => {
  test('crossing 15 gives coffee once and schedules the first warning two seconds later', () => {
    const result = tick(playing({ distanceM: 14.999999 }));
    expect(result.state.run!.distanceM).toBeGreaterThan(15);
    expect(result.state.run!.hasCoffee).toBe(true);
    expect(result.effects.filter(effect => effect.type === 'coffee')).toEqual([{ type: 'coffee', runId: 1 }]);
    expect(result.state.run!.nextEventAt).toBeCloseTo(result.state.run!.elapsedSeconds + 2, 8);
    expect(advance(result.state, 20).effects.some(effect => effect.type === 'coffee')).toBe(false);
  });

  test('a final partial tick still gives coffee if the player reached the cafe before falling', () => {
    const result = tick(playing({ distanceM: 14.999999, angleRad: BALANCE.criticalAngleRad - 0.001, angularVelocity: 4 }));
    expect(result.state.screen).toBe('result');
    expect(result.state.run!.distanceM).toBeGreaterThan(15);
    expect(result.state.run!.hasCoffee).toBe(true);
    expect(result.effects.filter(effect => effect.type === 'coffee')).toHaveLength(1);
    expect(result.effects.filter(effect => effect.type === 'fall')).toHaveLength(1);
  });

  test('never awards coffee or a footstep scheduled beyond the moment of failure', () => {
    const result = tick(playing({
      distanceM: 14.999,
      angleRad: BALANCE.criticalAngleRad - 0.00001,
      angularVelocity: 4,
      nextFootstepAt: DT / 2,
    }));
    expect(result.state.screen).toBe('result');
    expect(result.state.run!.distanceM).toBeLessThan(15);
    expect(result.state.run!.hasCoffee).toBe(false);
    expect(result.effects.some(effect => effect.type === 'coffee' || effect.type === 'footstep')).toBe(false);
  });

  test('51 changes the derived environment and crossing 100 has no celebration effect or cap', () => {
    const office = tick(playing({ distanceM: 50.999999, hasCoffee: true }));
    expect(stageOf(50.999999)).toBe('street');
    expect(stageOf(office.state.run!.distanceM)).toBe('office');
    const hundred = tick(playing({ distanceM: 99.999999, hasCoffee: true }));
    expect(scoreOf(hundred.state.run!.distanceM)).toBe(100);
    expect(hundred.effects).toEqual([]);
    const far = tick(playing({ distanceM: 200, hasCoffee: true }));
    expect(far.state.run!.distanceM).toBeGreaterThan(200);
    expect(far.state.run!.distanceM - 200).toBeGreaterThan(hundred.state.run!.distanceM - 99.999999);
  });

  test('footsteps use active time and wobble cannot repeat until its cooldown expires', () => {
    const step = tick(playing({ nextFootstepAt: DT / 2 }));
    expect(step.effects.filter(effect => effect.type === 'footstep')).toEqual([{ type: 'footstep', runId: 1 }]);
    expect(tick(step.state).effects.some(effect => effect.type === 'footstep')).toBe(false);
    const wobble = tick(playing({ angleRad: BALANCE.criticalAngleRad * 0.75, lastWobbleAt: -BALANCE.wobbleCooldownSeconds }));
    expect(wobble.effects.filter(effect => effect.type === 'wobble')).toEqual([{ type: 'wobble', runId: 1 }]);
    expect(tick(wobble.state).effects.some(effect => effect.type === 'wobble')).toBe(false);
  });
});

describe('seeded directional events', () => {
  test('only stage-appropriate events are scheduled, and the warning is emitted once', () => {
    for (const distanceM of [20, 60]) {
      const state = playing({ distanceM, hasCoffee: true, elapsedSeconds: 8, nextEventAt: 8 });
      const result = tick(state);
      const workEvent = result.state.run!.event!;
      expect(workEvent.phase).toBe('warning');
      expect(workEvent.remainingSeconds).toBeGreaterThan(BALANCE.warningSeconds - 2 * DT);
      expect(workEvent.remainingSeconds).toBeLessThanOrEqual(BALANCE.warningSeconds);
      const allowed = distanceM < 51 ? ['coffeeRush', 'lateCommute'] : ['urgentEdit', 'bossCall', 'longMeeting'];
      expect(allowed).toContain(workEvent.id);
      expect([-1, 1]).toContain(workEvent.direction);
      expect(result.effects.filter(effect => effect.type === 'eventWarning')).toEqual([
        { type: 'eventWarning', runId: 1, eventId: workEvent.id, direction: workEvent.direction },
      ]);
      expect(tick(result.state).effects.some(effect => effect.type === 'eventWarning')).toBe(false);
      expect(tick(state)).toEqual(result);
    }
  });

  test('a warning exerts no force before expiry, then pushes in the warned direction', () => {
    const baseline = tick(playing({ distanceM: 20, hasCoffee: true })).state.run!;
    for (const direction of [-1, 1] as const) {
      const warning = tick(playing({ distanceM: 20, hasCoffee: true, event: event({ direction }) }));
      expect(warning.state.run!.angularVelocity).toBe(baseline.angularVelocity);
      const active = tick(playing({ distanceM: 20, hasCoffee: true, event: event({ direction, phase: 'active' }) }));
      expect((active.state.run!.angularVelocity - baseline.angularVelocity) * direction).toBeGreaterThan(0);
    }
  });

  test('warning expiry halfway through a tick applies only the active half of its force', () => {
    const patch = { distanceM: 20, hasCoffee: true };
    const baseline = tick(playing(patch)).state.run!.angularVelocity;
    const full = tick(playing({ ...patch, event: event({ phase: 'active' }) })).state.run!.angularVelocity - baseline;
    const halfResult = tick(playing({ ...patch, event: event({ remainingSeconds: DT / 2 }) }));
    const half = halfResult.state.run!.angularVelocity - baseline;
    expect(halfResult.state.run!.event!.phase).toBe('active');
    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(full);
    expect(half / full).toBeCloseTo(0.5, 2);
    expect(halfResult.state.run!.event!.remainingSeconds).toBeCloseTo(BALANCE.activeEventSeconds - DT / 2, 8);
  });

  test('the full warning lasts 1.2 seconds before the 0.7-second active phase', () => {
    const state = playing({ distanceM: 20, hasCoffee: true, event: event() });
    const almost = advance(state, 143);
    expect(almost.state.run!.event!.phase).toBe('warning');
    expect(almost.state.run!.event!.remainingSeconds).toBeGreaterThan(0);
    const active = tick(almost.state);
    expect(active.state.run!.event!.phase).toBe('active');
    expect(active.state.run!.event!.remainingSeconds).toBeCloseTo(0.7, 8);
    const neutral = advance(playing({ distanceM: 20, hasCoffee: true }), 144);
    expect(active.state.run!.angleRad).toBeCloseTo(neutral.state.run!.angleRad, 10);
    expect(active.state.run!.angularVelocity).toBeCloseTo(neutral.state.run!.angularVelocity, 10);
    const activeAlmostOver = advance(active.state, 83);
    expect(activeAlmostOver.state.run!.event!.phase).toBe('active');
    expect(activeAlmostOver.state.run!.event!.remainingSeconds).toBeGreaterThan(0);
    expect(tick(activeAlmostOver.state).state.run!.event).toBeNull();
  });

  test('active events expire without overlap and schedule a future warning', () => {
    const result = tick(playing({ distanceM: 60, hasCoffee: true, elapsedSeconds: 10, event: event({ phase: 'active', remainingSeconds: DT / 2 }) }));
    expect(result.state.run!.event).toBeNull();
    expect(result.state.run!.nextEventAt).toBeGreaterThan(result.state.run!.elapsedSeconds);
    expect(result.effects.some(effect => effect.type === 'eventWarning')).toBe(false);
  });
});

describe('pause, mock advertisements and one-time revival', () => {
  test('pause freezes playing, countdown and ad clocks until an explicit resume', () => {
    const states = [playing({ event: event(), protectionSeconds: 1 }), start(), advertised()];
    for (const state of states) {
      const pause = transition(state, { type: 'PAUSE' }, MOCK_FLAGS);
      expect(pause.state.screen).toBe('paused');
      expect(pause.state.resumeTo).toBe(state.screen);
      expect(pause.state.run).toEqual(state.run);
      expect(advance(pause.state, 720, NONE, true)).toEqual({ state: pause.state, effects: [] });
      expect(transition(pause.state, { type: 'PAUSE' }, MOCK_FLAGS)).toEqual({ state: pause.state, effects: [] });
      const resumed = transition(pause.state, { type: 'RESUME' }, MOCK_FLAGS);
      expect(resumed).toEqual({ state, effects: [] });
    }
  });

  test('the mock ad is unavailable without its feature flag or after the revive was used', () => {
    const result = failed();
    expect(transition(result, { type: 'REQUEST_AD' }, FLAGS)).toEqual({ state: result, effects: [] });
    const alreadyUsed = failed({ reviveUsed: true });
    expect(transition(alreadyUsed, { type: 'REQUEST_AD' }, MOCK_FLAGS)).toEqual({ state: alreadyUsed, effects: [] });
    const ad = advertised();
    expect(transition(ad, { type: 'REQUEST_AD' }, MOCK_FLAGS)).toEqual({ state: ad, effects: [] });
  });

  test('an existing mock-ad countdown cannot complete when the feature flag is disabled', () => {
    const state = { ...advertised(), adSeconds: DT };
    expect(tick(state, NONE, DT, false)).toEqual({ state, effects: [] });
    expect(state.run!.reviveUsed).toBe(false);
  });

  test('cancelling an unfinished ad returns to results without consuming the reward', () => {
    const original = failed({ distanceM: 60, hasCoffee: true });
    const ad = advance(advertised(original), 599, NONE, true);
    expect(ad.state.screen).toBe('ad');
    expect(ad.effects).toEqual([]);
    expect(ad.state.run).toEqual(original.run);
    const cancelled = transition(ad.state, { type: 'CANCEL_AD' }, MOCK_FLAGS);
    expect(cancelled.state.screen).toBe('result');
    expect(cancelled.state.run).toEqual(original.run);
    expect(cancelled.state.run!.reviveUsed).toBe(false);
    expect(cancelled.effects).toEqual([]);
    expect(advertised(cancelled.state).adSeconds).toBe(5);
  });

  test('only five foreground ad seconds grant one revive at unchanged progress', () => {
    const original = failed({ distanceM: 105.5, elapsedSeconds: 92, hasCoffee: true, event: event() });
    const ad = advertised(original);
    const almost = advance(ad, 599, NONE, true);
    expect(almost.state.screen).toBe('ad');
    expect(almost.effects).toEqual([]);
    const complete = tick(almost.state, NONE, DT, true);
    expect(complete.state.screen).toBe('countdown');
    expect(complete.state.countdownSeconds).toBe(3);
    expect(complete.state.run).toMatchObject({
      id: original.run!.id,
      seed: original.run!.seed,
      distanceM: original.run!.distanceM,
      elapsedSeconds: original.run!.elapsedSeconds,
      hasCoffee: true,
      reviveUsed: true,
      angleRad: 0,
      angularVelocity: 0,
      event: null,
      protectionSeconds: 1.5,
    });
    expect(complete.state.run!.nextEventAt).toBeCloseTo(original.run!.elapsedSeconds + 2, 10);
    expect(complete.effects).toEqual([{ type: 'revive', runId: 1 }]);
    const ready = advance(complete.state, 360, NONE, true);
    expect(ready.state.screen).toBe('playing');
    expect(ready.state.run).toEqual(complete.state.run);
    expect(ready.effects.some(effect => effect.type === 'revive')).toBe(false);
    const moved = tick(ready.state, NONE, DT, true);
    expect(moved.state.run!.distanceM - original.run!.distanceM).toBeCloseTo(speedAt(original.run!.distanceM) * DT, 8);
    const nextFailure = tick({ ...moved.state, run: { ...moved.state.run!, protectionSeconds: 0, angleRad: BALANCE.criticalAngleRad } }, NONE, DT, true).state;
    expect(transition(nextFailure, { type: 'REQUEST_AD' }, MOCK_FLAGS)).toEqual({ state: nextFailure, effects: [] });
  });

  test('protection keeps distance moving, clamps leaning and suppresses event force and scheduling', () => {
    const patch = { distanceM: 70, hasCoffee: true, angleRad: BALANCE.criticalAngleRad * 2, angularVelocity: 10, protectionSeconds: 1.5 };
    const baseline = tick(playing(patch));
    expect(baseline.state.screen).toBe('playing');
    expect(Math.abs(baseline.state.run!.angleRad)).toBeLessThanOrEqual(BALANCE.criticalAngleRad / 2);
    expect(baseline.state.run!.distanceM).toBeGreaterThan(70);
    expect(baseline.state.run!.protectionSeconds).toBeCloseTo(1.5 - DT, 10);
    expect(baseline.effects.some(effect => effect.type === 'fall')).toBe(false);
    const forced = tick(playing({ ...patch, event: event({ phase: 'active', strength: 1000 }) }));
    expect(forced.state.run!.angleRad).toBe(baseline.state.run!.angleRad);
    expect(forced.state.run!.angularVelocity).toBe(baseline.state.run!.angularVelocity);
    const due = tick(playing({ ...patch, nextEventAt: 0 }));
    expect(due.state.run!.event).toBeNull();
    expect(due.effects.some(effect => effect.type === 'eventWarning')).toBe(false);
  });

  test('the full 1.5 seconds of protection expire on active ticks, then normal instant failure returns', () => {
    const protectedState = playing({ distanceM: 80, hasCoffee: true, protectionSeconds: 1.5 });
    const almost = advance(protectedState, 179, { left: false, right: true });
    expect(almost.state.screen).toBe('playing');
    expect(almost.state.run!.protectionSeconds).toBeGreaterThan(0);
    const expired = tick(almost.state, { left: false, right: true });
    expect(expired.state.run!.protectionSeconds).toBe(0);
    expect(expired.state.run!.distanceM).toBeGreaterThan(80);
    const critical = { ...expired.state, run: { ...expired.state.run!, angleRad: BALANCE.criticalAngleRad } };
    expect(tick(critical).state.screen).toBe('result');
  });

  test('protection ending inside a tick does not grant an extra full tick of immunity', () => {
    // Cross the current threshold in the unprotected half, regardless of tuning.
    const patch = { distanceM: 80, hasCoffee: true, angularVelocity: 2 * BALANCE.criticalAngleRad / DT };
    const protectedThroughout = tick(playing({ ...patch, protectionSeconds: DT }));
    expect(protectedThroughout.state.screen).toBe('playing');
    const endsMidTick = tick(playing({ ...patch, protectionSeconds: DT / 2 }));
    expect(endsMidTick.state.screen).toBe('result');
    expect(endsMidTick.state.run!.protectionSeconds).toBe(0);
    expect(endsMidTick.state.run!.elapsedSeconds).toBeGreaterThan(DT / 2);
    expect(endsMidTick.state.run!.elapsedSeconds).toBeLessThan(DT);
    expect(endsMidTick.effects.filter(effect => effect.type === 'fall')).toHaveLength(1);
  });
});
