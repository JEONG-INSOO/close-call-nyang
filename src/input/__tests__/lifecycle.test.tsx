import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useAppLifecycle as useNativeLifecycle } from '../../platform/useAppLifecycle';
import { useAppLifecycle as useWebLifecycle } from '../../platform/useAppLifecycle.web';
import { installBrowserFixture } from './browserFixture';

describe('lifecycle inactivity only', () => {
  it('uses the latest native callback and never calls it for active/foreground', async () => {
    let notify: (value: typeof AppState.currentState) => void = () => {};
    const remove = jest.fn();
    const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      notify = listener; return { remove };
    });
    const first = jest.fn();
    const latest = jest.fn();
    try {
      const hook = await renderHook(({ callback }: { callback: () => void }) => useNativeLifecycle(callback), { initialProps: { callback: first } });
      await act(() => { notify('active'); notify('inactive'); notify('inactive'); });
      expect(first).toHaveBeenCalledTimes(1);
      await hook.rerender({ callback: latest });
      await act(() => { notify('background'); notify('active'); });
      expect(latest).toHaveBeenCalledTimes(1);
      await hook.unmount();
      expect(remove).toHaveBeenCalledTimes(1);
    } finally { spy.mockRestore(); }
  });
  it('delays visible blur for exactly 500ms, uses the latest callback and never resumes on focus', async () => {
    jest.useFakeTimers();
    const browser = installBrowserFixture();
    const first = jest.fn();
    const latest = jest.fn();
    try {
      const hook = await renderHook(({ callback }: { callback: () => void }) => useWebLifecycle(callback), { initialProps: { callback: first } });
      browser.doc.hasFocus.mockReturnValue(false);
      await act(() => browser.win.emit('blur'));
      await act(() => jest.advanceTimersByTime(499));
      expect(first).not.toHaveBeenCalled();
      await hook.rerender({ callback: latest });
      await act(() => jest.advanceTimersByTime(1));
      expect(latest).toHaveBeenCalledTimes(1);
      await act(() => {
        browser.doc.visibilityState = 'hidden'; browser.doc.emit('visibilitychange');
        browser.doc.visibilityState = 'visible'; browser.doc.emit('visibilitychange');
        browser.win.emit('focus');
      });
      expect(latest).toHaveBeenCalledTimes(1);
      await hook.unmount();
      expect(browser.win.count()).toBe(0);
      expect(browser.doc.count()).toBe(0);
    } finally { browser.restore(); jest.useRealTimers(); }
  });
  it.each(['focus-event', 'hasFocus-only'] as const)('ignores transient blur recovered by %s', async recovery => {
    jest.useFakeTimers();
    const browser = installBrowserFixture();
    const callback = jest.fn();
    try {
      const hook = await renderHook(() => useWebLifecycle(callback));
      browser.doc.hasFocus.mockReturnValue(false);
      await act(() => { browser.win.emit('blur'); jest.advanceTimersByTime(100); });
      browser.doc.hasFocus.mockReturnValue(true);
      if (recovery === 'focus-event') await act(() => browser.win.emit('focus'));
      await act(() => jest.advanceTimersByTime(1000));
      expect(callback).not.toHaveBeenCalled();
      await hook.unmount();
      expect(browser.win.count()).toBe(0);
      expect(browser.doc.count()).toBe(0);
    } finally { browser.restore(); jest.useRealTimers(); }
  });
  it('does not extend the deadline on repeated blur, and cancels a pending timer on unmount', async () => {
    jest.useFakeTimers();
    const browser = installBrowserFixture();
    const callback = jest.fn();
    try {
      const hook = await renderHook(() => useWebLifecycle(callback));
      browser.doc.hasFocus.mockReturnValue(false);
      await act(() => { browser.win.emit('blur'); jest.advanceTimersByTime(300); browser.win.emit('blur'); jest.advanceTimersByTime(200); });
      expect(callback).toHaveBeenCalledTimes(1);
      await act(() => { browser.win.emit('focus'); browser.win.emit('blur'); });
      await hook.unmount();
      await act(() => jest.advanceTimersByTime(1000));
      expect(callback).toHaveBeenCalledTimes(1);
      expect(browser.win.count()).toBe(0);
      expect(browser.doc.count()).toBe(0);
    } finally { browser.restore(); jest.useRealTimers(); }
  });
  it.each(['hidden', 'pagehide'] as const)('pauses immediately for %s even inside the blur grace period', async cause => {
    jest.useFakeTimers();
    const browser = installBrowserFixture();
    const callback = jest.fn();
    try {
      const hook = await renderHook(() => useWebLifecycle(callback));
      browser.doc.hasFocus.mockReturnValue(false);
      await act(() => {
        browser.win.emit('blur'); jest.advanceTimersByTime(100);
        if (cause === 'hidden') { browser.doc.visibilityState = 'hidden'; browser.doc.emit('visibilitychange'); }
        else browser.win.emit('pagehide');
      });
      expect(callback).toHaveBeenCalledTimes(1);
      await act(() => { browser.win.emit('focus'); jest.advanceTimersByTime(1000); });
      expect(callback).toHaveBeenCalledTimes(1);
      await hook.unmount();
    } finally { browser.restore(); jest.useRealTimers(); }
  });
  it('immediately treats an initially hidden web document as inactive', async () => {
    const browser = installBrowserFixture();
    browser.doc.visibilityState = 'hidden';
    try {
      const callback = jest.fn();
      const hook = await renderHook(() => useWebLifecycle(callback));
      expect(callback).toHaveBeenCalledTimes(1);
      await hook.unmount();
    } finally { browser.restore(); }
  });
});
