import { createInitialState, transition } from './legacy/bc732af6f2a7ea66/engine.ts';
import { RULES_VERSION } from './legacy/bc732af6f2a7ea66/rulesVersion.ts';
import type * as Current from './game/engine.ts';

// The server-owned legacy checkpoint can contain only its own older event union.
export const legacyKernels = {
  [RULES_VERSION]: { createInitialState: createInitialState as typeof Current.createInitialState,
    transition: transition as unknown as typeof Current.transition },
};
