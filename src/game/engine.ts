import { BALANCE } from './balance';
import { adaptationAt, balanceDrift, difficultyAt, stageOf } from './difficulty';
import { quantize, stableSin } from './deterministicMath';
import { nextRandom } from './random';
import type {
  Difficulty, EventId, GameAction, GameEffect, GameState,
  InputState, RunState, Transition,
} from './types';

type Flags = Readonly<{ mockAdsEnabled: boolean }>;

const STREET_EVENTS: readonly EventId[] = ['coffeeRush', 'lateCommute'];
const OFFICE_EVENTS: readonly EventId[] = ['urgentEdit', 'bossCall', 'longMeeting'];
const UINT32_MAX = 0xffffffff;

export function createInitialState(): GameState {
  return {
    screen: 'title', run: null, resumeTo: null,
    countdownSeconds: 0, adSeconds: 0,
  };
}

function unchanged(state: GameState): Transition {
  return { state, effects: [] };
}

function createRun(id: number, seed: number): RunState {
  const normalizedSeed = seed === 0 ? 1 : seed >>> 0;
  const initialRandom = nextRandom(normalizedSeed);
  return {
    id, seed: normalizedSeed, rng: initialRandom.state,
    distanceM: 0, elapsedSeconds: 0,
    angleRad: initialRandom.value < 0.5 ? -0.025 : 0.025,
    angularVelocity: 0, hasCoffee: false, reviveUsed: false,
    protectionSeconds: 0, event: null, nextEventAt: Number.MAX_VALUE,
    stepIndex: 0, nextFootstepAt: BALANCE.footstepBaseSeconds,
    lastWobbleAt: -BALANCE.wobbleCooldownSeconds,
  };
}

function validInput(input: InputState): boolean {
  return input != null && typeof input.left === 'boolean' && typeof input.right === 'boolean';
}

function validRun(run: RunState): boolean {
  const numbers = [
    run.id, run.seed, run.rng, run.distanceM, run.elapsedSeconds,
    run.angleRad, run.angularVelocity, run.protectionSeconds,
    run.nextEventAt, run.stepIndex, run.nextFootstepAt, run.lastWobbleAt,
  ];
  if (!numbers.every(Number.isFinite) || run.distanceM < 0 || run.elapsedSeconds < 0 ||
      run.protectionSeconds < 0 || !Number.isSafeInteger(run.stepIndex) || run.stepIndex < 0) {
    return false;
  }
  const event = run.event;
  return event === null || (
    (event.direction === -1 || event.direction === 1) &&
    (event.phase === 'warning' || event.phase === 'active') &&
    Number.isFinite(event.remainingSeconds) && event.remainingSeconds >= 0 &&
    Number.isFinite(event.strength) && event.strength >= 0
  );
}

function result(state: GameState, run: RunState, effects: GameEffect[]): Transition {
  effects.push({ type: 'fall', runId: run.id });
  return {
    state: { ...state, screen: 'result', run, resumeTo: null, countdownSeconds: 0, adSeconds: 0 },
    effects,
  };
}

// A finite previous checkpoint is retained when numeric precision is exhausted.
function numericFailure(state: GameState, run: RunState, effects: GameEffect[]): Transition {
  run.angleRad = run.angleRad < 0 ? -BALANCE.criticalAngleRad : BALANCE.criticalAngleRad;
  return result(state, run, effects);
}

// This mutates only the private per-transition copy, never the caller's run/event.
function settleEventBoundary(run: RunState, difficulty: Difficulty, effects: GameEffect[]): void {
  if (run.protectionSeconds <= BALANCE.timerEpsilon) run.protectionSeconds = 0;
  if (run.event && run.event.remainingSeconds <= BALANCE.timerEpsilon) {
    if (run.event.phase === 'warning') {
      run.event.phase = 'active';
      run.event.remainingSeconds = BALANCE.activeEventSeconds;
    } else {
      run.event = null;
      run.nextEventAt = run.elapsedSeconds + difficulty.eventIntervalSeconds;
    }
  }
  if (run.event || !run.hasCoffee || run.protectionSeconds > 0 ||
      run.nextEventAt - run.elapsedSeconds > BALANCE.timerEpsilon) return;

  const choice = nextRandom(run.rng);
  const direction = nextRandom(choice.state);
  const candidates = stageOf(run.distanceM) === 'street' ? STREET_EVENTS : OFFICE_EVENTS;
  run.rng = direction.state;
  run.event = {
    id: candidates[Math.floor(choice.value * candidates.length)],
    direction: direction.value < 0.5 ? -1 : 1,
    phase: 'warning', remainingSeconds: BALANCE.warningSeconds,
    strength: difficulty.eventStrength,
  };
  effects.push({
    type: 'eventWarning', runId: run.id,
    eventId: run.event.id, direction: run.event.direction,
  });
}

