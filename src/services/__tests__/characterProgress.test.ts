import { applyCompletion, normalizeCollection } from '../characterProgress';
import { parsePreferences } from '../preferences';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn() },
}));

describe('collection normalization', () => {
  test.each([undefined, null, [], false, 'veteran', 100])('defaults invalid collection %s', (raw) => {
    expect(normalizeCollection(raw)).toEqual({ completedRuns: 0, selectedCharacter: 'rookie' });
  });

  test.each([-1, NaN, Infinity, -Infinity, '10', undefined])('normalizes invalid or negative count %s', (completedRuns) => {
    expect(normalizeCollection({ completedRuns, selectedCharacter: 'veteran' })).toEqual({ completedRuns: 0, selectedCharacter: 'rookie' });
  });

  test('floors and saturates finite counts, while only preserving unlocked known selections', () => {
    expect(normalizeCollection({ completedRuns: 1.9, selectedCharacter: 'diligent' })).toEqual({ completedRuns: 1, selectedCharacter: 'diligent' });
    expect(normalizeCollection({ completedRuns: 9.9, selectedCharacter: 'veteran' })).toEqual({ completedRuns: 9, selectedCharacter: 'rookie' });
    expect(normalizeCollection({ completedRuns: 1000, selectedCharacter: 'veteran' })).toEqual({ completedRuns: 10, selectedCharacter: 'veteran' });
    expect(normalizeCollection({ completedRuns: 10, selectedCharacter: 'unknown' })).toEqual({ completedRuns: 10, selectedCharacter: 'rookie' });
  });
});

describe('pure completion update', () => {
  test.each([
    [0, 1, ['diligent']],
    [8, 9, []],
    [9, 10, ['veteran']],
    [10, 10, []],
  ])('updates %s to %s with only newly eligible characters', (before, after, unlocked) => {
    const value = parsePreferences(null);
    value.collection.completedRuns = before as number;
    value.bestScore = 300;
    const result = applyCompletion(value);
    expect(result.value.collection).toEqual({ completedRuns: after, selectedCharacter: 'rookie' });
    expect(result.unlocked).toEqual(unlocked);
    expect(result.value.bestScore).toBe(300);
    expect(result.value.settings).toBe(value.settings);
    expect(value.collection.completedRuns).toBe(before);
  });

  test('does not auto-equip or mutate a frozen input', () => {
    const value = parsePreferences(null);
    value.collection = { completedRuns: 9, selectedCharacter: 'diligent' };
    Object.freeze(value.settings);
    Object.freeze(value.collection);
    Object.freeze(value);
    const result = applyCompletion(value);
    expect(result.value.collection).toEqual({ completedRuns: 10, selectedCharacter: 'diligent' });
    expect(result.unlocked).toEqual(['veteran']);
  });
});
