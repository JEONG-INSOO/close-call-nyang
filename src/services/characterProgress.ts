import { DEFAULT_CHARACTER_ID, getUnlockedCharacterIds } from '../characters/catalog';
import type { CharacterId } from '../characters/catalog';
import type { CollectionState, Preferences } from './preferences';

export function normalizeCollection(raw: unknown): CollectionState {
  const value = raw !== null && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown> : {};
  const completedRuns = typeof value.completedRuns === 'number' && Number.isFinite(value.completedRuns)
    ? Math.min(10, Math.max(0, Math.floor(value.completedRuns))) : 0;
  const unlocked = getUnlockedCharacterIds(completedRuns);
  const selectedCharacter = unlocked.includes(value.selectedCharacter as CharacterId)
    ? value.selectedCharacter as CharacterId : DEFAULT_CHARACTER_ID;
  return { completedRuns, selectedCharacter };
}

/** Only updates local cosmetic progress; the caller owns attempt deduplication. */
export function applyCompletion(value: Preferences): { value: Preferences; unlocked: readonly CharacterId[] } {
  const before = normalizeCollection(value.collection);
  const completedRuns = Math.min(10, before.completedRuns + 1);
  const previouslyUnlocked = getUnlockedCharacterIds(before.completedRuns);
  const unlocked = getUnlockedCharacterIds(completedRuns).filter((id) => !previouslyUnlocked.includes(id));
  return {
    value: { ...value, collection: { ...before, completedRuns } },
    unlocked,
  };
}
