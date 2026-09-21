import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CharacterId } from '../characters/catalog';
import { normalizeCollection } from './characterProgress';

export interface Settings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  hapticsEnabled: boolean;
  reduceMotion: boolean;
}

export interface CollectionState {
  completedRuns: number;
  selectedCharacter: CharacterId;
}

export interface Preferences {
  schemaVersion: 1;
  bestScore: number;
  settings: Settings;
  collection: CollectionState;
}

export type StorageStatus = 'loading' | 'ready' | 'memoryOnly';
export interface PreferencesResult { value: Preferences; status: 'ready' | 'memoryOnly' }

export const PREFERENCES_KEY = 'close-call-nyang.preferences.v1';
export const SETTINGS_KEYS = ['musicEnabled', 'sfxEnabled', 'hapticsEnabled', 'reduceMotion'] as const;

function defaults(): Preferences {
  return {
    schemaVersion: 1,
    bestScore: 0,
    settings: { musicEnabled: true, sfxEnabled: true, hapticsEnabled: true, reduceMotion: false },
    collection: { completedRuns: 0, selectedCharacter: 'rookie' },
  };
}

function record(raw: unknown): Record<string, unknown> | null {
  return raw !== null && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown> : null;
}

function normalizePreferences(raw: unknown): Preferences {
  const value = defaults();
  const parsed = record(raw);
  if (!parsed || parsed.schemaVersion !== 1) return value;
  if (typeof parsed.bestScore === 'number' && Number.isFinite(parsed.bestScore) &&
      Number.isInteger(parsed.bestScore) && parsed.bestScore >= 0) value.bestScore = parsed.bestScore;
  const settings = record(parsed.settings);
  if (settings) {
    for (const key of SETTINGS_KEYS) {
      if (typeof settings[key] === 'boolean') value.settings[key] = settings[key];
    }
  }
  value.collection = normalizeCollection(parsed.collection);
  return value;
}

export function parsePreferences(raw: string | null): Preferences {
  if (raw === null) return defaults();
  try { return normalizePreferences(JSON.parse(raw)); } catch { return defaults(); }
}

export async function loadPreferences(): Promise<PreferencesResult> {
  try {
    return { value: parsePreferences(await AsyncStorage.getItem(PREFERENCES_KEY)), status: 'ready' };
  } catch {
    return { value: defaults(), status: 'memoryOnly' };
  }
}

interface PendingWrite {
  value: Preferences;
  waiters: Array<(saved: boolean) => void>;
}

let pendingWrite: PendingWrite | null = null;
let writing = false;
let queuedBest = 0;

async function flushWrites(): Promise<void> {
  if (writing) return;
  writing = true;
  try {
    while (pendingWrite) {
      const batch: PendingWrite = pendingWrite;
      pendingWrite = null;
      let saved = false;
      try {
        await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(batch.value));
        saved = true;
      } catch {
        // No automatic retry: a later intentional update may try again.
      }
      for (const resolve of batch.waiters) resolve(saved);
    }
  } finally {
    writing = false;
    queuedBest = 0;
  }
}

/** One in-flight write, plus one coalesced latest value; never write out of order. */
export function savePreferences(value: Preferences): Promise<boolean> {
  const safeValue = normalizePreferences(value);
  queuedBest = Math.max(queuedBest, safeValue.bestScore);
  safeValue.bestScore = queuedBest;
  return new Promise((resolve) => {
    if (pendingWrite) {
      pendingWrite.value = safeValue;
      pendingWrite.waiters.push(resolve);
    } else {
      pendingWrite = { value: safeValue, waiters: [resolve] };
    }
    void flushWrites();
  });
}

export function updateBest(value: Preferences, score: number): Preferences {
  if (!Number.isFinite(score) || score < 0) return value;
  const next = Math.max(value.bestScore, Math.floor(score));
  return next === value.bestScore ? value : { ...value, bestScore: next };
}
