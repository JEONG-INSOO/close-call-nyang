import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { createRankingApi } from '../api';
import * as client from '../client';
import { useOnlineProfile } from '../useOnlineProfile';
import { OnlineApiError, type RankingApi } from '../types';

jest.mock('react-native-url-polyfill/auto', () => ({}));
jest.mock('../api', () => ({ createRankingApi: jest.fn(), invalidateLeaderboardCache: jest.fn() }));
jest.mock('../client', () => ({
  getOnlineConfig: jest.fn(), getOnlineIdentity: jest.fn(), getPendingDeletion: jest.fn(),
  clearOnlineSession: jest.fn(), ensureGuestSession: jest.fn(), subscribeOnlineIdentity: jest.fn(), startOnlineSessionLifecycle: jest.fn(),
  withOnlineDeadline: jest.requireActual('../client').withOnlineDeadline,
}));
const mocks = jest.mocked(client);
const profile = { publicId: '10000000-0000-4000-8000-000000000001', nickname: '냥대리', updatedAt: '2026-09-22T00:00:00.000Z' };
const identity = { userId: 'owner-a', accessToken: 'private-a' };
const api = { getProfile: jest.fn(), saveNickname: jest.fn(), deleteProfile: jest.fn(), getLeaderboard: jest.fn(), startRun: jest.fn(), sendChunk: jest.fn(), finalizeRun: jest.fn(), reportNickname: jest.fn() } satisfies jest.Mocked<RankingApi>;
let identityListener: (current: typeof identity | null) => void;
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
beforeEach(() => {
  jest.clearAllMocks();
  mocks.getOnlineConfig.mockReturnValue({ url: 'https://nyang.supabase.co', publishableKey: 'sb_publishable_fixture' });
  mocks.getOnlineIdentity.mockResolvedValue(null);
  mocks.getPendingDeletion.mockResolvedValue(null);
  mocks.clearOnlineSession.mockImplementation(async () => { mocks.getOnlineIdentity.mockResolvedValue(null); });
  mocks.ensureGuestSession.mockImplementation(async () => { mocks.getOnlineIdentity.mockResolvedValue(identity); });
  mocks.subscribeOnlineIdentity.mockImplementation(listener => { identityListener = listener; return jest.fn(); });
  mocks.startOnlineSessionLifecycle.mockReturnValue(jest.fn());
  jest.mocked(createRankingApi).mockReturnValue(api);
  api.getProfile.mockReset().mockResolvedValue(profile);
  api.saveNickname.mockReset().mockResolvedValue(profile);
  api.deleteProfile.mockReset().mockImplementation(async () => { mocks.getOnlineIdentity.mockResolvedValue(null); mocks.getPendingDeletion.mockResolvedValue(null); });
});
afterEach(async () => { await cleanup(); jest.useRealTimers(); });

