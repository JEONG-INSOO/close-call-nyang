import { CHARACTERS, DEFAULT_CHARACTER_ID, getUnlockedCharacterIds } from '../catalog';
import { ko } from '../../i18n/ko';

describe('cosmetic character catalog', () => {
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
