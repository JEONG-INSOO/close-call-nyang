import { createInputRegistry } from '../input/inputState';
import type { SceneFrame } from '../scene/types';
import { BALANCE } from './balance';
import { scoreOf, stageOf } from './difficulty';
import { createInitialState, transition } from './engine';
import type { GameAction, GameEffect, GameState } from './types';

export type ControlAction = Exclude<GameAction, { type: 'TICK' }>;
export type InputSource = 'touch' | 'keyboard';

export interface PlayedTick {
  runId: number;
  tickIndex: number;
  direction: -1 | 0 | 1;
  terminal: boolean;
}

export interface ControllerSnapshot {
  state: GameState;
  score: number;
  stage: 'street' | 'office';
}

export interface GameController {
  getSnapshot(): ControllerSnapshot;
  readState(): GameState;
  subscribe(listener: () => void): () => void;
  subscribeFrame(listener: (frame: SceneFrame) => void): () => void;
  subscribeEffects(listener: (effects: GameEffect[], state: GameState) => void): () => void;
  subscribeTicks(listener: (tick: PlayedTick) => void): () => void;
  dispatch(action: ControlAction): void;
  restore(state: GameState): boolean;
  setInput(source: InputSource, id: string, direction: -1 | 1, down: boolean): void;
  clearInput(): void;
  advanceFrame(timestampMs: number): void;
  resetFrameClock(): void;
  dispose(): void;
}

const MAX_FRAME_DELTA_MS = 100;
const MAX_STEPS_PER_FRAME = 12;
const SNAPSHOT_INTERVAL_MS = 100;
const STEP_EPSILON_SECONDS = 1e-10;

function snapshotOf(state: GameState): ControllerSnapshot {
  const distance = state.run?.distanceM ?? 0;
  return { state, score: scoreOf(distance), stage: stageOf(distance) };
}

function sceneFrameOf(state: GameState): SceneFrame {
  const run = state.run;
  return {
    distanceM: run?.distanceM ?? 0,
    elapsedSeconds: run?.elapsedSeconds ?? 0,
    angleRad: run?.angleRad ?? 0,
    angularVelocity: run?.angularVelocity ?? 0,
    hasCoffee: run?.hasCoffee ?? false,
    protectionSeconds: run?.protectionSeconds ?? 0,
    playing: state.screen === 'playing',
    fallen: state.screen === 'result' || state.screen === 'ad' ||
      (state.screen === 'paused' && state.resumeTo === 'ad'),
    seed: run?.seed ?? 0,
  };
}

function immediateSnapshot(previous: GameState, next: GameState): boolean {
  const before = previous.run;
  const after = next.run;
  return previous.screen !== next.screen || before?.id !== after?.id ||
    Math.ceil(previous.countdownSeconds) !== Math.ceil(next.countdownSeconds) ||
    Math.ceil(previous.adSeconds) !== Math.ceil(next.adSeconds) ||
    before?.hasCoffee !== after?.hasCoffee ||
    stageOf(before?.distanceM ?? 0) !== stageOf(after?.distanceM ?? 0) ||
    (scoreOf(before?.distanceM ?? 0) < 100 && scoreOf(after?.distanceM ?? 0) >= 100) ||
    before?.event?.id !== after?.event?.id ||
    before?.event?.direction !== after?.event?.direction ||
    before?.event?.phase !== after?.event?.phase;
}

function isRunning(state: GameState): boolean {
  return state.screen === 'playing' || state.screen === 'countdown' || state.screen === 'ad';
}