function recordMilestones(run: RunState, difficulty: Difficulty, effects: GameEffect[]): void {
  if (!run.hasCoffee && run.distanceM >= 15) {
    run.hasCoffee = true;
    run.nextEventAt = run.elapsedSeconds + BALANCE.firstEventDelaySeconds;
    effects.push({ type: 'coffee', runId: run.id });
  }
  if (run.elapsedSeconds + BALANCE.timerEpsilon >= run.nextFootstepAt) {
    effects.push({ type: 'footstep', runId: run.id });
    run.nextFootstepAt = run.elapsedSeconds + Math.max(
      BALANCE.minFootstepSeconds,
      BALANCE.footstepBaseSeconds / (difficulty.speedMps / BALANCE.baseSpeedMps),
    );
  }
}

function playingTick(state: GameState, dt: number, input: InputState): Transition {
  const previous = state.run!;
  const run: RunState = { ...previous, event: previous.event ? { ...previous.event } : null };
  const effects: GameEffect[] = [];

  if (run.protectionSeconds <= BALANCE.timerEpsilon &&
      Math.abs(run.angleRad) >= BALANCE.criticalAngleRad) {
    run.angleRad = Math.sign(run.angleRad) * BALANCE.criticalAngleRad;
    return result(state, run, effects);
  }

  const difficulty = difficultyAt(run.distanceM);
  const signedInput = Number(input.right) - Number(input.left);
  let remaining = dt;

  // Split only at timer boundaries: a warning's remaining part never applies force.
  while (remaining > 0) {
    settleEventBoundary(run, difficulty, effects);
    const protectedNow = run.protectionSeconds > 0;
    let step = remaining;
    if (protectedNow) step = Math.min(step, run.protectionSeconds);
    if (run.event) {
      step = Math.min(step, run.event.remainingSeconds);
    } else if (run.hasCoffee && !protectedNow) {
      step = Math.min(step, run.nextEventAt - run.elapsedSeconds);
    }
    if (!Number.isFinite(step) || step <= 0) return numericFailure(state, run, effects);

    const time = run.elapsedSeconds;
    const pressure = adaptationAt(time);
    const instability = 2.2 + pressure * (difficulty.instability - 2.2);
    const disturbanceAmplitude = 0.18 + pressure * (difficulty.disturbance - 0.18);
    const disturbance = disturbanceAmplitude * balanceDrift(time, run.seed);
    const eventForce = !protectedNow && run.event?.phase === 'active'
      ? run.event.direction * run.event.strength : 0;
    const acceleration = instability * stableSin(run.angleRad)
      - BALANCE.damping * run.angularVelocity
      + BALANCE.controlAcceleration * signedInput + disturbance + eventForce;
    let velocity = run.angularVelocity + acceleration * step;
    let angle = run.angleRad + velocity * step;
    const fullTime = time + step;
    const fullDistance = run.distanceM + difficulty.speedMps * step;
    if (![velocity, angle, fullTime, fullDistance].every(Number.isFinite) ||
        fullTime <= time || fullDistance <= run.distanceM ||
        !Number.isSafeInteger(previous.stepIndex + 1)) {
      return numericFailure(state, run, effects);
    }

    let fraction = 1;
    const fallen = !protectedNow && Math.abs(angle) >= BALANCE.criticalAngleRad;
    if (fallen) {
      const boundary = angle < 0 ? -BALANCE.criticalAngleRad : BALANCE.criticalAngleRad;
      fraction = Math.max(0, Math.min(1, (boundary - run.angleRad) / (angle - run.angleRad)));
      angle = boundary;
      velocity = run.angularVelocity + (velocity - run.angularVelocity) * fraction;
    } else if (protectedNow) {
      const stabilization = Math.max(0, 1 - BALANCE.stabilizationRate * step);
      velocity *= stabilization;
      angle = Math.max(-BALANCE.criticalAngleRad * 0.5,
        Math.min(BALANCE.criticalAngleRad * 0.5, angle * stabilization));
    }

    const elapsedStep = step * fraction;
    run.elapsedSeconds += elapsedStep;
    run.distanceM += difficulty.speedMps * elapsedStep;
    run.angularVelocity = velocity;
    run.angleRad = angle;
    run.stepIndex = previous.stepIndex + 1;
    run.protectionSeconds = Math.max(0, run.protectionSeconds - elapsedStep);
    if (run.event) run.event.remainingSeconds = Math.max(0, run.event.remainingSeconds - elapsedStep);
    recordMilestones(run, difficulty, effects);
    if (fallen) return result(state, run, effects);

    settleEventBoundary(run, difficulty, effects);
    remaining = Math.max(0, remaining - step);
    // Use the same tolerance as event timers: subtraction can leave a tail
    // smaller than the elapsed clock can represent, not a real extra step.
    if (remaining <= BALANCE.timerEpsilon) remaining = 0;
  }

  if (Math.abs(run.angleRad) >= BALANCE.criticalAngleRad * 0.7 &&
      run.elapsedSeconds - run.lastWobbleAt + BALANCE.timerEpsilon >= BALANCE.wobbleCooldownSeconds) {
    run.lastWobbleAt = run.elapsedSeconds;
    effects.push({ type: 'wobble', runId: run.id });
  }
  return { state: { ...state, run }, effects };
}

