import type { GameController } from '../game/controller';

/** Native has no browser globals or hardware-key listeners in this milestone. */
export function useKeyboardInput(_controller: GameController): void {}
