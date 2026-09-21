import { StrictMode, type ReactNode } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parsePreferences } from '../preferences';
import { usePreferences } from '../usePreferences';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn() },
}));

const storage = jest.mocked(AsyncStorage);

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  jest.clearAllMocks();
  storage.getItem.mockResolvedValue(null);
  storage.setItem.mockResolvedValue();
});
afterEach(async () => { await cleanup(); });

describe('preference hydration and state synchronization', () => {
  test('shows defaults while loading and does not write a clean load back', async () => {
    const read = deferred<string | null>();
    storage.getItem.mockReturnValue(read.promise);
    const { result } = await renderHook(() => usePreferences());
    expect(result.current.status).toBe('loading');
    expect(result.current.value).toEqual(parsePreferences(null));
    await act(async () => { read.resolve(null); });
    expect(result.current.status).toBe('ready');
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  test('merges touched fields, maximum score and session completion delta into the loaded baseline', async () => {
    const read = deferred<string | null>();
    storage.getItem.mockReturnValue(read.promise);
    const stored = parsePreferences(null);
    stored.bestScore = 300;
    stored.settings.musicEnabled = false;
    stored.settings.sfxEnabled = false;
    stored.collection = { completedRuns: 9, selectedCharacter: 'rookie' };
    const { result } = await renderHook(() => usePreferences());
    let attempt = 0;
    await act(() => {
      result.current.setSettings({ musicEnabled: true }); // Explicitly touched, although it equals the temporary default.
      result.current.recordScore(120);
      attempt = result.current.beginAttempt(true);
      result.current.observeAttempt(attempt, 100);
      expect(result.current.selectCharacter('diligent')).toBe(true);
    });
    expect(storage.setItem).not.toHaveBeenCalled();
    await act(async () => { read.resolve(JSON.stringify(stored)); });
    expect(result.current.value).toMatchObject({ bestScore: 300,
      settings: { musicEnabled: true, sfxEnabled: false },
      collection: { completedRuns: 10, selectedCharacter: 'diligent' } });
    expect(result.current.newlyUnlocked).toEqual(['veteran']);
    await waitFor(() => expect(storage.setItem).toHaveBeenCalledTimes(1));
    const saved = JSON.parse(storage.setItem.mock.calls[0][1]);
    expect(saved).toEqual(result.current.value);
    await act(() => result.current.observeAttempt(attempt, 200));
    expect(result.current.value.collection.completedRuns).toBe(10);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  test('back-to-back updates read the latest synchronous state, not stale render closures', async () => {
    const { result } = await renderHook(() => usePreferences());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    const callbacks = result.current;
    await act(async () => {
      callbacks.setSettings({ musicEnabled: false });
      callbacks.setSettings({ sfxEnabled: false });
      callbacks.recordScore(150);
      callbacks.recordScore(20);
      const attempt = callbacks.beginAttempt(true);
      callbacks.observeAttempt(attempt, 100);
      callbacks.selectCharacter('diligent');
    });
    expect(result.current.value).toMatchObject({ bestScore: 150,
      settings: { musicEnabled: false, sfxEnabled: false },
      collection: { completedRuns: 1, selectedCharacter: 'diligent' } });
    expect(result.current.setSettings).toBe(callbacks.setSettings);
    expect(result.current.beginAttempt).toBe(callbacks.beginAttempt);
    await waitFor(() => {
      const last = storage.setItem.mock.calls.at(-1)!;
      expect(JSON.parse(last[1])).toEqual(result.current.value);
    });
  });

  test('failed hydration retains edits and awards in memory without an automatic overwrite', async () => {
    const read = deferred<string | null>();
    storage.getItem.mockReturnValue(read.promise);
    const { result } = await renderHook(() => usePreferences());
    await act(() => {
      result.current.setSettings({ musicEnabled: false });
      result.current.recordScore(105);
      const attempt = result.current.beginAttempt(true);
      result.current.observeAttempt(attempt, 100);
    });
    await act(async () => { read.reject(new Error('read denied')); });
    expect(result.current.status).toBe('memoryOnly');
    expect(result.current.value).toMatchObject({ bestScore: 105, settings: { musicEnabled: false }, collection: { completedRuns: 1 } });
    expect(result.current.newlyUnlocked).toEqual(['diligent']);
    expect(storage.setItem).not.toHaveBeenCalled();
    await act(async () => { result.current.setSettings({ hapticsEnabled: false }); });
    expect(result.current.status).toBe('ready');
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(JSON.parse(storage.setItem.mock.calls[0][1]).collection.completedRuns).toBe(1);
  });

  test('failed writes keep visible state and retry only after a later intentional update', async () => {
    storage.setItem.mockRejectedValueOnce(new Error('quota'));
    const { result } = await renderHook(() => usePreferences());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => { result.current.setSettings({ reduceMotion: true }); });
    expect(result.current.status).toBe('memoryOnly');
    expect(result.current.value.settings.reduceMotion).toBe(true);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    await act(async () => { result.current.recordScore(10); });
    expect(result.current.status).toBe('ready');
    expect(result.current.value.bestScore).toBe(10);
    expect(storage.setItem).toHaveBeenCalledTimes(2);
  });

  test('a stale failed write cannot override the result of a newer queued save', async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    storage.setItem.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = await renderHook(() => usePreferences());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(() => {
      result.current.recordScore(30);
      result.current.setSettings({ musicEnabled: false });
      result.current.recordScore(120);
    });
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    await act(async () => { first.reject(new Error('old write failed')); });
    expect(result.current.status).toBe('ready');
    expect(storage.setItem).toHaveBeenCalledTimes(2);
    await act(async () => { second.resolve(); });
    expect(result.current.status).toBe('ready');
    expect(JSON.parse(storage.setItem.mock.calls[1][1])).toMatchObject({ bestScore: 120, settings: { musicEnabled: false } });
  });

  test('StrictMode hydration applies the completion journal once and respects a cleared notice', async () => {
    const read = deferred<string | null>();
    storage.getItem.mockReturnValue(read.promise);
    const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;
    const { result, rerender } = await renderHook(() => usePreferences(), { wrapper });
    const stored = parsePreferences(null);
    stored.collection.completedRuns = 8;
    await act(() => {
      const first = result.current.beginAttempt(true);
      result.current.observeAttempt(first, 100);
      const second = result.current.beginAttempt(true);
      result.current.observeAttempt(second, 100);
      result.current.clearUnlockNotice();
    });
    await act(async () => { read.resolve(JSON.stringify(stored)); });
    await rerender(undefined);
    expect(storage.getItem).toHaveBeenCalledTimes(1);
    expect(result.current.value.collection.completedRuns).toBe(10);
    expect(result.current.newlyUnlocked).toEqual([]);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });
});

describe('exactly-once character collection', () => {
  test('ignores 99.99, invalid values, stale IDs, repeats, and ineligible attempts', async () => {
    const { result, rerender } = await renderHook(() => usePreferences());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    let first = 0;
    await act(() => {
      first = result.current.beginAttempt(true);
      for (const score of [99.99, -1, NaN, Infinity, -Infinity]) result.current.observeAttempt(first, score);
      result.current.observeAttempt(first + 1, 100);
    });
    expect(result.current.value.collection.completedRuns).toBe(0);
    await act(async () => {
      result.current.observeAttempt(first, 100);
      result.current.observeAttempt(first, 101);
      result.current.observeAttempt(first, 200);
    });
    expect(result.current.value.collection).toEqual({ completedRuns: 1, selectedCharacter: 'rookie' });
    expect(result.current.newlyUnlocked).toEqual(['diligent']);
    await rerender(undefined);
    await act(async () => {
      result.current.observeAttempt(first, 150); // Result, pause/resume, or rerender observations do not start an attempt.
      const mockAttempt = result.current.beginAttempt(false);
      result.current.observeAttempt(first, 200);
      result.current.observeAttempt(mockAttempt, 200);
    });
    expect(result.current.value.collection.completedRuns).toBe(1);
    expect(result.current.newlyUnlocked).toEqual([]);
  });

  test('ten distinct eligible attempts unlock veteran without auto-equipping or score caps', async () => {
    const { result } = await renderHook(() => usePreferences());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    let previous = 0;
    await act(async () => {
      for (let index = 0; index < 10; index += 1) {
        const id = result.current.beginAttempt(true);
        expect(id).toBeGreaterThan(previous);
        previous = id;
        result.current.observeAttempt(id, 100 + index);
        result.current.observeAttempt(id, 200);
      }
      result.current.recordScore(999);
    });
    expect(result.current.value.collection).toEqual({ completedRuns: 10, selectedCharacter: 'rookie' });
    expect(result.current.value.bestScore).toBe(999);
    expect(result.current.newlyUnlocked).toEqual(['veteran']);
    await act(async () => {
      const id = result.current.beginAttempt(true);
      result.current.observeAttempt(id, 100);
    });
    expect(result.current.value.collection.completedRuns).toBe(10);
    expect(result.current.newlyUnlocked).toEqual([]);
  });

  test('rejects locked IDs, preserves an explicit selection, and clearing notices never resets progress', async () => {
    const { result } = await renderHook(() => usePreferences());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(() => {
      expect(result.current.selectCharacter('veteran')).toBe(false);
      expect(result.current.selectCharacter('unknown' as 'rookie')).toBe(false);
    });
    expect(storage.setItem).not.toHaveBeenCalled();
    await act(async () => {
      const id = result.current.beginAttempt(true);
      result.current.observeAttempt(id, 100);
      expect(result.current.selectCharacter('diligent')).toBe(true);
      result.current.clearUnlockNotice();
    });
    expect(result.current.newlyUnlocked).toEqual([]);
    expect(result.current.value.collection).toEqual({ completedRuns: 1, selectedCharacter: 'diligent' });
  });

  test('restores saved unlocks and selection without requiring any account or network state', async () => {
    const stored = parsePreferences(null);
    stored.collection = { completedRuns: 10, selectedCharacter: 'veteran' };
    stored.bestScore = 200;
    storage.getItem.mockResolvedValue(JSON.stringify(stored));
    const { result } = await renderHook(() => usePreferences());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.value).toEqual(stored);
    expect(result.current.newlyUnlocked).toEqual([]);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  test('keeps an award when persistence rejects and does not award it twice during retry', async () => {
    storage.setItem.mockRejectedValueOnce(new Error('quota'));
    const stored = parsePreferences(null);
    stored.collection.completedRuns = 9;
    storage.getItem.mockResolvedValue(JSON.stringify(stored));
    const { result } = await renderHook(() => usePreferences());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    let attempt = 0;
    await act(async () => {
      attempt = result.current.beginAttempt(true);
      result.current.observeAttempt(attempt, 100);
    });
    expect(result.current.status).toBe('memoryOnly');
    expect(result.current.value.collection.completedRuns).toBe(10);
    expect(result.current.newlyUnlocked).toEqual(['veteran']);
    await act(async () => {
      result.current.observeAttempt(attempt, 200);
      result.current.setSettings({ reduceMotion: true });
    });
    expect(result.current.status).toBe('ready');
    expect(result.current.value.collection.completedRuns).toBe(10);
    expect(storage.setItem).toHaveBeenCalledTimes(2);
  });

  test('unmount ignores a pending load and makes stale callbacks inert', async () => {
    const read = deferred<string | null>();
    storage.getItem.mockReturnValue(read.promise);
    const rendered = await renderHook(() => usePreferences());
    const stale = rendered.result.current;
    await rendered.unmount();
    await act(async () => {
      read.resolve('{"schemaVersion":1,"bestScore":500}');
      stale.setSettings({ reduceMotion: true });
      stale.recordScore(800);
      const id = stale.beginAttempt(true);
      stale.observeAttempt(id, 100);
      expect(stale.selectCharacter('rookie')).toBe(false);
    });
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
