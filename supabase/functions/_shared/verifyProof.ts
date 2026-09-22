import { BALANCE } from './game/balance.ts';
import { transition } from './game/engine.ts';
import type { GameState } from './game/types.ts';

export interface InputSpan { direction: -1 | 0 | 1; ticks: number }

export class ProofValidationError extends Error {
  readonly code = 'PROOF_REJECTED';
  constructor(message = 'The input replay is invalid.') {
    super(message);
    this.name = 'ProofValidationError';
  }
}

function reject(): never { throw new ProofValidationError(); }

function assertCheckpoint(state: GameState): void {
  const run = state?.run;
  if (!run || state.screen !== 'playing' || state.resumeTo !== null ||
      state.countdownSeconds !== 0 || state.adSeconds !== 0 ||
      run.reviveUsed !== false || run.protectionSeconds !== 0 ||
      !Number.isSafeInteger(run.id) || run.id < 1 || run.id > 0x7fffffff ||
      !Number.isInteger(run.seed) || run.seed < 1 || run.seed > 0xffffffff ||
      !Number.isInteger(run.rng) || run.rng < 1 || run.rng > 0xffffffff ||
      typeof run.hasCoffee !== 'boolean' ||
      !Number.isSafeInteger(run.stepIndex) || run.stepIndex < 0 ||
      !Number.isSafeInteger(Math.floor(run.distanceM)) || run.distanceM < 0 || run.elapsedSeconds < 0 ||
      ![run.distanceM, run.elapsedSeconds, run.angleRad, run.angularVelocity,
        run.nextEventAt, run.nextFootstepAt, run.lastWobbleAt].every(Number.isFinite)) reject();
  const event = run.event;
  if (event !== null && (!event ||
      !['coffeeRush', 'lateCommute', 'urgentEdit', 'bossCall', 'longMeeting'].includes(event.id) ||
      ![-1, 1].includes(event.direction) || !['warning', 'active'].includes(event.phase) ||
      !Number.isFinite(event.remainingSeconds) || event.remainingSeconds < 0 ||
      !Number.isFinite(event.strength) || event.strength < 0)) reject();
}

/** Only playing-tick controls are accepted; scores/actions/revival cannot be supplied. */
export function verifyChunk(checkpoint: GameState, spans: readonly InputSpan[]): {
  state: GameState; ticks: number; terminal: boolean;
} {
  assertCheckpoint(checkpoint);
  if (!Array.isArray(spans) || spans.length < 1 || spans.length > 1200) reject();
  let ticks = 0;
  for (const span of spans) {
    if (!span || typeof span !== 'object' || Array.isArray(span) ||
        Object.keys(span).length !== 2 || !Object.hasOwn(span, 'direction') || !Object.hasOwn(span, 'ticks') ||
        ![-1, 0, 1].includes(span.direction) || !Number.isInteger(span.ticks) || span.ticks < 1) reject();
    ticks += span.ticks;
    if (!Number.isSafeInteger(ticks) || ticks > 1200) reject();
  }
  let state = checkpoint;
  let simulated = 0;
  for (const span of spans) {
    const input = { left: span.direction === -1, right: span.direction === 1 };
    for (let index = 0; index < span.ticks; index += 1) {
      if (state.screen !== 'playing') reject();
      const before = state.run!;
      state = transition(state, { type: 'TICK', dt: BALANCE.fixedDt, input }, { mockAdsEnabled: false }).state;
      simulated += 1;
      const run = state.run;
      if (!run || run.stepIndex !== before.stepIndex + 1 || run.elapsedSeconds <= before.elapsedSeconds ||
          run.distanceM <= before.distanceM || !Number.isSafeInteger(Math.floor(run.distanceM)) ||
          ![run.angleRad, run.angularVelocity, run.distanceM, run.elapsedSeconds].every(Number.isFinite) ||
          (state.screen !== 'playing' && state.screen !== 'result') ||
          (state.screen === 'result' && simulated !== ticks)) reject();
    }
  }
  return { state, ticks, terminal: state.screen === 'result' };
}
