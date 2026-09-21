import { createGameController } from '../controller';
import type { GameController } from '../controller';
import { BALANCE } from '../balance';
import { transition } from '../engine';
import type { GameEffect, GameState } from '../types';
import type { SceneFrame } from '../../scene/types';

const STEP_MS = 1000 / 120;
const FLAGS = { mockAdsEnabled: false };

function harness(flags = FLAGS) {
  const controller = createGameController(flags);
  let now = 0;
  return {
    controller,
    get now() { return now; },
    seedClock() { controller.advanceFrame(now); },
    at(timestamp: number) { now = timestamp; controller.advanceFrame(now); },
    jump(milliseconds: number) { now += milliseconds; controller.advanceFrame(now); },
    step(count = 1, beforeStep?: (controller: GameController) => void) {
      for (let index = 0; index < count; index += 1) {
        beforeStep?.(controller);
        now += STEP_MS;
        controller.advanceFrame(now);
      }
    },
    start(runId = 1, seed = 98765) {
      controller.dispatch({ type: 'START', runId, seed });
      controller.advanceFrame(now);
    },
  };
}

function playing(flags = FLAGS) {
  const clock = harness(flags);
  clock.start();
  clock.step(360);
  expect(clock.controller.readState().screen).toBe('playing');
  return clock;
}

function balanceWithLegalInputs(controller: GameController): void {
  const run = controller.readState().run!;
  const correction = run.angleRad * 4 + run.angularVelocity;
  controller.setInput('keyboard', 'KeyA', -1, correction > 0.025);
  controller.setInput('keyboard', 'KeyD', 1, correction < -0.025);
}

function fallWithLegalInputs(clock: ReturnType<typeof harness>): void {
  clock.controller.clearInput();
  clock.controller.setInput('touch', 'right-pad', 1, true);
  for (let index = 0; index < 600 && clock.controller.readState().screen === 'playing'; index += 1) {
    clock.step();
  }
  expect(clock.controller.readState().screen).toBe('result');
}