test('unconfigured mode does not touch auth/network and cannot block local play', async () => {
  mocks.getOnlineConfig.mockReturnValue(null);
  jest.mocked(createRankingApi).mockReturnValue(null);
  const { result } = await renderHook(() => useOnlineProfile());
  expect(result.current).toMatchObject({ status: 'unconfigured', api: null, profile: null, userId: null, isBusy: false });
  await act(async () => { expect(await result.current.saveNickname('냥대리')).toBe(false); });
  expect(mocks.ensureGuestSession).not.toHaveBeenCalled();
  expect(api.getProfile).not.toHaveBeenCalled();
});
test('opening app/read-only profile restoration never creates anonymous users', async () => {
  const { result } = await renderHook(() => useOnlineProfile());
  await waitFor(() => expect(result.current.status).toBe('guest'));
  await act(async () => { await result.current.refresh(); });
  expect(mocks.ensureGuestSession).not.toHaveBeenCalled();
  expect(api.getProfile).not.toHaveBeenCalled();
  expect(result.current.userId).toBeNull();
});
test('existing session restores a confirmed profile and returns an identity-bound API', async () => {
  mocks.getOnlineIdentity.mockResolvedValue(identity);
  const { result } = await renderHook(() => useOnlineProfile());
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(result.current.profile).toEqual(profile);
  expect(result.current.userId).toBe(identity.userId);
  expect(createRankingApi).toHaveBeenCalledWith(identity.userId);
  expect(mocks.ensureGuestSession).not.toHaveBeenCalled();
});
test('explicit valid save creates a session, normalizes nickname, and shows only confirmed name', async () => {
  const saved = deferred<typeof profile>();
  api.saveNickname.mockReturnValue(saved.promise);
  const { result } = await renderHook(() => useOnlineProfile());
  await waitFor(() => expect(result.current.status).toBe('guest'));
  let save!: Promise<boolean>;
  await act(() => { save = result.current.saveNickname('  냥대리  '); });
  expect(result.current.isBusy).toBe(true);
  expect(result.current.profile).toBeNull();
  expect(mocks.ensureGuestSession).toHaveBeenCalledTimes(1);
  expect(api.saveNickname).toHaveBeenCalledWith('냥대리');
  await act(async () => { expect(await result.current.saveNickname('다른 이름')).toBe(false); });
  expect(api.saveNickname).toHaveBeenCalledTimes(1);
  await act(async () => { saved.resolve(profile); expect(await save).toBe(true); });
  expect(result.current).toMatchObject({ status: 'ready', profile, userId: identity.userId, isBusy: false });
});
test('shape validation happens before signup and rejected rename preserves old confirmed name', async () => {
  mocks.getOnlineIdentity.mockResolvedValue(identity);
  const { result } = await renderHook(() => useOnlineProfile());
  await waitFor(() => expect(result.current.status).toBe('ready'));
  await act(async () => { expect(await result.current.saveNickname('!')).toBe(false); });
  expect(mocks.ensureGuestSession).not.toHaveBeenCalled();
  api.saveNickname.mockRejectedValue(new OnlineApiError('NICKNAME_REJECTED', 422));
  await act(async () => { expect(await result.current.saveNickname('운영자')).toBe(false); });
  expect(result.current.profile).toEqual(profile);
  expect(result.current.error).toContain('다른 이름');
  expect(result.current.isBusy).toBe(false);
});
test('network failure does not discard an existing profile or silently register a new one', async () => {
  mocks.getOnlineIdentity.mockResolvedValue(identity);
  const { result } = await renderHook(() => useOnlineProfile());
  await waitFor(() => expect(result.current.status).toBe('ready'));
  api.getProfile.mockRejectedValue(new OnlineApiError('UNAVAILABLE'));
  await act(async () => { await result.current.refresh(); });
  expect(result.current).toMatchObject({ status: 'offline', profile, userId: identity.userId });
  expect(mocks.ensureGuestSession).not.toHaveBeenCalled();
  expect(mocks.clearOnlineSession).not.toHaveBeenCalled();
});
test('lost auth clears inaccessible profile and explains device-local ownership without signup', async () => {
  mocks.getOnlineIdentity.mockResolvedValue(identity);
  const { result } = await renderHook(() => useOnlineProfile());
  await waitFor(() => expect(result.current.status).toBe('ready'));
  mocks.getOnlineIdentity.mockResolvedValue(null);
  await act(async () => { identityListener(null); });
  await waitFor(() => expect(result.current.status).toBe('guest'));
  expect(result.current.profile).toBeNull();
  expect(result.current.userId).toBeNull();
  expect(result.current.error).toContain('복구되지');
  expect(mocks.ensureGuestSession).not.toHaveBeenCalled();
});
test('unrecoverable authenticated API response allows explicit rejoin only after local invalid-session cleanup', async () => {
  mocks.getOnlineIdentity.mockResolvedValue(identity);
  api.getProfile.mockRejectedValue(new OnlineApiError('UNAUTHORIZED', 401));
  const { result } = await renderHook(() => useOnlineProfile());
  await waitFor(() => expect(result.current.status).toBe('guest'));
  expect(result.current.profile).toBeNull();
  expect(result.current.userId).toBeNull();
  expect(mocks.clearOnlineSession).toHaveBeenCalledTimes(1);
  expect(mocks.ensureGuestSession).not.toHaveBeenCalled();
});
test('deletion failure freezes participation but releases busy state so the same identity can retry', async () => {
  mocks.getOnlineIdentity.mockResolvedValue(identity);
  const { result } = await renderHook(() => useOnlineProfile());
  await waitFor(() => expect(result.current.status).toBe('ready'));
  api.deleteProfile.mockRejectedValueOnce(new OnlineApiError('UNAVAILABLE'));
  await act(async () => { expect(await result.current.deleteProfile()).toBe(false); });
  expect(result.current).toMatchObject({ status: 'deleting', deletionPending: true, isBusy: false, userId: identity.userId, profile });
  expect(result.current.error).toContain('다시 시도');
  await act(async () => { expect(await result.current.deleteProfile()).toBe(true); });
  expect(api.deleteProfile).toHaveBeenCalledTimes(2);
  expect(result.current).toMatchObject({ status: 'guest', deletionPending: false, isBusy: false, userId: null, profile: null });
  expect(mocks.ensureGuestSession).not.toHaveBeenCalled();
});
test('pending deletion restoration cannot fetch profile or automatically create a new user', async () => {
  mocks.getPendingDeletion.mockResolvedValue(identity);
  mocks.getOnlineIdentity.mockResolvedValue(identity);
  const { result } = await renderHook(() => useOnlineProfile());
  await waitFor(() => expect(result.current.status).toBe('deleting'));
  expect(result.current.deletionPending).toBe(true);
  expect(result.current.isBusy).toBe(false);
  expect(api.getProfile).not.toHaveBeenCalled();
  await act(async () => { expect(await result.current.saveNickname('새이름')).toBe(false); });
  expect(mocks.ensureGuestSession).not.toHaveBeenCalled();
  expect(result.current.status).toBe('deleting');
});
test('stale restore cannot overwrite a newer successful nickname save', async () => {
  mocks.getOnlineIdentity.mockResolvedValue(identity);
  const old = deferred<typeof profile>();
  api.getProfile.mockReturnValue(old.promise);
  const edited = { ...profile, nickname: '새로운냥' };
  api.saveNickname.mockResolvedValue(edited);
  const { result } = await renderHook(() => useOnlineProfile());
  await waitFor(() => expect(api.getProfile).toHaveBeenCalled());
  await act(async () => { expect(await result.current.saveNickname('새로운냥')).toBe(true); });
  await act(async () => { old.resolve(profile); });
  expect(result.current.profile).toEqual(edited);
});
test('unmount makes stale actions inert and cleans up auth lifecycle listeners', async () => {
  const rendered = await renderHook(() => useOnlineProfile());
  await waitFor(() => expect(rendered.result.current.status).toBe('guest'));
  const old = rendered.result.current;
  await rendered.unmount();
  expect(mocks.startOnlineSessionLifecycle.mock.results[0].value).toHaveBeenCalled();
  expect(mocks.subscribeOnlineIdentity.mock.results[0].value).toHaveBeenCalled();
  await expect(old.saveNickname('냥대리')).resolves.toBe(false);
  await expect(old.deleteProfile()).resolves.toBe(false);
  expect(mocks.ensureGuestSession).not.toHaveBeenCalled();
});

