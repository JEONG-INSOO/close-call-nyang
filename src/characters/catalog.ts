export type CharacterId = 'rookie' | 'diligent' | 'veteran';

export interface CharacterDefinition {
  id: CharacterId;
  nameKey: 'characterRookie' | 'characterDiligent' | 'characterVeteran';
  requiredCompletions: 0 | 1 | 10;
}

export const CHARACTERS: readonly CharacterDefinition[] = Object.freeze([
  Object.freeze({ id: 'rookie', nameKey: 'characterRookie', requiredCompletions: 0 }),
  Object.freeze({ id: 'diligent', nameKey: 'characterDiligent', requiredCompletions: 1 }),
  Object.freeze({ id: 'veteran', nameKey: 'characterVeteran', requiredCompletions: 10 }),
]);

export const DEFAULT_CHARACTER_ID: CharacterId = 'rookie';

/** Cosmetic eligibility only; run counting and persistence live outside the catalog. */
export function getUnlockedCharacterIds(completedRuns: number): readonly CharacterId[] {
  const completions = Number.isFinite(completedRuns)
    ? Math.max(0, Math.floor(completedRuns))
    : 0;

  return CHARACTERS.filter((character) => character.requiredCompletions <= completions)
    .map((character) => character.id);
}
