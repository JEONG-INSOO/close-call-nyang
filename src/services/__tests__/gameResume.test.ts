import AsyncStorage from '@react-native-async-storage/async-storage';
import { createInitialState, transition } from '../../game/engine';
import { clearGameResume, GAME_RESUME_KEY, loadGameResume, resumeStateFromGameState, saveGameResume } from '../gameResume';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

const storage = jest.mocked(AsyncStorage);
const FLAGS = { mockAdsEnabled: false };

function pausedState() {
  const started = transition(createInitialState(), { type: 'START', runId: 1, seed: 42 }, FLAGS).state;
  return transition(started, { type: 'PAUSE' }, FLAGS).state;
}

beforeEach(() => {
  jest.clearAllMocks();
  storage.getItem.mockResolvedValue(null);
  storage.setItem.mockResolvedValue();
  storage.removeItem.mockResolvedValue();
});

describe('local game resume storage', () => {
  test('converts an active run to a paused resumable checkpoint', () => {
    const started = transition(createInitialState(), { type: 'START', runId: 1, seed: 42 }, FLAGS).state;
    expect(resumeStateFromGameState(started)).toMatchObject({ screen: 'paused', resumeTo: 'countdown' });
  });

  test('round trips only a valid paused state', async () => {
    const state = pausedState();
    expect(await saveGameResume(state)).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(GAME_RESUME_KEY, expect.any(String));
    storage.getItem.mockResolvedValue(storage.setItem.mock.calls[0][1]);
    expect(await loadGameResume()).toEqual(state);
  });

  test('rejects malformed, wrong-version, and terminal records', async () => {
    for (const raw of [
      '{bad',
      JSON.stringify({ schemaVersion: 2, savedAt: Date.now(), state: pausedState() }),
      JSON.stringify({ schemaVersion: 1, savedAt: Date.now(), state: createInitialState() }),
    ]) {
      storage.getItem.mockResolvedValue(raw);
      expect(await loadGameResume()).toBeNull();
    }
  });

  test('clears the checkpoint without affecting preferences', async () => {
    await clearGameResume();
    expect(storage.removeItem).toHaveBeenCalledWith(GAME_RESUME_KEY);
  });
});