test('late profile response after the restoration deadline cannot overwrite offline status', async () => {
  jest.useFakeTimers();
  mocks.getOnlineIdentity.mockResolvedValue(identity);
  const pending = deferred<typeof profile>();
  api.getProfile.mockReturnValue(pending.promise);
  const { result } = await renderHook(() => useOnlineProfile());
  await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });
  expect(result.current.status).toBe('offline');
  await act(async () => { pending.resolve(profile); });
  expect(result.current.status).toBe('offline');
  expect(result.current.profile).toBeNull();
});

test('a nickname response for a former identity cannot appear under a replacement session', async () => {
  mocks.getOnlineIdentity.mockResolvedValue(identity);
  const { result } = await renderHook(() => useOnlineProfile());
  await waitFor(() => expect(result.current.status).toBe('ready'));
  const pending = deferred<typeof profile>();
  api.saveNickname.mockReturnValue(pending.promise);
  let saving!: Promise<boolean>;
  await act(() => { saving = result.current.saveNickname('옛계정'); });
  const replacement = { userId: 'owner-b', accessToken: 'private-b' };
  await act(() => {
    mocks.getOnlineIdentity.mockResolvedValue(replacement);
    identityListener(replacement);
  });
  await act(async () => { pending.resolve({ ...profile, nickname: '옛계정' }); expect(await saving).toBe(false); });
  expect(result.current.userId).toBe('owner-b');
  expect(result.current.profile).toBeNull();
  expect(mocks.clearOnlineSession).not.toHaveBeenCalled();
});
