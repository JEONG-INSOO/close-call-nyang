import AsyncStorage from '@react-native-async-storage/async-storage';

export const BLOCKED_PLAYERS_KEY = 'close-call-nyang.online.blocked.v1';
export const MAX_BLOCKED_PLAYERS = 200;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_STORAGE_LENGTH = 32 * 1024;

function boundedIds(values: unknown[]): string[] {
  const ids = values.filter((id): id is string => typeof id === 'string' && UUID.test(id)).map(id => id.toLowerCase());
  // Keep the most recently hidden occurrence, not the earliest duplicate.
  return [...new Set(ids.reverse())].reverse().slice(-MAX_BLOCKED_PLAYERS);
}

export function parseBlockedPlayers(raw: string | null): string[] {
  if (!raw || raw.length > MAX_STORAGE_LENGTH) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? boundedIds(parsed) : [];
  } catch { return []; }
}

export async function loadBlockedPlayers(): Promise<string[]> {
  try { return parseBlockedPlayers(await AsyncStorage.getItem(BLOCKED_PLAYERS_KEY)); }
  catch { return []; }
}

let writes: Promise<unknown> = Promise.resolve();

/** Serialize read/merge/write so rapid hides cannot erase an earlier hide. */
export function hidePlayer(publicId: string, current: readonly string[] = []): Promise<{ ids: string[]; saved: boolean }> {
  if (!UUID.test(publicId)) return Promise.resolve({ ids: boundedIds([...current]), saved: false });
  const operation = writes.then(async () => {
    const fallback = boundedIds([...current, publicId]);
    try {
      const stored = parseBlockedPlayers(await AsyncStorage.getItem(BLOCKED_PLAYERS_KEY));
      const ids = boundedIds([...stored, ...current, publicId]);
      await AsyncStorage.setItem(BLOCKED_PLAYERS_KEY, JSON.stringify(ids));
      return { ids, saved: true };
    } catch {
      // Still hide in this view, but never claim a failed disk write was saved.
      return { ids: fallback, saved: false };
    }
  });
  writes = operation.then(() => undefined, () => undefined);
  return operation;
}
