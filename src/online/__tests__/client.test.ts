import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { clearOnlineSession, ensureGuestSession, getOnlineClient, getOnlineConfig, getOnlineIdentity, getPendingDeletion, ONLINE_DELETION_KEY, ONLINE_SESSION_KEY, preserveDeletionIdentity, refreshOnlineIdentity, startOnlineSessionLifecycle, subscribeOnlineIdentity, withOnlineDeadline } from '../client';

jest.mock('react-native-url-polyfill/auto', () => ({}));
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
const identity = { userId: 'user-a', accessToken: 'private-token-a' };
const session = { user: { id: identity.userId }, access_token: identity.accessToken };
const sdk = { auth: {
  getSession: jest.fn(), signInAnonymously: jest.fn(), refreshSession: jest.fn(),
  onAuthStateChange: jest.fn(), startAutoRefresh: jest.fn(), stopAutoRefresh: jest.fn(),
} };
let authListener: (event: string, value: typeof session | null) => void;
const originalEnv = { url: process.env.EXPO_PUBLIC_SUPABASE_URL, key: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY };

beforeEach(async () => {
  await clearOnlineSession();
  await AsyncStorage.clear();
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://nyang.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_public-test';
  jest.mocked(createClient).mockReturnValue(sdk as never);
  sdk.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  sdk.auth.signInAnonymously.mockResolvedValue({ data: { session }, error: null });
  sdk.auth.refreshSession.mockResolvedValue({ data: { session }, error: null });
  sdk.auth.onAuthStateChange.mockImplementation(callback => { authListener = callback; return { data: { subscription: { unsubscribe: jest.fn() } } }; });
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active', writable: true });
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
});
afterEach(() => { jest.useRealTimers(); });
afterAll(async () => {
  await clearOnlineSession();
  if (originalEnv.url === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL; else process.env.EXPO_PUBLIC_SUPABASE_URL = originalEnv.url;
  if (originalEnv.key === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY; else process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalEnv.key;
});

test('missing/secret configuration leaves local game usable without SDK creation', async () => {
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  expect(getOnlineConfig()).toBeNull();
  expect(getOnlineClient()).toBeNull();
  expect(await getOnlineIdentity()).toBeNull();
  expect(createClient).not.toHaveBeenCalled();
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://nyang.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_secret_never-client';
  expect(getOnlineConfig()).toBeNull();
});
test.each(['https://user:pass@example.com', 'http://example.com', 'https://example.com/functions', 'https://example.com?secret=1'])('rejects unsafe/misconfigured URL %s', url => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = url;
  expect(getOnlineConfig()).toBeNull();
});
test('restores session using separate persistent auth key, without signup', async () => {
  sdk.auth.getSession.mockResolvedValue({ data: { session }, error: null });
  expect(await getOnlineIdentity()).toEqual(identity);
  expect(await getOnlineIdentity()).toEqual(identity);
  expect(createClient).toHaveBeenCalledTimes(1);
  expect(createClient).toHaveBeenCalledWith('https://nyang.supabase.co', 'sb_publishable_public-test', expect.objectContaining({ auth: expect.objectContaining({ storageKey: ONLINE_SESSION_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }) }));
  expect(sdk.auth.signInAnonymously).not.toHaveBeenCalled();
});
test('explicit concurrent nickname saves create at most one guest session', async () => {
  await Promise.all([ensureGuestSession(), ensureGuestSession()]);
  expect(sdk.auth.signInAnonymously).toHaveBeenCalledTimes(1);
});
test('explicit save reuses restored identity rather than signup', async () => {
  sdk.auth.getSession.mockResolvedValue({ data: { session }, error: null });
  await ensureGuestSession();
  expect(sdk.auth.signInAnonymously).not.toHaveBeenCalled();
});
test('auth listeners receive identity changes without SDK methods inside the callback', () => {
  const listener = jest.fn();
  const stop = subscribeOnlineIdentity(listener);
  getOnlineClient();
  authListener('SIGNED_IN', session);
  authListener('SIGNED_OUT', null);
  expect(listener.mock.calls).toEqual([[identity], [null]]);
  expect(sdk.auth.getSession).not.toHaveBeenCalled();
  stop();
});
test('foreground starts token refresh and background stops it with cleanup', () => {
  const stop = startOnlineSessionLifecycle();
  expect(sdk.auth.startAutoRefresh).toHaveBeenCalled();
  const listener = jest.mocked(AppState.addEventListener).mock.calls[0][1];
  listener('background');
  expect(sdk.auth.stopAutoRefresh).toHaveBeenCalled();
  listener('active');
  stop();
  expect(jest.mocked(AppState.addEventListener).mock.results[0].value.remove).toHaveBeenCalled();
});
test('deletion preserves the same auth-only retry identity and prevents new accounts', async () => {
  await preserveDeletionIdentity(identity);
  expect(JSON.parse((await AsyncStorage.getItem(ONLINE_DELETION_KEY))!)).toEqual(identity);
  expect(await getPendingDeletion()).toEqual(identity);
  expect(await getOnlineIdentity()).toEqual(identity);
  expect(sdk.auth.getSession).not.toHaveBeenCalled();
  await expect(ensureGuestSession()).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  await expect(refreshOnlineIdentity(identity.userId)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  expect(sdk.auth.signInAnonymously).not.toHaveBeenCalled();
  expect(sdk.auth.stopAutoRefresh).toHaveBeenCalled();
});
test('cannot replace a deletion identity, and successful cleanup preserves all game keys', async () => {
  await AsyncStorage.setItem('close-call-nyang.preferences.v1', 'local-collection');
  await AsyncStorage.setItem('close-call-nyang.online.proof.v1', 'queue-owned-by-coordinator');
  await AsyncStorage.setItem(ONLINE_SESSION_KEY, 'sdk-session');
  await preserveDeletionIdentity(identity);
  await expect(preserveDeletionIdentity({ userId: 'other', accessToken: 'other-token' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  await clearOnlineSession();
  expect(await AsyncStorage.getItem(ONLINE_SESSION_KEY)).toBeNull();
  expect(await AsyncStorage.getItem(ONLINE_DELETION_KEY)).toBeNull();
  expect(await AsyncStorage.getItem('close-call-nyang.preferences.v1')).toBe('local-collection');
  expect(await AsyncStorage.getItem('close-call-nyang.online.proof.v1')).toBe('queue-owned-by-coordinator');
});
test('refresh cannot silently switch the owner of an existing run', async () => {
  sdk.auth.refreshSession.mockResolvedValue({ data: { session: { ...session, user: { id: 'different' } } }, error: null });
  await expect(refreshOnlineIdentity(identity.userId)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  expect(sdk.auth.refreshSession).toHaveBeenCalledTimes(1);
});
test('deadline aborts even if a network adapter ignores cancellation', async () => {
  jest.useFakeTimers();
  let signal: AbortSignal | undefined;
  const promise = withOnlineDeadline(async supplied => { signal = supplied; return new Promise<void>(() => undefined); }, 2_000);
  const rejected = expect(promise).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  await jest.advanceTimersByTimeAsync(2_000);
  await rejected;
  expect(signal?.aborted).toBe(true);
});

test('old SDK callbacks and delayed storage writes cannot resurrect a deleted session', async () => {
  const listener = jest.fn();
  const stop = subscribeOnlineIdentity(listener);
  getOnlineClient();
  const oldListener = authListener;
  const oldStorage = jest.mocked(createClient).mock.calls[0][2]!.auth!.storage!;
  await oldStorage.setItem(ONLINE_SESSION_KEY, 'old-session');
  const racingWrite = oldStorage.setItem(ONLINE_SESSION_KEY, 'late-refresh');
  await clearOnlineSession();
  await racingWrite;
  listener.mockClear();
  oldListener('TOKEN_REFRESHED', session);
  await oldStorage.setItem(ONLINE_SESSION_KEY, 'stale-signup');
  expect(await AsyncStorage.getItem(ONLINE_SESSION_KEY)).toBeNull();
  expect(listener).not.toHaveBeenCalled();
  getOnlineClient();
  const newStorage = jest.mocked(createClient).mock.calls[1][2]!.auth!.storage!;
  await newStorage.setItem(ONLINE_SESSION_KEY, 'new-explicit-participation');
  await oldStorage.removeItem(ONLINE_SESSION_KEY);
  expect(await AsyncStorage.getItem(ONLINE_SESSION_KEY)).toBe('new-explicit-participation');
  stop();
});

test('lifecycle manages the replacement SDK after deletion and explicit rejoin', async () => {
  const stop = startOnlineSessionLifecycle();
  const foregroundListener = jest.mocked(AppState.addEventListener).mock.calls[0][1];
  await clearOnlineSession();
  const replacement = { auth: { ...sdk.auth, startAutoRefresh: jest.fn(), stopAutoRefresh: jest.fn() } };
  jest.mocked(createClient).mockReturnValue(replacement as never);
  getOnlineClient();
  sdk.auth.stopAutoRefresh.mockClear();
  foregroundListener('background');
  expect(replacement.auth.stopAutoRefresh).toHaveBeenCalledTimes(1);
  expect(sdk.auth.stopAutoRefresh).not.toHaveBeenCalled();
  foregroundListener('active');
  expect(replacement.auth.startAutoRefresh).toHaveBeenCalledTimes(1);
  stop();
});

test('a timed-out signup remains single-flight until the underlying SDK request settles', async () => {
  jest.useFakeTimers();
  let resolve!: (value: { data: { session: typeof session }; error: null }) => void;
  sdk.auth.signInAnonymously.mockReturnValue(new Promise(yes => { resolve = yes; }));
  const first = ensureGuestSession();
  const rejected = expect(first).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  await jest.advanceTimersByTimeAsync(10_000);
  await rejected;
  const second = ensureGuestSession();
  await jest.advanceTimersByTimeAsync(0);
  expect(sdk.auth.signInAnonymously).toHaveBeenCalledTimes(1);
  resolve({ data: { session }, error: null });
  await expect(second).resolves.toBeUndefined();
});

test('an app restart restores the deletion retry token without asking the SDK to refresh', async () => {
  await AsyncStorage.setItem(ONLINE_DELETION_KEY, JSON.stringify(identity));
  let restored!: typeof import('../client');
  jest.isolateModules(() => { restored = require('../client') as typeof import('../client'); });
  expect(await restored.getPendingDeletion()).toEqual(identity);
  expect(await restored.getOnlineIdentity()).toEqual(identity);
  expect(sdk.auth.getSession).not.toHaveBeenCalled();
  await expect(restored.ensureGuestSession()).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  await restored.clearOnlineSession();
});
