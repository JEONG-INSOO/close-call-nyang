import type { GameState, RunState } from './types';

function validRun(run: RunState): boolean {
  const numbers = [run.id, run.seed, run.rng, run.distanceM, run.elapsedSeconds,
    run.angleRad, run.angularVelocity, run.protectionSeconds, run.nextEventAt,
    run.stepIndex, run.nextFootstepAt, run.lastWobbleAt];
  if (!numbers.every(Number.isFinite) || run.distanceM < 0 || run.elapsedSeconds < 0 ||
      run.protectionSeconds < 0 || !Number.isSafeInteger(run.stepIndex) || run.stepIndex < 0) return false;
  return run.event === null || ((run.event.direction === -1 || run.event.direction === 1) &&
    (run.event.phase === 'warning' || run.event.phase === 'active') &&
    Number.isFinite(run.event.remainingSeconds) && run.event.remainingSeconds >= 0 &&
    Number.isFinite(run.event.strength) && run.event.strength >= 0);
}

export function isRestorableGameState(value: unknown): value is GameState {
  if (value == null || typeof value !== 'object') return false;
  const state = value as GameState;
  return state.screen === 'paused' && !!state.run && validRun(state.run) &&
    (state.resumeTo === 'playing' || state.resumeTo === 'countdown' || state.resumeTo === 'ad') &&
    Number.isFinite(state.countdownSeconds) && state.countdownSeconds >= 0 &&
    Number.isFinite(state.adSeconds) && state.adSeconds >= 0;
}