describe('controller fixed-step clock', () => {
  test('starts at a cached title snapshot, and the first timestamp only seeds the clock', () => {
    const clock = harness();
    const initial = clock.controller.getSnapshot();
    expect(initial).toMatchObject({ score: 0, stage: 'street', state: { screen: 'title', run: null } });
    expect(clock.controller.getSnapshot()).toBe(initial);
    clock.controller.dispatch({ type: 'START', runId: 1, seed: 7 });
    const started = clock.controller.readState();
    clock.at(40000);
    expect(clock.controller.readState()).toBe(started);
    clock.step();
    expect(clock.controller.readState().countdownSeconds).toBeCloseTo(3 - BALANCE.fixedDt, 12);
    expect(clock.controller.readState().run!.elapsedSeconds).toBe(0);
  });

  test('publishes countdown integers and the playing boundary immediately', () => {
    const clock = harness();
    const seen: string[] = [];
    clock.controller.subscribe(() => {
      const state = clock.controller.getSnapshot().state;
      seen.push(`${state.screen}:${Math.ceil(state.countdownSeconds)}`);
    });
    clock.start();
    clock.step(359);
    expect(clock.controller.readState().screen).toBe('countdown');
    clock.step();
    expect(clock.controller.getSnapshot().state.screen).toBe('playing');
    expect(seen).toEqual(expect.arrayContaining(['countdown:3', 'countdown:2', 'countdown:1', 'playing:0']));
    expect(clock.controller.readState().run!.stepIndex).toBe(0);
  });

  test('retains partial steps instead of rounding them away on each frame', () => {
    const clock = playing();
    clock.jump(4);
    expect(clock.controller.readState().run!.stepIndex).toBe(0);
    clock.jump(4);
    expect(clock.controller.readState().run!.stepIndex).toBe(0);
    clock.jump(4);
    expect(clock.controller.readState().run!.stepIndex).toBe(1);
    clock.jump(4);
    expect(clock.controller.readState().run!.stepIndex).toBe(1);
    clock.jump(4);
    expect(clock.controller.readState().run!.stepIndex).toBe(2);
  });

  test('30, 60 and 120 Hz yield the identical fixed-tick engine state', () => {
    const states = [30, 60, 120].map((hz) => {
      const controller = createGameController(FLAGS);
      controller.dispatch({ type: 'START', runId: 1, seed: 98765 });
      controller.advanceFrame(0);
      for (let frame = 1; frame <= hz * 4; frame += 1) controller.advanceFrame(frame * 1000 / hz);
      expect(controller.readState().run!.stepIndex).toBe(120);
      return controller.readState();
    });
    expect(states[0]).toEqual(states[1]);
    expect(states[1]).toEqual(states[2]);
  });

  test('100ms consumes twelve fixed ticks, but a longer delta pauses without fast-forwarding', () => {
    const clock = playing();
    clock.jump(100);
    expect(clock.controller.readState().run!.stepIndex).toBe(12);
    const run = clock.controller.readState().run;
    clock.jump(100.1);
    expect(clock.controller.readState()).toMatchObject({ screen: 'paused', resumeTo: 'playing' });
    expect(clock.controller.readState().run).toBe(run);
    clock.jump(10000);
    expect(clock.controller.readState().run).toBe(run);
    expect(clock.controller.readState().screen).toBe('paused');
  });

  test('a delayed countdown frame cannot skip the countdown', () => {
    const clock = harness();
    clock.start();
    clock.jump(4000);
    expect(clock.controller.readState()).toMatchObject({ screen: 'paused', resumeTo: 'countdown', countdownSeconds: 3 });
  });

  test.each([NaN, Infinity, -Infinity])('nonfinite timestamp %s resets rather than poisoning the clock', (invalid) => {
    const clock = playing();
    const before = clock.controller.readState();
    clock.controller.advanceFrame(invalid);
    clock.jump(50);
    expect(clock.controller.readState()).toBe(before);
    clock.step();
    expect(clock.controller.readState().run!.stepIndex).toBe(1);
  });

  test('backward time and an explicit reset discard the old remainder safely', () => {
    const clock = playing();
    clock.jump(4);
    const before = clock.controller.readState();
    clock.at(1000);
    clock.at(2000);
    expect(clock.controller.readState()).toBe(before);
    clock.step();
    expect(clock.controller.readState().run!.stepIndex).toBe(1);
    clock.jump(4);
    clock.controller.resetFrameClock();
    clock.jump(50);
    clock.jump(4);
    expect(clock.controller.readState().run!.stepIndex).toBe(1);
    clock.jump(5);
    expect(clock.controller.readState().run!.stepIndex).toBe(2);
  });
});

