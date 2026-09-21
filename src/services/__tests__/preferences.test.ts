import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadPreferences, parsePreferences, PREFERENCES_KEY, savePreferences, updateBest } from '../preferences';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));

const storage = jest.mocked(AsyncStorage);

beforeEach(() => {
  jest.clearAllMocks();
  storage.getItem.mockResolvedValue(null);
  storage.setItem.mockResolvedValue();
});

describe('preference parsing', () => {
  test.each([null, '', '{bad', 'null', '[]', '1', '{"schemaVersion":2}', '{"bestScore":100}'])('uses safe defaults for %s', (raw) => {
    expect(parsePreferences(raw)).toEqual({ schemaVersion: 1, bestScore: 0,
      settings: { musicEnabled: true, sfxEnabled: true, hapticsEnabled: true, reduceMotion: false },
      collection: { completedRuns: 0, selectedCharacter: 'rookie' } });
  });

  test('backfills each boolean independently and discards unrecognized data', () => {
    const value = parsePreferences(JSON.stringify({ schemaVersion: 1, bestScore: 123,
      settings: { musicEnabled: false, sfxEnabled: 'false', hapticsEnabled: 0, reduceMotion: true, secret: 'discard' },
      collection: { completedRuns: 10, selectedCharacter: 'veteran', identity: 'discard' },
      identity: 'discard', inputHistory: ['discard'], token: 'discard' }));
    expect(value).toEqual({ schemaVersion: 1, bestScore: 123,
      settings: { musicEnabled: false, sfxEnabled: true, hapticsEnabled: true, reduceMotion: true },
      collection: { completedRuns: 10, selectedCharacter: 'veteran' } });
  });

  test('old v1 records retain best and settings without inventing previous completions', () => {
    const value = parsePreferences('{"schemaVersion":1,"bestScore":500,"settings":{"musicEnabled":false}}');
    expect(value.bestScore).toBe(500);
    expect(value.settings.musicEnabled).toBe(false);
    expect(value.collection).toEqual({ completedRuns: 0, selectedCharacter: 'rookie' });
  });

  test.each([-1, 1.5, null, '10'])('rejects invalid stored best %s', (bestScore) => {
    expect(parsePreferences(JSON.stringify({ schemaVersion: 1, bestScore })).bestScore).toBe(0);
  });

  test('rejects nonfinite stored best and treats non-object settings as missing', () => {
    expect(parsePreferences('{"schemaVersion":1,"bestScore":1e400,"settings":[]}')).toEqual(parsePreferences(null));
  });

  test('default values are independent objects', () => {
    const first = parsePreferences(null);
    first.settings.musicEnabled = false;
    first.collection.completedRuns = 10;
    expect(parsePreferences(null).settings.musicEnabled).toBe(true);
    expect(parsePreferences(null).collection.completedRuns).toBe(0);
  });
});

describe('storage adapter', () => {
  test('reads only the local preference key and returns parsed data', async () => {
    storage.getItem.mockResolvedValue('{"schemaVersion":1,"bestScore":20}');
    const loaded = await loadPreferences();
    expect(loaded.status).toBe('ready');
    expect(loaded.value.bestScore).toBe(20);
    expect(storage.getItem).toHaveBeenCalledWith(PREFERENCES_KEY);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  test('a refused read stays memory-only and does not overwrite the unread record', async () => {
    storage.getItem.mockRejectedValue(new Error('unavailable'));
    expect(await loadPreferences()).toEqual({ value: parsePreferences(null), status: 'memoryOnly' });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  test('serializes pending writes and coalesces the latest value without lowering an in-flight best', async () => {
    let finishFirst!: () => void;
    storage.setItem.mockImplementationOnce(() => new Promise<void>((resolve) => { finishFirst = resolve; }));
    const first = savePreferences({ ...parsePreferences(null), bestScore: 120 });
    const secondValue = parsePreferences(null);
    secondValue.bestScore = 100;
    secondValue.settings.musicEnabled = false;
    const second = savePreferences(secondValue);
    const thirdValue = { ...secondValue, bestScore: 110, settings: { ...secondValue.settings, sfxEnabled: false } };
    const third = savePreferences(thirdValue);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    finishFirst();
    expect(await Promise.all([first, second, third])).toEqual([true, true, true]);
    expect(storage.setItem).toHaveBeenCalledTimes(2);
    expect(JSON.parse(storage.setItem.mock.calls[1][1])).toMatchObject({ bestScore: 120,
      settings: { musicEnabled: false, sfxEnabled: false } });
  });

  test('write failure resolves false, does not retry itself, and allows a later intentional save', async () => {
    storage.setItem.mockRejectedValueOnce(new Error('quota'));
    expect(await savePreferences(parsePreferences(null))).toBe(false);
    await Promise.resolve();
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(await savePreferences({ ...parsePreferences(null), bestScore: 15 })).toBe(true);
    expect(storage.setItem).toHaveBeenCalledTimes(2);
  });
});

describe('monotonic best', () => {
  test('floors a new run score, preserves other fields and never lowers a record', () => {
    const value = { ...parsePreferences(null), bestScore: 20 };
    const next = updateBest(value, 123.9);
    expect(next.bestScore).toBe(123);
    expect(value.bestScore).toBe(20);
    expect(next.settings).toBe(value.settings);
    expect(next.collection).toBe(value.collection);
    expect(updateBest(next, 40)).toBe(next);
    expect(updateBest(next, 123)).toBe(next);
  });

  test.each([-1, NaN, Infinity, -Infinity])('ignores invalid score %s', (score) => {
    const value = parsePreferences(null);
    expect(updateBest(value, score)).toBe(value);
  });
});