function tick(state: GameState, dt: number, input: InputState, flags: Flags): Transition {
  if (!Number.isFinite(dt) || dt <= 0 || dt > BALANCE.maxTickSeconds || !validInput(input) ||
      !state.run || !validRun(state.run)) return unchanged(state);

  if (state.screen === 'countdown') {
    if (!Number.isFinite(state.countdownSeconds) || state.countdownSeconds < 0) return unchanged(state);
    const left = state.countdownSeconds - dt;
    return {
      state: {
        ...state, countdownSeconds: left <= BALANCE.timerEpsilon ? 0 : left,
        screen: left <= BALANCE.timerEpsilon ? 'playing' : 'countdown',
      }, effects: [],
    };
  }
  if (state.screen === 'ad') {
    if (flags.mockAdsEnabled !== true || state.run.reviveUsed ||
        !Number.isFinite(state.adSeconds) || state.adSeconds < 0) return unchanged(state);
    const left = state.adSeconds - dt;
    if (left > BALANCE.timerEpsilon) {
      return { state: { ...state, adSeconds: left }, effects: [] };
    }
    return {
      state: {
        ...state, screen: 'countdown', adSeconds: 0, countdownSeconds: BALANCE.countdownSeconds,
        resumeTo: null,
        run: {
          ...state.run, reviveUsed: true, angleRad: 0, angularVelocity: 0,
          event: null, nextEventAt: state.run.elapsedSeconds + BALANCE.firstEventDelaySeconds,
          protectionSeconds: BALANCE.protectionSeconds,
        },
      },
      effects: [{ type: 'revive', runId: state.run.id }],
    };
  }
  if (state.screen === 'playing') {
    const outcome = playingTick(state, dt, input);
    const run = outcome.state.run!;
    const checkpoint: RunState = {
      ...run,
      angleRad: quantize(run.angleRad),
      angularVelocity: quantize(run.angularVelocity),
      distanceM: quantize(run.distanceM),
      elapsedSeconds: quantize(run.elapsedSeconds),
    };
    // The displayed/checkpoint distance can round up to the cafe boundary too.
    // Keep coffee in the same tick, including a terminal tick, before its fall effect.
    if (!checkpoint.hasCoffee && checkpoint.distanceM >= 15) {
      checkpoint.hasCoffee = true;
      checkpoint.nextEventAt = checkpoint.elapsedSeconds + BALANCE.firstEventDelaySeconds;
      const fallIndex = outcome.effects.findIndex(effect => effect.type === 'fall');
      outcome.effects.splice(fallIndex < 0 ? outcome.effects.length : fallIndex, 0,
        { type: 'coffee', runId: checkpoint.id });
    }
    // Rounding can land exactly on the critical angle. Finish this credited tick,
    // rather than leaving an already-fallen checkpoint for the next proof chunk.
    if (outcome.state.screen === 'playing' && checkpoint.protectionSeconds === 0 &&
        Math.abs(checkpoint.angleRad) >= BALANCE.criticalAngleRad) {
      return result(outcome.state, checkpoint, outcome.effects);
    }
    return {
      ...outcome,
      state: {
        ...outcome.state,
        run: checkpoint,
      },
    };
  }
  return unchanged(state);
}

/** Pure state transition. No rendering, storage, audio, wall clock or ambient randomness. */
export function transition(state: GameState, action: GameAction, flags: Flags): Transition {
  switch (action.type) {
    case 'START':
      if ((state.screen !== 'title' && state.screen !== 'result') ||
          !Number.isSafeInteger(action.runId) || action.runId <= 0 ||
          !Number.isInteger(action.seed) || action.seed < 0 || action.seed > UINT32_MAX) {
        return unchanged(state);
      }
      return {
        state: {
          ...createInitialState(), screen: 'countdown', countdownSeconds: BALANCE.countdownSeconds,
          run: createRun(action.runId, action.seed),
        }, effects: [],
      };
    case 'TICK':
      return tick(state, action.dt, action.input, flags);
    case 'PAUSE':
      if (state.screen !== 'playing' && state.screen !== 'countdown' && state.screen !== 'ad') {
        return unchanged(state);
      }
      return { state: { ...state, screen: 'paused', resumeTo: state.screen }, effects: [] };
    case 'RESUME':
      if (state.screen !== 'paused' || !state.resumeTo) return unchanged(state);
      return { state: { ...state, screen: state.resumeTo, resumeTo: null }, effects: [] };
    case 'HOME':
      if (state.screen === 'playing' || state.screen === 'title') return unchanged(state);
      return { state: createInitialState(), effects: [] };
    case 'REQUEST_AD':
      if (state.screen !== 'result' || !state.run || flags.mockAdsEnabled !== true ||
          state.run.reviveUsed || !validRun(state.run)) return unchanged(state);
      return {
        state: { ...state, screen: 'ad', resumeTo: null, adSeconds: BALANCE.mockAdSeconds }, effects: [],
      };
    case 'CANCEL_AD':
      if (state.screen !== 'ad') return unchanged(state);
      return { state: { ...state, screen: 'result', adSeconds: 0, resumeTo: null }, effects: [] };
    default:
      return unchanged(state);
  }
}
