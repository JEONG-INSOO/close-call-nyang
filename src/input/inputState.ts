import type { InputSource } from '../game/controller';

export interface InputRegistry {
  set(source: InputSource, id: string, direction: -1 | 1, down: boolean): void;
  read(): { left: boolean; right: boolean };
  clear(): void;
}

/** Independent physical sources may hold the same direction at the same time. */
export function createInputRegistry(): InputRegistry {
  const left = new Set<string>();
  const right = new Set<string>();
  return {
    set(source, id, direction, down) {
      const held = direction === -1 ? left : right;
      const key = JSON.stringify([source, id]);
      if (down) held.add(key);
      else held.delete(key);
    },
    read: () => ({ left: left.size > 0, right: right.size > 0 }),
    clear() { left.clear(); right.clear(); },
  };
}
