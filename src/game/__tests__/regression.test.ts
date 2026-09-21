import { getFeatureFlags } from '../../config/app';
import { BALANCE } from '../balance';
import { createGameController, type GameController } from '../controller';
import { createInitialState, transition } from '../engine';
import { scoreOf, stageOf } from '../difficulty';
import type { GameEffect, GameState, InputState } from '../types';

const DT = 1 / 120;
const RELEASE = getFeatureFlags(false, 'true');
const MOCK = getFeatureFlags(true, 'true');
const NO_INPUT: InputState = { left: false, right: false };

function clock(hz: number, flags = RELEASE) {
  const controller = createGameController(flags);
  let now = 0;
  const effects: Array<{ effect: GameEffect; at: number }> = [];
  controller.subscribeEffects((batch, state) => {
    for (const effect of batch) effects.push({ effect, at: state.run?.elapsedSeconds ?? 0 });
  });
  return {
    controller, effects,
    start(runId = 1, seed = 241) {
      controller.dispatch({ type: 'START', runId, seed });
      controller.advanceFrame(now);
    },
    advance(seconds: number) {
      const frames = Math.round(seconds * hz);
      expect(frames / hz).toBeCloseTo(seconds, 10);
      const began = now;
      for (let index = 1; index <= frames; index += 1) controller.advanceFrame(began + index * 1000 / hz);
      now = began + seconds * 1000;
    },
    gap(seconds: number) { now += seconds * 1000; controller.advanceFrame(now); },
    seedClock() { controller.advanceFrame(now); },
    get now() { return now; },
  };
}

function feedback(state: GameState): InputState {
  // Unit-only ordinary left/right feedback. Not an App cheat or human survival evidence.
  const correction = state.run!.angleRad * 4 + state.run!.angularVelocity;
  return { left: correction > 0.025, right: correction < -0.025 };
}
function applyFeedback(controller: GameController) {
  const input = feedback(controller.readState());
  controller.setInput('keyboard', 'KeyA', -1, input.left);
  controller.setInput('keyboard', 'KeyD', 1, input.right);
}
function tick(state: GameState, input = NO_INPUT) {
  return transition(state, { type: 'TICK', dt: DT, input }, RELEASE);
}

