/** Minimal event surfaces for hook sequence tests; not a DOM/device simulation. */
export function installBrowserFixture() {
  const savedWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const savedDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  function surface() {
    const listeners = new Map<string, Set<(event: unknown) => void>>();
    return {
      addEventListener: jest.fn((name: string, listener: (event: unknown) => void) => {
        if (!listeners.has(name)) listeners.set(name, new Set());
        listeners.get(name)!.add(listener);
      }),
      removeEventListener: jest.fn((name: string, listener: (event: unknown) => void) => {
        listeners.get(name)?.delete(listener);
      }),
      emit(name: string, event: unknown = {}) { listeners.get(name)?.forEach(listener => listener(event)); },
      count() { return [...listeners.values()].reduce((total, entries) => total + entries.size, 0); },
    };
  }
  const win = surface();
  const doc = { ...surface(), visibilityState: 'visible', activeElement: null as unknown, querySelector: jest.fn(() => null as unknown) };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: win });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  return {
    win, doc,
    restore() {
      if (savedWindow) Object.defineProperty(globalThis, 'window', savedWindow);
      else Reflect.deleteProperty(globalThis, 'window');
      if (savedDocument) Object.defineProperty(globalThis, 'document', savedDocument);
      else Reflect.deleteProperty(globalThis, 'document');
    },
  };
}