/** Owns timing and input, while the engine remains the only gameplay rule source. */
export function createGameController(flags: { mockAdsEnabled: boolean }): GameController {
  const engineFlags = { mockAdsEnabled: flags?.mockAdsEnabled === true };
  const input = createInputRegistry();
  let state = createInitialState();
  let snapshot = snapshotOf(state);
  let previousTimestamp: number | null = null;
  let activeTimestamp: number | null = null;
  let lastReactPublishMs: number | null = null;
  let accumulator = 0;
  let clockGeneration = 0;
  let disposed = false;
  let advancing = false;
  let transitioning = false;
  let drainingActions = false;
  let lastFrameState: GameState | null = null;
  const actions: ControlAction[] = [];
  const listeners = new Set<() => void>();
  const frameListeners = new Set<(frame: SceneFrame) => void>();
  const effectListeners = new Set<(effects: GameEffect[], state: GameState) => void>();
  const tickListeners = new Set<(tick: PlayedTick) => void>();

  function resetClock(): void {
    previousTimestamp = null;
    accumulator = 0;
    lastReactPublishMs = null;
    clockGeneration += 1;
  }

  function publishSnapshot(): void {
    if (disposed || snapshot.state === state) return;
    snapshot = snapshotOf(state);
    lastReactPublishMs = activeTimestamp;
    for (const listener of [...listeners]) {
      if (disposed) break;
      if (listeners.has(listener)) listener();
    }
  }

  function publishFrame(): void {
    if (disposed || lastFrameState === state) return;
    lastFrameState = state;
    const frame = sceneFrameOf(state);
    for (const listener of [...frameListeners]) {
      if (disposed) break;
      if (frameListeners.has(listener)) listener({ ...frame });
    }
  }

  function applyAction(action: GameAction, isControlAction: boolean): void {
    if (disposed) return;
    transitioning = true;
    try {
      const previous = state;
      const next = transition(previous, action, engineFlags);
      if (next.state === previous) return;
      state = next.state;
      // Observe every authoritative fixed tick, including a partial falling tick,
      // before publishing result snapshots. Reentrant controls remain queued.
      if (action.type === 'TICK' && previous.screen === 'playing' && previous.run &&
          state.run?.id === previous.run.id && state.run.stepIndex === previous.run.stepIndex + 1) {
        const tick: PlayedTick = {
          runId: state.run.id,
          tickIndex: state.run.stepIndex,
          direction: action.input.left === action.input.right ? 0 : action.input.left ? -1 : 1,
          terminal: state.screen === 'result',
        };
        for (const listener of [...tickListeners]) {
          if (disposed) break;
          if (tickListeners.has(listener)) listener({ ...tick });
        }
      }
      if (isControlAction) {
        input.clear();
        resetClock();
      } else if (state.screen === 'result' || (previous.screen === 'ad' && state.screen === 'countdown')) {
        input.clear();
      }
      if (isControlAction || immediateSnapshot(previous, state)) publishSnapshot();
      if (isControlAction) publishFrame();
      const effectState = state;
      if (next.effects.length > 0) {
        for (const listener of [...effectListeners]) {
          if (disposed) break;
          if (effectListeners.has(listener)) {
            listener(next.effects.map((effect) => ({ ...effect })), effectState);
          }
        }
      }
    } finally {
      transitioning = false;
    }
  }

  // Subscribers may request PAUSE/HOME during effects or state notifications.
  // Finish the current notification first, then process each command exactly once.
  function drainActions(): void {
    if (disposed || transitioning || drainingActions) return;
    drainingActions = true;
    try {
      while (!disposed && actions.length > 0) applyAction(actions.shift()!, true);
    } finally {
      drainingActions = false;
    }
  }

  function subscribe<T>(set: Set<T>, listener: T): () => void {
    if (disposed) return () => {};
    set.add(listener);
    return () => { set.delete(listener); };
  }

  function dispatch(action: ControlAction): void {
    if (disposed) return;
    actions.push(action);
    drainActions();
  }

  function advanceFrame(timestampMs: number): void {
    if (disposed || advancing || transitioning || drainingActions) return;
    if (!Number.isFinite(timestampMs)) {
      resetClock();
      return;
    }
    if (previousTimestamp === null) {
      previousTimestamp = timestampMs;
      lastReactPublishMs = timestampMs;
      return;
    }
    const deltaMs = timestampMs - previousTimestamp;
    if (deltaMs < 0 || !Number.isFinite(deltaMs)) {
      resetClock();
      return;
    }
    previousTimestamp = timestampMs;
    if (deltaMs > MAX_FRAME_DELTA_MS) {
      input.clear();
      resetClock();
      if (isRunning(state)) dispatch({ type: 'PAUSE' });
      return;
    }
    if (!isRunning(state)) {
      accumulator = 0;
      return;
    }

    advancing = true;
    activeTimestamp = timestampMs;
    accumulator += deltaMs / 1000;
    try {
      let steps = 0;
      while (!disposed && accumulator + STEP_EPSILON_SECONDS >= BALANCE.fixedDt && steps < MAX_STEPS_PER_FRAME) {
        accumulator -= BALANCE.fixedDt;
        if (accumulator < 0 && accumulator > -STEP_EPSILON_SECONDS) accumulator = 0;
        steps += 1;
        const previousScreen = state.screen;
        const generation = clockGeneration;
        applyAction({ type: 'TICK', dt: BALANCE.fixedDt, input: input.read() }, false);
        drainActions();
        if (clockGeneration !== generation || !isRunning(state) ||
            (previousScreen === 'ad' && state.screen === 'countdown')) {
          accumulator = 0;
          break;
        }
      }
      // Shared scene values update once per display frame, not React's 10 Hz cadence.
      transitioning = true;
      try {
        publishFrame();
        if (lastReactPublishMs === null || timestampMs - lastReactPublishMs >= SNAPSHOT_INTERVAL_MS) {
          publishSnapshot();
        }
      } finally {
        transitioning = false;
      }
      drainActions();
    } finally {
      activeTimestamp = null;
      advancing = false;
    }
  }

  return {
    getSnapshot: () => snapshot,
    readState: () => state,
    subscribe: (listener) => subscribe(listeners, listener),
    subscribeFrame: (listener) => subscribe(frameListeners, listener),
    subscribeEffects: (listener) => subscribe(effectListeners, listener),
    subscribeTicks: (listener) => subscribe(tickListeners, listener),
    dispatch,
    restore(nextState) {
      if (disposed || nextState.screen !== 'paused') return false;
      state = { ...nextState, run: nextState.run ? { ...nextState.run, event: nextState.run.event ? { ...nextState.run.event } : null } : null };
      input.clear();
      resetClock();
      publishSnapshot();
      publishFrame();
      return true;
    },
    setInput(source, id, direction, down) {
      if (!disposed) input.set(source, id, direction, down);
    },
    clearInput() { if (!disposed) input.clear(); },
    advanceFrame,
    resetFrameClock() { if (!disposed) resetClock(); },
    dispose() {
      if (disposed) return;
      disposed = true;
      input.clear();
      resetClock();
      actions.length = 0;
      listeners.clear();
      frameListeners.clear();
      effectListeners.clear();
      tickListeners.clear();
    },
  };
}
