import AsyncStorage from '@react-native-async-storage/async-storage';
import { isRestorableGameState } from '../game/resume';
import type { GameState } from '../game/types';

export const GAME_RESUME_KEY = 'close-call-nyang.game-resume.v1';

interface ResumeRecord {
  schemaVersion: 1;
  savedAt: number;
  state: GameState;
}

function record(value: unknown): value is ResumeRecord {
  if (value == null || typeof value !== 'object') return false;
  const candidate = value as ResumeRecord;
  return candidate.schemaVersion === 1 && Number.isFinite(candidate.savedAt) &&
    candidate.savedAt > 0 && isRestorableGameState(candidate.state);
}

export function resumeStateFromGameState(state: GameState): GameState | null {
  if (state.screen === 'paused' && isRestorableGameState(state)) return state;
  if (state.screen !== 'playing' && state.screen !== 'countdown' && state.screen !== 'ad') return null;
  const paused: GameState = { ...state, screen: 'paused', resumeTo: state.screen };
  return isRestorableGameState(paused) ? paused : null;
}

export async function loadGameResume(): Promise<GameState | null> {
  try {
    const raw = await AsyncStorage.getItem(GAME_RESUME_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return record(parsed) ? parsed.state : null;
  } catch {
    return null;
  }
}

export async function saveGameResume(state: GameState): Promise<boolean> {
  if (!isRestorableGameState(state)) return false;
  const value: ResumeRecord = { schemaVersion: 1, savedAt: Date.now(), state };
  try {
    await AsyncStorage.setItem(GAME_RESUME_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export async function clearGameResume(): Promise<void> {
  try { await AsyncStorage.removeItem(GAME_RESUME_KEY); } catch { /* best effort */ }
}
