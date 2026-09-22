import { createRankingApi, invalidateLeaderboardCache } from '../api';
import * as client from '../client';
import { RULES_VERSION } from '../rulesVersion';
import { OnlineApiError, onlineErrorMessage } from '../types';

jest.mock('react-native-url-polyfill/auto', () => ({}));
jest.mock('../client', () => ({
  getOnlineConfig: jest.fn(), getOnlineIdentity: jest.fn(), getPendingDeletion: jest.fn(),
  refreshOnlineIdentity: jest.fn(), preserveDeletionIdentity: jest.fn(), clearOnlineSession: jest.fn(),
  withOnlineDeadline: jest.requireActual('../client').withOnlineDeadline,
}));
const mocks = jest.mocked(client);
const user = { userId: 'user-a', accessToken: 'private-a' };
const publicId = '10000000-0000-4000-8000-000000000001';
const runId = '20000000-0000-4000-8000-000000000001';
const now = '2026-09-22T00:00:00.000Z';
const profile = { publicId, nickname: '냥대리', updatedAt: now };
const entry = { publicId, nickname: '냥대리', score: 101, rank: 1, achievedAt: now, isMe: true };
const board = { entries: [entry], me: entry, rulesVersion: RULES_VERSION, fetchedAt: now };
const run = { runId, engineRunId: 7, seed: 100, rulesVersion: RULES_VERSION, issuedAt: now, expiresAt: '2026-09-23T00:00:00.000Z' };
const fetchMock = jest.fn();
const originalFetch = globalThis.fetch;
function response(value: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(value), headers: { get: (name: string) => headers[name] ?? null } } as Response;
}
beforeEach(() => {
  jest.clearAllMocks();
  invalidateLeaderboardCache();
  globalThis.fetch = fetchMock;
  mocks.getOnlineConfig.mockReturnValue({ url: 'https://nyang.supabase.co', publishableKey: 'sb_publishable_fixture' });
  mocks.getOnlineIdentity.mockResolvedValue(user);
  mocks.getPendingDeletion.mockResolvedValue(null);
  mocks.refreshOnlineIdentity.mockResolvedValue({ ...user, accessToken: 'refreshed-a' });
  mocks.preserveDeletionIdentity.mockResolvedValue();
  mocks.clearOnlineSession.mockResolvedValue();
  fetchMock.mockReset().mockResolvedValue(response(profile));
});
afterEach(() => { jest.useRealTimers(); });
afterAll(() => { globalThis.fetch = originalFetch; });

test('missing public environment returns no API', () => {
  mocks.getOnlineConfig.mockReturnValue(null);
  expect(createRankingApi()).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});
test('public board does not sign up or manufacture an Authorization header', async () => {
  mocks.getOnlineIdentity.mockResolvedValue(null);
  fetchMock.mockResolvedValue(response({ ...board, me: null, entries: [{ ...entry, isMe: false }] }));
  const value = await createRankingApi()!.getLeaderboard();
  expect(value.me).toBeNull();
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining(`/leaderboard?rulesVersion=${RULES_VERSION}`), expect.objectContaining({ method: 'GET', headers: { apikey: 'sb_publishable_fixture' }, cache: 'no-store' }));
});
test('profile save normalizes a duplicate-capable nickname, discards extra private fields', async () => {
  fetchMock.mockResolvedValue(response({ ...profile, userId: 'never-public', access_token: 'never-public' }));
  expect(await createRankingApi(user.userId)!.saveNickname('  냥대리  ')).toEqual(profile);
  expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ nickname: '냥대리' }));
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer private-a');
  await expect(createRankingApi()!.saveNickname('a')).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