describe('whole-run fixed-time and production regressions', () => {
  it('replays two complete held-input/pause/fall/retry flows identically at 30/60/120 Hz', () => {
    const replays = [30, 60, 120].map(hz => {
      const time = clock(hz);
      const game = time.controller;
      const checkpoints: GameState[] = [];
      time.start(); time.advance(3);
      expect(game.readState().screen).toBe('playing');
      game.setInput('keyboard', 'KeyA', -1, true);
      game.setInput('keyboard', 'ArrowLeft', -1, true);
      game.setInput('touch', 'right-finger', 1, true);
      time.advance(0.2); checkpoints.push(game.readState());
      game.setInput('keyboard', 'KeyA', -1, false);
      time.advance(0.2); checkpoints.push(game.readState());
      game.setInput('keyboard', 'ArrowLeft', -1, false);
      time.advance(0.1); checkpoints.push(game.readState());
      game.dispatch({ type: 'PAUSE' });
      const paused = game.readState();
      time.gap(10); time.advance(1);
      expect(game.readState()).toBe(paused);
      game.dispatch({ type: 'RESUME' }); time.seedClock();
      time.advance(0.2); checkpoints.push(game.readState());
      game.setInput('touch', 'right-finger', 1, true);
      time.advance(2);
      expect(game.readState().screen).toBe('result');
      checkpoints.push(game.readState());
      time.start(2); time.advance(3);
      expect(game.readState()).toMatchObject({ screen: 'playing', run: { id: 2, distanceM: 0, reviveUsed: false } });
      game.setInput('touch', 'left-finger', -1, true);
      game.setInput('keyboard', 'KeyD', 1, true);
      time.advance(0.2); game.clearInput(); time.advance(0.2);
      checkpoints.push(game.readState());
      game.setInput('touch', 'left-finger', -1, true); time.advance(2);
      expect(game.readState().screen).toBe('result');
      checkpoints.push(game.readState());
      expect(time.effects.filter(item => item.effect.type === 'fall').map(item => item.effect.runId)).toEqual([1, 2]);
      const effects = [...time.effects];
      game.dispose();
      return { checkpoints, effects };
    });
    expect(replays[0]).toEqual(replays[1]);
    expect(replays[1]).toEqual(replays[2]);
  });

  it.each(['manual-pause', 'late-frame'] as const)('never converts hidden-tab time into mock rewards (%s)', interruption => {
    const time = clock(120, MOCK);
    const game = time.controller;
    time.start(); time.advance(3);
    game.setInput('touch', 'right', 1, true); time.advance(2);
    expect(game.readState().screen).toBe('result');
    const distance = game.readState().run!.distanceM;
    game.dispatch({ type: 'REQUEST_AD' }); time.seedClock(); time.advance(2);
    const remaining = game.readState().adSeconds;
    expect(remaining).toBeCloseTo(3, 8);
    if (interruption === 'manual-pause') game.dispatch({ type: 'PAUSE' });
    time.gap(60);
    expect(game.readState()).toMatchObject({ screen: 'paused', resumeTo: 'ad', run: { reviveUsed: false, distanceM: distance } });
    expect(game.readState().adSeconds).toBe(remaining);
    time.advance(10); game.dispatch({ type: 'REQUEST_AD' });
    expect(game.readState().adSeconds).toBe(remaining);
    expect(time.effects.filter(item => item.effect.type === 'revive')).toHaveLength(0);
    game.dispatch({ type: 'RESUME' }); time.seedClock(); time.advance(359 / 120);
    expect(game.readState().screen).toBe('ad');
    expect(game.readState().run!.reviveUsed).toBe(false);
    time.advance(DT);
    expect(game.readState()).toMatchObject({ screen: 'countdown', countdownSeconds: 3, run: { reviveUsed: true, distanceM: distance } });
    expect(time.effects.filter(item => item.effect.type === 'revive')).toHaveLength(1);
    game.dispatch({ type: 'REQUEST_AD' });
    expect(game.readState().countdownSeconds).toBe(3);
    game.dispose();
  });

  it.each(['true', 'TRUE', '1', undefined])('rejects direct reward dispatch spam in production even with env=%s', env => {
    const flags = getFeatureFlags(false, env);
    const time = clock(60, flags);
    const game = time.controller;
    time.start(); time.advance(3);
    game.setInput('keyboard', 'KeyD', 1, true); time.advance(2);
    const result = game.readState();
    expect(result.screen).toBe('result');
    for (let index = 0; index < 100; index += 1) {
      game.dispatch({ type: 'REQUEST_AD' }); game.dispatch({ type: 'CANCEL_AD' }); game.dispatch({ type: 'RESUME' });
      time.gap(10);
    }
    expect(game.readState()).toBe(result);
    expect(result.run!.reviveUsed).toBe(false);
    expect(time.effects.filter(item => item.effect.type === 'revive')).toHaveLength(0);
    // Even a forged, near-complete ad fixture cannot obtain the reward with release flags.
    const forged: GameState = { ...result, screen: 'ad', adSeconds: DT };
    expect(transition(forged, { type: 'TICK', dt: DT, input: NO_INPUT }, flags)).toEqual({ state: forged, effects: [] });
    game.dispose();
  });

  it('preserves ~90 active seconds to 100 through an hour-long pause, bounded steps and no 100 effect', () => {
    const time = clock(120);
    const game = time.controller;
    time.start(1, 98765); time.advance(3);
    let paused = false;
    let crossed = false;
    for (let index = 0; index < 15000 && game.readState().run!.distanceM < 102; index += 1) {
      const before = game.readState().run!;
      if (!paused && before.distanceM >= 50) {
        game.dispatch({ type: 'PAUSE' }); time.gap(3600);
        expect(game.readState().run).toBe(before);
        game.dispatch({ type: 'RESUME' }); time.seedClock(); paused = true;
      }
      const effectCount = time.effects.length;
      applyFeedback(game); time.advance(DT);
      const after = game.readState().run!;
      expect(game.readState().screen).toBe('playing');
      if (before.distanceM < 100 && after.distanceM >= 100) {
        crossed = true;
        expect(after.elapsedSeconds).toBeGreaterThanOrEqual(89.5);
        expect(after.elapsedSeconds).toBeLessThanOrEqual(90.5);
        expect(game.getSnapshot().score).toBe(100);
        expect(game.getSnapshot().state).toBe(game.readState());
        expect(time.effects.slice(effectCount).every(item => ['footstep', 'wobble', 'eventWarning'].includes(item.effect.type))).toBe(true);
      }
    }
    expect(paused && crossed).toBe(true);
    expect(game.readState().run!.distanceM).toBeGreaterThanOrEqual(102);
    expect(time.now).toBeGreaterThan(3600 * 1000);
    expect(time.effects.filter(item => item.effect.type === 'coffee')).toHaveLength(1);
    const steps = time.effects.filter(item => item.effect.type === 'footstep');
    expect(steps.length).toBeGreaterThan(100);
    expect(steps.length).toBeLessThanOrEqual(Math.ceil(game.readState().run!.elapsedSeconds / 0.18));
    for (let index = 1; index < steps.length; index += 1) expect(steps[index].at - steps[index - 1].at).toBeGreaterThanOrEqual(0.18 - 1e-8);
    expect(time.effects.every(item => ['footstep', 'coffee', 'wobble', 'eventWarning'].includes(item.effect.type))).toBe(true);
    game.dispose();
  });
});

