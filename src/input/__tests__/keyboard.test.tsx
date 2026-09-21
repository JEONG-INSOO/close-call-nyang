import { act, cleanup, renderHook } from '@testing-library/react-native';
import type { GameController } from '../../game/controller';
import { createInputRegistry } from '../inputState';
import { useKeyboardInput } from '../useKeyboardInput.web';
import { useKeyboardInput as useNativeKeyboardInput } from '../useKeyboardInput';
import { installBrowserFixture } from './browserFixture';

function fakeController() {
  const registry = createInputRegistry();
  let screen = 'playing';
  const listeners = new Set<() => void>();
  const setInput = jest.fn(registry.set);
  const controller = {
    readState: () => ({ screen }), setInput,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); },
  } as unknown as GameController;
  return { controller, registry, setInput, screen(value: string) { screen = value; listeners.forEach(listener => listener()); } };
}

describe('web keyboard sequence handling', () => {
  let browser: ReturnType<typeof installBrowserFixture>;
  beforeEach(() => { browser = installBrowserFixture(); });
  afterEach(async () => { await cleanup(); browser.restore(); });
  const key = (code: string, target: unknown = null) => ({ code, target, preventDefault: jest.fn() });

  it('holds A + ArrowLeft independently, ignores repeats and combines the opposite key', async () => {
    const game = fakeController();
    await renderHook(() => useKeyboardInput(game.controller));
    const first = key('KeyA');
    await act(() => {
      browser.win.emit('keydown', first);
      browser.win.emit('keydown', first);
      browser.win.emit('keydown', key('ArrowLeft'));
      browser.win.emit('keydown', key('KeyD'));
      browser.win.emit('keyup', key('KeyA'));
    });
    expect(first.preventDefault).toHaveBeenCalledTimes(2);
    expect(game.setInput.mock.calls.filter(args => args[1] === 'KeyA' && args[3])).toHaveLength(1);
    expect(game.registry.read()).toEqual({ left: true, right: true });
    await act(() => browser.win.emit('keyup', key('ArrowLeft')));
    expect(game.registry.read()).toEqual({ left: false, right: true });
  });
  it('releases a previously held key even after focus moves into an editable field', async () => {
    const game = fakeController();
    await renderHook(() => useKeyboardInput(game.controller));
    const editable = { closest: jest.fn(() => ({})) };
    const released = key('KeyA', editable);
    await act(() => {
      browser.win.emit('keydown', key('KeyA'));
      browser.doc.activeElement = editable;
      browser.win.emit('keyup', released);
    });
    expect(game.registry.read().left).toBe(false);
    expect(released.preventDefault).not.toHaveBeenCalled();
  });
  it.each(['title', 'countdown', 'paused', 'result', 'ad'])('does not intercept keys on %s', async screen => {
    const game = fakeController();
    game.screen(screen);
    await renderHook(() => useKeyboardInput(game.controller));
    const event = key('ArrowLeft');
    await act(() => browser.win.emit('keydown', event));
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(game.setInput).not.toHaveBeenCalled();
  });
  it('ignores an editable target, open modal and unrelated keys', async () => {
    const game = fakeController();
    await renderHook(() => useKeyboardInput(game.controller));
    const editable = key('KeyA', { closest: () => ({}) });
    const modal = key('KeyD');
    const other = key('Space');
    await act(() => {
      browser.win.emit('keydown', editable);
      browser.doc.querySelector.mockReturnValue({});
      browser.win.emit('keydown', modal);
      browser.win.emit('keydown', other);
    });
    expect(game.setInput).not.toHaveBeenCalled();
    for (const event of [editable, modal, other]) expect(event.preventDefault).not.toHaveBeenCalled();
  });
  it('cleans up its held keys and listeners on blur, pause and unmount without clearing touch', async () => {
    const game = fakeController();
    game.registry.set('touch', 'finger', -1, true);
    const hook = await renderHook(() => useKeyboardInput(game.controller));
    await act(() => { browser.win.emit('keydown', key('KeyD')); browser.win.emit('blur'); });
    expect(game.registry.read()).toEqual({ left: true, right: false });
    await act(() => { browser.win.emit('keydown', key('KeyD')); game.screen('paused'); });
    expect(game.registry.read().right).toBe(false);
    await act(() => { game.screen('playing'); browser.win.emit('keydown', key('KeyD')); });
    await hook.unmount();
    expect(game.registry.read()).toEqual({ left: true, right: false });
    expect(browser.win.count()).toBe(0);
  });
  it('native keyboard boundary registers no browser listeners', async () => {
    const game = fakeController();
    await renderHook(() => useNativeKeyboardInput(game.controller));
    expect(browser.win.count()).toBe(0);
  });
});
