import { BALANCE } from './game/balance.ts';
import { transition } from './game/engine.ts';
import type { GameState } from './game/types.ts';
import { ApiFailure } from './api-error.ts';

/** Only call with a server-owned, terminal checkpoint, never a client supplied state. */
export function revivedCheckpoint(parent: GameState, step: typeof transition = transition): GameState {
  if (parent.screen !== 'result' || !parent.run || parent.run.reviveUsed) throw new ApiFailure('PROOF_REJECTED');
  const flags = { mockAdsEnabled: true };
  let state = step(parent, { type: 'REQUEST_AD' }, flags).state;
  const input = { left: false, right: false };
  for (let i = 0; i < 960; i++) state = step(state, { type: 'TICK', dt: BALANCE.fixedDt, input }, flags).state;
  if (state.screen !== 'playing' || !state.run?.reviveUsed) throw new ApiFailure('UNAVAILABLE');
  return { ...state, run: { ...state.run, stepIndex: 0 } };
}