describe('isolated 1000 m fixture stability (not production gameplay evidence)', () => {
  it('replays finite uncapped state and event forces deterministically after their visible warnings', () => {
    const started = transition(createInitialState(), { type: 'START', runId: 7, seed: 98765 }, RELEASE).state;
    const fixture: GameState = { ...started, screen: 'playing', countdownSeconds: 0,
      run: { ...started.run!, distanceM: 1000, elapsedSeconds: 400, hasCoffee: true,
        stepIndex: 48000, nextFootstepAt: 400.18, lastWobbleAt: 398.5, nextEventAt: 401 } };
    let first = fixture;
    let second: GameState = { ...fixture, run: { ...fixture.run! } };
    let warnings = 0;
    let forceChecks = 0;
    let warnedAt = -Infinity;
    const footsteps: number[] = [];
    for (let index = 0; index < 3600; index += 1) {
      const input = feedback(first);
      const before = first.run!;
      const next = tick(first, input);
      const replay = tick(second, input);
      expect(next).toEqual(replay);
      expect(next.state.screen).toBe('playing');
      const run = next.state.run!;
      for (const value of Object.values(run)) if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
      if (next.effects.some(effect => effect.type === 'eventWarning')) {
        warnings += 1;
        expect(run.event?.phase).toBe('warning');
        expect(['urgentEdit', 'bossCall', 'longMeeting']).toContain(run.event?.id);
        warnedAt = run.elapsedSeconds - (BALANCE.warningSeconds - run.event!.remainingSeconds);
      }
      if (before.event?.phase === 'warning' && before.event.remainingSeconds > DT * 1.01) {
        const neutral = tick({ ...first, run: { ...before, event: null, nextEventAt: Number.MAX_VALUE } }, input);
        expect(run.angularVelocity).toBe(neutral.state.run!.angularVelocity);
      }
      if (before.event?.phase === 'active' && before.event.remainingSeconds > BALANCE.activeEventSeconds - DT * 1.01) {
        expect(before.elapsedSeconds - warnedAt).toBeGreaterThanOrEqual(1.2 - DT - 1e-8);
        const neutral = tick({ ...first, run: { ...before, event: null, nextEventAt: Number.MAX_VALUE } }, input);
        expect((run.angularVelocity - neutral.state.run!.angularVelocity) * before.event.direction).toBeGreaterThan(0);
        forceChecks += 1;
      }
      expect(next.effects.filter(effect => effect.type === 'footstep').length).toBeLessThanOrEqual(1);
      if (next.effects.some(effect => effect.type === 'footstep')) footsteps.push(run.elapsedSeconds);
      first = next.state; second = replay.state;
    }
    expect(warnings).toBeGreaterThanOrEqual(3);
    expect(forceChecks).toBeGreaterThanOrEqual(3);
    expect(scoreOf(first.run!.distanceM)).toBeGreaterThan(1000);
    expect(stageOf(first.run!.distanceM)).toBe('office');
    for (let index = 1; index < footsteps.length; index += 1) expect(footsteps[index] - footsteps[index - 1]).toBeGreaterThanOrEqual(0.18 - 1e-8);
  });
});
