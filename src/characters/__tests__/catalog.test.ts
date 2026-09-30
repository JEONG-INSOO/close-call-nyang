import { CHARACTERS, DEFAULT_CHARACTER_ID, getSelectableCharacterIds, getUnlockedCharacterIds } from '../catalog';
import { ko } from '../../i18n/ko';

describe('cosmetic character catalog', () => {
  it('previews all characters only when the development flag is enabled, without awarding progress', () => {
    const previous = process.env.EXPO_PUBLIC_TEST_UNLOCK_ALL_CHARACTERS;
    const runtime = globalThis as typeof globalThis & { __DEV__: boolean };
    const previousDev = runtime.__DEV__;
    try {
      delete process.env.EXPO_PUBLIC_TEST_UNLOCK_ALL_CHARACTERS;
      expect(getSelectableCharacterIds(0)).toEqual(['rookie']);
      process.env.EXPO_PUBLIC_TEST_UNLOCK_ALL_CHARACTERS = 'true';
      expect(getSelectableCharacterIds(0)).toEqual(['rookie', 'diligent', 'veteran']);
      expect(getUnlockedCharacterIds(0)).toEqual(['rookie']);
      runtime.__DEV__ = false;
      expect(getSelectableCharacterIds(0)).toEqual(['rookie']);
    } finally {
      runtime.__DEV__ = previousDev;
      if (previous === undefined) delete process.env.EXPO_PUBLIC_TEST_UNLOCK_ALL_CHARACTERS;
      else process.env.EXPO_PUBLIC_TEST_UNLOCK_ALL_CHARACTERS = previous;
    }
  });
  it('preserves the default, order, localization keys and exact unlock thresholds', () => {
    expect(DEFAULT_CHARACTER_ID).toBe('rookie');
    expect(CHARACTERS).toEqual([
      { id: 'rookie', nameKey: 'characterRookie', requiredCompletions: 0 },
      { id: 'diligent', nameKey: 'characterDiligent', requiredCompletions: 1 },
      { id: 'veteran', nameKey: 'characterVeteran', requiredCompletions: 10 },
    ]);
    expect(CHARACTERS.map((character) => ko[character.nameKey])).toEqual([
      '허둥대는 냥대리', '성실한 냥대리', '베테랑 냥대리',
    ]);
  });

  it.each([
    [0, ['rookie']],
    [1, ['rookie', 'diligent']],
    [9, ['rookie', 'diligent']],
    [10, ['rookie', 'diligent', 'veteran']],
    [1.9, ['rookie', 'diligent']],
    [9.99, ['rookie', 'diligent']],
    [10.1, ['rookie', 'diligent', 'veteran']],
    [Number.MAX_VALUE, ['rookie', 'diligent', 'veteran']],
  ])('returns eligible IDs in order for %s completed runs', (count, expected) => {
    expect(getUnlockedCharacterIds(count as number)).toEqual(expected);
  });

  it.each([-1, -100, -0.5, NaN, Infinity, -Infinity])('normalizes %s to zero completions', (count) => {
    expect(getUnlockedCharacterIds(count)).toEqual(['rookie']);
  });

  it('does not expose catalog mutations through returned IDs', () => {
    const ids = getUnlockedCharacterIds(10);
    (ids as string[]).splice(0, ids.length, 'unknown');
    expect(getUnlockedCharacterIds(0)).toEqual(['rookie']);
    expect(getUnlockedCharacterIds(10)).toEqual(['rookie', 'diligent', 'veteran']);
    expect(Object.isFrozen(CHARACTERS)).toBe(true);
    expect(CHARACTERS.every(Object.isFrozen)).toBe(true);
  });
});
