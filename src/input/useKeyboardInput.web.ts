import { useEffect } from 'react';
import type { GameController } from '../game/controller';

const DIRECTION: Readonly<Record<string, -1 | 1>> = {
  ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1,
};
const TEXT_OR_MODAL = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="dialog"], [aria-modal="true"]';

function editable(target: EventTarget | null): boolean {
  return Boolean(target && typeof (target as Element).closest === 'function'
    && (target as Element).closest(TEXT_OR_MODAL));
}

export function useKeyboardInput(controller: GameController): void {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const held = new Set<string>();
    const eligible = (event: KeyboardEvent) => controller.readState().screen === 'playing'
      && !editable(event.target) && !editable(document.activeElement)
      && !document.querySelector('[aria-modal="true"], [role="dialog"], dialog[open]');
    const releaseAll = () => {
      for (const code of held) controller.setInput('keyboard', code, DIRECTION[code], false);
      held.clear();
    };
    const keydown = (event: KeyboardEvent) => {
      const direction = DIRECTION[event.code];
      if (!direction || !eligible(event)) return;
      event.preventDefault();
      if (held.has(event.code)) return;
      held.add(event.code);
      controller.setInput('keyboard', event.code, direction, true);
    };
    const keyup = (event: KeyboardEvent) => {
      const direction = DIRECTION[event.code];
      if (!direction) return;
      // A key pressed in the game may be released after focus moved into a form.
      if (held.delete(event.code)) controller.setInput('keyboard', event.code, direction, false);
      if (eligible(event)) event.preventDefault();
    };
    const unsubscribe = controller.subscribe(() => {
      if (controller.readState().screen !== 'playing') releaseAll();
    });
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', releaseAll);
    return () => {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', releaseAll);
      unsubscribe();
      releaseAll();
    };
  }, [controller]);
}