describe('controller inputs and pause lifecycle', () => {
  test('releasing one left source preserves other held keys and touch', () => {
    const clock = playing();
    const controller = clock.controller;
    controller.setInput('keyboard', 'ArrowLeft', -1, true);
    controller.setInput('keyboard', 'KeyA', -1, true);
    controller.setInput('touch', 'pointer-1', -1, true);
    controller.setInput('keyboard', 'ArrowLeft', -1, false);
    controller.setInput('touch', 'pointer-1', -1, false);
    const before = controller.readState();
    const expected = transition(before, { type: 'TICK', dt: BALANCE.fixedDt, input: { left: true, right: false } }, FLAGS).state;
    clock.step();
    expect(controller.readState()).toEqual(expected);
    controller.setInput('keyboard', 'KeyA', -1, false);
    const neutral = transition(controller.readState(), { type: 'TICK', dt: BALANCE.fixedDt, input: { left: false, right: false } }, FLAGS).state;
    clock.step();
    expect(controller.readState()).toEqual(neutral);
  });

  test('opposite sources cancel and clearing input releases all sources', () => {
    const clock = playing();
    clock.controller.setInput('keyboard', 'KeyA', -1, true);
    clock.controller.setInput('touch', 'right', 1, true);
    const expected = transition(clock.controller.readState(), { type: 'TICK', dt: BALANCE.fixedDt, input: { left: false, right: false } }, FLAGS).state;
    clock.step();
    expect(clock.controller.readState()).toEqual(expected);
    clock.controller.clearInput();
    const next = transition(expected, { type: 'TICK', dt: BALANCE.fixedDt, input: { left: false, right: false } }, FLAGS).state;
    clock.step();
    expect(clock.controller.readState()).toEqual(next);
  });

  test('pause freezes state and resume clears held inputs and establishes a fresh clock', () => {
    const clock = playing();
    clock.controller.setInput('keyboard', 'KeyA', -1, true);
    clock.controller.dispatch({ type: 'PAUSE' });
    const paused = clock.controller.readState();
    clock.step(200);
    expect(clock.controller.readState()).toBe(paused);
    clock.controller.dispatch({ type: 'RESUME' });
    const resumed = clock.controller.readState();
    clock.step();
    expect(clock.controller.readState()).toBe(resumed);
    clock.step();
    const expected = transition(resumed, { type: 'TICK', dt: BALANCE.fixedDt, input: { left: false, right: false } }, FLAGS).state;
    expect(clock.controller.readState()).toEqual(expected);
  });

  test('START clears title inputs and HOME publishes an empty scene', () => {
    const clock = harness();
    const frames: SceneFrame[] = [];
    clock.controller.subscribeFrame((frame) => frames.push(frame));
    clock.controller.setInput('keyboard', 'KeyA', -1, true);
    clock.start();
    clock.step(360);
    const expected = transition(clock.controller.readState(), { type: 'TICK', dt: BALANCE.fixedDt, input: { left: false, right: false } }, FLAGS).state;
    clock.step();
    expect(clock.controller.readState()).toEqual(expected);
    clock.controller.dispatch({ type: 'PAUSE' });
    clock.controller.dispatch({ type: 'HOME' });
    expect(clock.controller.getSnapshot()).toMatchObject({ score: 0, stage: 'street', state: { screen: 'title', run: null } });
    expect(frames.at(-1)).toEqual({ distanceM: 0, elapsedSeconds: 0, angleRad: 0, angularVelocity: 0,
      hasCoffee: false, protectionSeconds: 0, playing: false, fallen: false, seed: 0 });
  });
});

