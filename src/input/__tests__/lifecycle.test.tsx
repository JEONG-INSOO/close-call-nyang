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
  it('handles web blur/hidden with the latest callback, no automatic focus resume, and cleanup', async () => {
    const browser = installBrowserFixture();
    const first = jest.fn();
    const latest = jest.fn();
    try {
      const hook = await renderHook(({ callback }: { callback: () => void }) => useWebLifecycle(callback), { initialProps: { callback: first } });
      await act(() => browser.win.emit('blur'));
      expect(first).toHaveBeenCalledTimes(1);
      await hook.rerender({ callback: latest });
      await act(() => {
        browser.doc.visibilityState = 'hidden'; browser.doc.emit('visibilitychange');
        browser.doc.visibilityState = 'visible'; browser.doc.emit('visibilitychange');
        browser.win.emit('focus');
      });
      expect(latest).toHaveBeenCalledTimes(1);
      await hook.unmount();
      expect(browser.win.count()).toBe(0);
      expect(browser.doc.count()).toBe(0);
    } finally { browser.restore(); }
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