test('protected call cannot use a new identity for a previously bound queue', async () => {
  mocks.getOnlineIdentity.mockResolvedValue({ userId: 'other-user', accessToken: 'other-token' });
  await expect(createRankingApi(user.userId)!.startRun()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  expect(fetchMock).not.toHaveBeenCalled();
});
test('401 refreshes once and retries with the same user only', async () => {
  fetchMock.mockResolvedValueOnce(response({ code: 'UNAUTHORIZED' }, 401)).mockResolvedValueOnce(response(profile));
  expect(await createRankingApi(user.userId)!.getProfile()).toEqual(profile);
  expect(mocks.refreshOnlineIdentity).toHaveBeenCalledTimes(1);
  expect(mocks.refreshOnlineIdentity).toHaveBeenCalledWith(user.userId);
  expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer refreshed-a');
});
test('second unauthorized response reaches caller without another refresh', async () => {
  fetchMock.mockResolvedValue(response({ code: 'UNAUTHORIZED' }, 401));
  await expect(createRankingApi()!.getProfile()).rejects.toMatchObject({ code: 'UNAUTHORIZED', retryable: false });
  expect(mocks.refreshOnlineIdentity).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
test('identity change during refresh never sends old proof under the new owner', async () => {
  fetchMock.mockResolvedValue(response({ code: 'UNAUTHORIZED' }, 401));
  mocks.refreshOnlineIdentity.mockResolvedValue({ userId: 'other', accessToken: 'other-token' });
  await expect(createRankingApi()!.sendChunk({ runId, seq: 0, spans: [{ direction: 0, ticks: 1 }] })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
test('start deadline includes session lookup and never fetches a late challenge', async () => {
  jest.useFakeTimers();
  let resolve!: (value: typeof user) => void;
  mocks.getOnlineIdentity.mockReturnValue(new Promise(yes => { resolve = yes; }));
  const promise = createRankingApi()!.startRun();
  const rejection = expect(promise).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  await jest.advanceTimersByTimeAsync(2_000);
  await rejection;
  resolve(user);
  await jest.advanceTimersByTimeAsync(0);
  expect(fetchMock).not.toHaveBeenCalled();
});
test('start deadline aborts a fetch and ignores its late response', async () => {
  jest.useFakeTimers();
  let resolve!: (value: Response) => void;
  fetchMock.mockReturnValue(new Promise(yes => { resolve = yes; }));
  const promise = createRankingApi()!.startRun();
  const rejection = expect(promise).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  await jest.advanceTimersByTimeAsync(2_000);
  await rejection;
  expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  resolve(response(run));
  await jest.advanceTimersByTimeAsync(0);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
test('run DTO enforces current rules and numeric engine IDs separately from UUID', async () => {
  fetchMock.mockResolvedValueOnce(response(run));
  expect(await createRankingApi()!.startRun()).toEqual(run);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ rulesVersion: RULES_VERSION });
  fetchMock.mockResolvedValueOnce(response({ ...run, engineRunId: runId }));
  await expect(createRankingApi()!.startRun()).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  fetchMock.mockResolvedValueOnce(response({ ...run, rulesVersion: 'nyang-v1-old' }));
  await expect(createRankingApi()!.startRun()).rejects.toMatchObject({ code: 'RULES_MISMATCH' });
});
test('board is cached 30 seconds only within the same identity and retains tied ranks', async () => {
  jest.useFakeTimers();
  const tied = { ...entry, publicId: '10000000-0000-4000-8000-000000000002', isMe: false };
  const outside = { ...entry, rank: 150 };
  fetchMock.mockResolvedValue(response({ ...board, entries: [entry, tied], me: outside }));
  const api = createRankingApi()!;
  expect((await api.getLeaderboard()).entries.map(value => value.rank)).toEqual([1, 1]);
  expect((await api.getLeaderboard()).me?.rank).toBe(150);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(30_000);
  await api.getLeaderboard();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  mocks.getOnlineIdentity.mockResolvedValue({ userId: 'new-user', accessToken: 'new-token' });
  await api.getLeaderboard();
  expect(fetchMock).toHaveBeenCalledTimes(3);
});
test('save and finalize invalidate an existing board cache without overwriting local best', async () => {
  const api = createRankingApi()!;
  fetchMock.mockResolvedValueOnce(response(board)).mockResolvedValueOnce(response(profile)).mockResolvedValueOnce(response(board));
  await api.getLeaderboard();
  await api.saveNickname('냥대리');
  await api.getLeaderboard();
  const receipt = { runId, score: 50, bestScore: 101, rank: 1, improved: false };
  fetchMock.mockResolvedValueOnce(response(receipt)).mockResolvedValueOnce(response(board));
  expect(await api.finalizeRun(runId)).toEqual(receipt);
  await api.getLeaderboard();
  expect(fetchMock).toHaveBeenCalledTimes(5);
});
test('failed deletion preserves credentials; successful retry clears only after confirmation', async () => {
  const api = createRankingApi(user.userId)!;
  fetchMock.mockRejectedValueOnce(new Error('connection dropped')).mockResolvedValueOnce(response({ deleted: true }));
  await expect(api.deleteProfile()).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  expect(mocks.preserveDeletionIdentity).toHaveBeenCalledWith(user);
  expect(mocks.clearOnlineSession).not.toHaveBeenCalled();
  mocks.getPendingDeletion.mockResolvedValue(user);
  await api.deleteProfile();
  expect(mocks.clearOnlineSession).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls.map(call => call[1].headers.Authorization)).toEqual(['Bearer private-a', 'Bearer private-a']);
  expect(fetchMock.mock.calls[1][1].body).toBeUndefined();
});
test('pending deletion blocks new runs/profile writes, and a deleted auth user is not refreshed', async () => {
  mocks.getPendingDeletion.mockResolvedValue(user);
  await expect(createRankingApi()!.startRun()).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  expect(fetchMock).not.toHaveBeenCalled();
  fetchMock.mockResolvedValueOnce(response({ code: 'UNAUTHORIZED' }, 401));
  await expect(createRankingApi()!.deleteProfile()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  expect(mocks.refreshOnlineIdentity).not.toHaveBeenCalled();
  expect(mocks.clearOnlineSession).not.toHaveBeenCalled();
});
test('rate limit honors Retry-After and never exposes server text/stack', async () => {
  fetchMock.mockResolvedValue(response({ code: 'RATE_LIMITED', message: 'secret-token-stack', expectedSeq: 7 }, 429, { 'Retry-After': '12' }));
  let error: unknown;
  try { await createRankingApi()!.getProfile(); } catch (caught) { error = caught; }
  expect(error).toMatchObject({ code: 'RATE_LIMITED', status: 429, retryAfterSeconds: 12, expectedSeq: 7, retryable: true });
  expect(onlineErrorMessage(error)).not.toContain('secret');
  expect(onlineErrorMessage(new Error('secret-stack'))).toBe(onlineErrorMessage(new OnlineApiError('UNAVAILABLE')));
});
test('report payload uses public ID only and accepts confirmed report without promising removal', async () => {
  fetchMock.mockResolvedValue(response({ reported: true }));
  await createRankingApi()!.reportNickname(publicId, 'inappropriate');
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ targetPublicId: publicId, reason: 'inappropriate' });
});
test('malformed/oversized server data is not a fabricated successful response', async () => {
  fetchMock.mockResolvedValueOnce(response({ ...board, entries: new Array(101).fill(entry) }));
  await expect(createRankingApi()!.getLeaderboard()).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  fetchMock.mockResolvedValueOnce({ ...response(null), text: async () => '<html>maintenance</html>' });
  await expect(createRankingApi()!.getProfile()).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  fetchMock.mockResolvedValueOnce(response({ ...profile, nickname: 'bad\nname' }));
  await expect(createRankingApi()!.getProfile()).rejects.toMatchObject({ code: 'UNAVAILABLE' });
});