describe('snapshots, frames and one-shot effects', () => {
  test('caches the React snapshot between publications while frames stay current', () => {
    const clock = playing();
    const controller = clock.controller;
    const cached = controller.getSnapshot();
    const frames: SceneFrame[] = [];
    const publishedAt: number[] = [];
    controller.subscribeFrame((frame) => frames.push(frame));
    controller.subscribe(() => publishedAt.push(clock.now));
    clock.step();
    expect(controller.getSnapshot()).toBe(cached);
    expect(controller.readState()).not.toBe(cached.state);
    expect(frames.at(-1)!.distanceM).toBe(controller.readState().run!.distanceM);
    expect(frames.at(-1)!.playing).toBe(true);
    clock.step(119);
    expect(controller.getSnapshot()).not.toBe(cached);
    expect(frames).toHaveLength(120);
    expect(publishedAt.length).toBeLessThanOrEqual(10);
    for (let index = 1; index < publishedAt.length; index += 1) {
      expect(publishedAt[index] - publishedAt[index - 1]).toBeGreaterThanOrEqual(100 - 1e-8);
    }
  });

  test('scene frames are emitted once per display frame even if it contains multiple ticks', () => {
    const clock = playing();
    const listener = jest.fn();
    clock.controller.subscribeFrame(listener);
    clock.jump(100);
    expect(clock.controller.readState().run!.stepIndex).toBe(12);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('coffee, office, event phases and first 100 are immediately visible without a 100 effect', () => {
    const clock = playing();
    const milestones: number[] = [];
    const phases = new Set<string>();
    const effects: GameEffect[] = [];
    let coffeeObserved = false;
    let officeObserved = false;
    clock.controller.subscribe(() => {
      const snapshot = clock.controller.getSnapshot();
      const run = snapshot.state.run!;
      if (run.hasCoffee && !coffeeObserved) {
        coffeeObserved = true;
        expect(snapshot.score).toBe(15);
        expect(run.stepIndex).toBe(clock.controller.readState().run!.stepIndex);
      }
      if (snapshot.stage === 'office' && !officeObserved) {
        officeObserved = true;
        expect(snapshot.score).toBe(51);
      }
      if (snapshot.score >= 100 && milestones.length === 0) {
        milestones.push(snapshot.score);
        expect(snapshot.state).toBe(clock.controller.readState());
      }
      phases.add(run.event?.phase ?? 'none');
    });
    clock.controller.subscribeEffects((batch) => effects.push(...batch));
    let exactHundredCrossings = 0;
    for (let index = 0; index < 14000 && clock.controller.readState().run!.distanceM < 101; index += 1) {
      const before = clock.controller.readState().run!;
      clock.step(1, balanceWithLegalInputs);
      const current = clock.controller.readState();
      const after = current.run!;
      const crossedHundred = before.distanceM < 100 && after.distanceM >= 100;
      const boundary = before.hasCoffee !== after.hasCoffee ||
        (before.distanceM < 51 && after.distanceM >= 51) || crossedHundred ||
        before.event?.phase !== after.event?.phase;
      if (boundary) expect(clock.controller.getSnapshot().state).toBe(current);
      if (crossedHundred) exactHundredCrossings += 1;
    }
    expect(clock.controller.readState().screen).toBe('playing');
    expect(clock.controller.readState().run!.distanceM).toBeGreaterThanOrEqual(101);
    expect(coffeeObserved).toBe(true);
    expect(officeObserved).toBe(true);
    expect(milestones).toEqual([100]);
    expect(exactHundredCrossings).toBe(1);
    expect(phases).toEqual(new Set(['none', 'warning', 'active']));
    expect(effects.filter((effect) => effect.type === 'coffee')).toHaveLength(1);
    expect(effects.every((effect) => ['footstep', 'wobble', 'coffee', 'eventWarning'].includes(effect.type))).toBe(true);
  });

  test('a fall freezes the score, emits once and retry gets a fresh run', () => {
    const clock = playing();
    const effects: GameEffect[] = [];
    clock.controller.subscribeEffects((batch) => effects.push(...batch));
    fallWithLegalInputs(clock);
    const result = clock.controller.readState();
    expect(clock.controller.getSnapshot().state).toBe(result);
    clock.step(120);
    expect(clock.controller.readState()).toBe(result);
    expect(effects.filter((effect) => effect.type === 'fall')).toEqual([{ type: 'fall', runId: 1 }]);
    clock.controller.dispatch({ type: 'START', runId: 2, seed: 123 });
    expect(clock.controller.getSnapshot()).toMatchObject({ score: 0, state: {
      screen: 'countdown', countdownSeconds: 3, run: { id: 2, seed: 123, distanceM: 0, elapsedSeconds: 0, reviveUsed: false },
    } });
    const restarted = clock.controller.readState();
    clock.step();
    expect(clock.controller.readState()).toBe(restarted);
  });

  test('reentrant effect commands do not duplicate effects or simulate the new run in the old frame', () => {
    const clock = playing();
    const observed: Array<{ effect: GameEffect; state: GameState }> = [];
    clock.controller.subscribeEffects((batch) => {
      if (batch.some((effect) => effect.type === 'fall')) {
        clock.controller.dispatch({ type: 'START', runId: 2, seed: 10 });
      }
      batch.length = 0; // A subscriber cannot drain another subscriber's batch.
    });
    clock.controller.subscribeEffects((batch, state) => batch.forEach((effect) => observed.push({ effect, state })));
    clock.controller.setInput('touch', 'right', 1, true);
    for (let index = 0; index < 600 && clock.controller.readState().run!.id === 1; index += 1) clock.step();
    expect(clock.controller.readState()).toMatchObject({ screen: 'countdown', countdownSeconds: 3, run: { id: 2, stepIndex: 0 } });
    const falls = observed.filter((item) => item.effect.type === 'fall');
    expect(falls).toHaveLength(1);
    expect(falls[0].state).toMatchObject({ screen: 'result', run: { id: 1 } });
  });

  test('reentrant snapshot pause stops the remaining fixed steps', () => {
    const clock = harness();
    clock.controller.subscribe(() => {
      if (clock.controller.getSnapshot().state.screen === 'playing') clock.controller.dispatch({ type: 'PAUSE' });
    });
    clock.start();
    clock.step(359);
    clock.jump(100);
    expect(clock.controller.readState()).toMatchObject({ screen: 'paused', resumeTo: 'playing', run: { stepIndex: 0, distanceM: 0 } });
  });

  test('unsubscribe and disposal are idempotent, and disposed controllers are inert', () => {
    const clock = playing();
    const snapshotListener = jest.fn();
    const frameListener = jest.fn();
    const effectListener = jest.fn();
    const unsubscribe = clock.controller.subscribe(snapshotListener);
    unsubscribe();
    unsubscribe();
    clock.controller.subscribeFrame(frameListener);
    clock.controller.subscribeEffects(effectListener);
    const before = clock.controller.readState();
    const snapshot = clock.controller.getSnapshot();
    clock.controller.dispose();
    clock.controller.dispose();
    clock.controller.dispatch({ type: 'PAUSE' });
    clock.controller.setInput('touch', 'right', 1, true);
    clock.controller.clearInput();
    clock.controller.resetFrameClock();
    clock.step(100);
    clock.controller.subscribe(snapshotListener)();
    expect(clock.controller.readState()).toBe(before);
    expect(clock.controller.getSnapshot()).toBe(snapshot);
    expect(snapshotListener).not.toHaveBeenCalled();
    expect(frameListener).not.toHaveBeenCalled();
    expect(effectListener).not.toHaveBeenCalled();
  });
});

describe('mock-ad clock isolation', () => {
  test('copies and validates feature flags instead of reading later mutations', () => {
    const flags = { mockAdsEnabled: false };
    const clock = playing(flags);
    flags.mockAdsEnabled = true;
    fallWithLegalInputs(clock);
    const result = clock.controller.readState();
    clock.controller.dispatch({ type: 'REQUEST_AD' });
    expect(clock.controller.readState()).toBe(result);
    const malformed = playing({ mockAdsEnabled: 'true' as unknown as boolean });
    fallWithLegalInputs(malformed);
    malformed.controller.dispatch({ type: 'REQUEST_AD' });
    expect(malformed.controller.readState().screen).toBe('result');
  });

  test('a delayed ad frame pauses and cannot award a revive', () => {
    const clock = playing({ mockAdsEnabled: true });
    fallWithLegalInputs(clock);
    clock.controller.dispatch({ type: 'REQUEST_AD' });
    clock.seedClock();
    clock.jump(5001);
    expect(clock.controller.readState()).toMatchObject({ screen: 'paused', resumeTo: 'ad', adSeconds: 5, run: { reviveUsed: false } });
  });

  test('ad completion emits one revive and discards leftover time before its new countdown', () => {
    const clock = playing({ mockAdsEnabled: true });
    const effects: GameEffect[] = [];
    clock.controller.subscribeEffects((batch) => effects.push(...batch));
    fallWithLegalInputs(clock);
    clock.controller.dispatch({ type: 'REQUEST_AD' });
    clock.seedClock();
    clock.step(599);
    clock.jump(100);
    expect(clock.controller.readState()).toMatchObject({ screen: 'countdown', countdownSeconds: 3, run: { reviveUsed: true } });
    expect(effects.filter((effect) => effect.type === 'revive')).toEqual([{ type: 'revive', runId: 1 }]);
    clock.step(360);
    expect(clock.controller.readState().screen).toBe('playing');
    expect(effects.filter((effect) => effect.type === 'revive')).toHaveLength(1);
  });
});
