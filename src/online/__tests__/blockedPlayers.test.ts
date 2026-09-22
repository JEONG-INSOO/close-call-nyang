import AsyncStorage from '@react-native-async-storage/async-storage';
import { BLOCKED_PLAYERS_KEY, hidePlayer, loadBlockedPlayers, MAX_BLOCKED_PLAYERS, parseBlockedPlayers } from '../blockedPlayers';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
beforeEach(async () => { await AsyncStorage.clear(); jest.clearAllMocks(); });
afterEach(() => jest.restoreAllMocks());

describe('bounded public-ID-only hidden players', () => {
  it('rejects corrupt, oversized and non-ID data', () => {
    for (const value of [null, 'garbage', '{}', JSON.stringify(['nickname', { token: 'secret' }]), ' '.repeat(32769)]) {
      expect(parseBlockedPlayers(value)).toEqual([]);
    }
  });

  it('keeps the newest 200 unique public IDs, including most recent duplicate order', () => {
    const ids = Array.from({ length: 205 }, (_, n) => id(n));
    const result = parseBlockedPlayers(JSON.stringify([...ids, id(0)]));
    expect(result).toHaveLength(MAX_BLOCKED_PLAYERS);
    expect(result.at(-1)).toBe(id(0)); expect(result).not.toContain(id(1)); expect(result[0]).toBe(id(6));
  });

  it('serializes concurrent hides so one update does not overwrite another', async () => {
    await Promise.all([hidePlayer(id(1)), hidePlayer(id(2)), hidePlayer(id(3))]);
    expect(await loadBlockedPlayers()).toEqual([id(1), id(2), id(3)]);
    expect(await AsyncStorage.getItem('close-call-nyang.preferences.v1')).toBeNull();
  });

  it('does not overwrite unread storage when reading fails and reports memory-only hiding', async () => {
    await AsyncStorage.setItem(BLOCKED_PLAYERS_KEY, JSON.stringify([id(1)]));
    jest.mocked(AsyncStorage.setItem).mockClear();
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('read failure'));
    expect(await hidePlayer(id(2), [id(3)])).toEqual({ ids: [id(3), id(2)], saved: false });
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(await loadBlockedPlayers()).toEqual([id(1)]);
  });

  it('keeps local hide usable on write failure and does not store nickname or token fields', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
    expect(await hidePlayer(id(1))).toEqual({ ids: [id(1)], saved: false });
    await hidePlayer(id(2));
    expect(await AsyncStorage.getItem(BLOCKED_PLAYERS_KEY)).toBe(JSON.stringify([id(2)]));
  });

  it('ignores invalid IDs without any disk mutation', async () => {
    expect(await hidePlayer('not-a-public-id')).toEqual({ ids: [], saved: false });
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
