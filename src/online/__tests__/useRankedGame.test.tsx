import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, Platform } from 'react-native';
import { installBrowserFixture } from '../../input/__tests__/browserFixture';
import { createGameController } from '../../game/controller';
import type { RankedRun } from '../contracts';
import { PROOF_STORAGE_KEY, type PendingProof } from '../proofQueue';
import { RULES_VERSION } from '../rulesVersion';
import { OnlineApiError, type RankingApi, type OnlineStatus } from '../types';
import { useRankedGame } from '../useRankedGame';

const userId = 'a0000000-0000-4000-8000-000000000001';
const profile = { publicId: 'b0000000-0000-4000-8000-000000000001', nickname: '냥대리', updatedAt: new Date().toISOString() };
const challenge = (): RankedRun => ({ runId: 'c0000000-0000-4000-8000-000000000001', engineRunId: 771,
  seed: 42, rulesVersion: RULES_VERSION, issuedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString() });
function createApi() {
  return { getProfile: jest.fn(async () => profile), saveNickname: jest.fn(async () => profile),
    deleteProfile: jest.fn(async () => {}), getLeaderboard: jest.fn(), startRun: jest.fn(async () => challenge()),
    sendChunk: jest.fn(async (chunk) => ({ acceptedSeq: chunk.seq,
      totalTicks: chunk.spans.reduce((sum: number, span: { ticks: number }) => sum + span.ticks, 0),
      terminal: true, expiresAt: challenge().expiresAt })),
    finalizeRun: jest.fn(async (runId) => ({ runId, score: 0, bestScore: 0, rank: 1, improved: true })),
    reportNickname: jest.fn(async () => {}) } satisfies RankingApi;
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
let previousAppState: typeof AppState.currentState;
beforeEach(async () => {
  await AsyncStorage.clear(); previousAppState = AppState.currentState; AppState.currentState = 'active';
});
afterEach(async () => { await cleanup(); await act(async () => {}); AppState.currentState = previousAppState; jest.restoreAllMocks(); });
function setup(eligible = true, mockAdsEnabled = false) {
  const controller = createGameController({ mockAdsEnabled });
  const api = createApi();
  const onAcceptedStart = jest.fn();
  const settings = { controller, online: { api, userId, profile, status: 'ready' as OnlineStatus }, eligible,
    canStart: () => true, onAcceptedStart };
  return { controller, api, onAcceptedStart, settings };
}
async function ready() { await act(async () => { for (let count = 0; count < 12; count += 1) await Promise.resolve(); }); }
function playAndFall(controller: ReturnType<typeof createGameController>) {
  controller.advanceFrame(0);
  for (let index = 1; index <= 181; index += 1) controller.advanceFrame(index * 1000 / 60);
  controller.setInput('keyboard', 'right', 1, true);
  for (let index = 182; index <= 280 && controller.readState().screen !== 'result'; index += 1) controller.advanceFrame(index * 1000 / 60);
  expect(controller.readState().screen).toBe('result');
}

test('development gameplay remains local even when a profile and API exist', async () => {
  const { settings, api, controller, onAcceptedStart } = setup(false);
  const { result } = await renderHook(() => useRankedGame(settings));
  await act(() => result.current.start());
  expect(controller.readState().screen).toBe('countdown');
  expect(api.startRun).not.toHaveBeenCalled();
  expect(onAcceptedStart).toHaveBeenCalledTimes(1);
  expect(result.current.submissionState).toBe('local');
});

test('server challenge starts the canonical run and the falling tick reaches its receipt once', async () => {
  const { settings, api, controller, onAcceptedStart } = setup();
  const { result } = await renderHook(() => useRankedGame(settings));
  await ready();
  await act(() => result.current.start());
  expect(controller.readState().run).toMatchObject({ id: 771, seed: 42 });
  await act(() => playAndFall(controller));
  await waitFor(() => expect(result.current.submissionState).toBe('submitted'));
  expect(api.sendChunk).toHaveBeenCalledTimes(1);
  expect(api.finalizeRun).toHaveBeenCalledTimes(1);
  expect(result.current.receipt?.runId).toBe(challenge().runId);
  expect(onAcceptedStart).toHaveBeenCalledTimes(1);
});

test.each(['submitted', 'pending'] as const)('revival preserves the first %s result and never appends revived ticks', async state => {
  const { settings, api, controller } = setup(true, true);
  if (state === 'pending') api.sendChunk.mockRejectedValueOnce(new OnlineApiError('UNAVAILABLE'));
  const hook = await renderHook(() => useRankedGame(settings)); await ready();
  await act(() => hook.result.current.start()); await act(() => playAndFall(controller));
  await waitFor(() => expect(hook.result.current.submissionState).toBe(state));
  const firstProof = JSON.stringify(api.sendChunk.mock.calls[0][0]);
  await act(() => {
    controller.dispatch({ type: 'REQUEST_AD' });
    controller.advanceFrame(0);
    for (let i = 1; i <= 481; i++) controller.advanceFrame(i * 1000 / 60);
  });
  expect(controller.readState()).toMatchObject({ screen: 'playing', run: { reviveUsed: true } });
  await act(() => {
    controller.setInput('keyboard', 'right', 1, true);
    for (let i = 482; i <= 1200 && controller.readState().screen !== 'result'; i++) controller.advanceFrame(i * 1000 / 60);
  });
  expect(controller.readState().screen).toBe('result');
  expect(api.sendChunk).toHaveBeenCalledTimes(1);
  if (state === 'pending') await act(() => hook.result.current.retrySubmission());
  // A pending upload still obeys its one-second backoff; revival must not bypass it.
  await waitFor(() => expect(hook.result.current.submissionState).toBe('submitted'), { timeout: 5000 });
  expect(api.sendChunk).toHaveBeenCalledTimes(state === 'pending' ? 2 : 1);
  expect(api.finalizeRun).toHaveBeenCalledTimes(1);
  for (const [chunk] of api.sendChunk.mock.calls) expect(JSON.stringify(chunk)).toBe(firstProof);
  await hook.unmount(); controller.dispose();
});

test('a late challenge cannot attach after cancellation and local start', async () => {
  const { settings, api, controller, onAcceptedStart } = setup();
  const pending = deferred<RankedRun>(); api.startRun.mockImplementation(() => pending.promise);
  const { result } = await renderHook(() => useRankedGame(settings)); await ready();
  let starting!: Promise<void>;
  await act(() => { starting = result.current.start(); });
  await waitFor(() => expect(api.startRun).toHaveBeenCalledTimes(1));
  await act(() => result.current.startLocal());
  const local = controller.readState().run;
  await act(async () => { pending.resolve(challenge()); await starting; });
  expect(controller.readState().run).toBe(local);
  expect(result.current.submissionState).toBe('local');
  expect(onAcceptedStart).toHaveBeenCalledTimes(1);
});

test.each(['transient', 'hidden', 'long-blur'] as const)('web online start respects the shared %s foreground decision', async departure => {
  jest.useFakeTimers();
  const descriptor = Object.getOwnPropertyDescriptor(Platform, 'OS')!;
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
  const browser = installBrowserFixture();
  try {
    const { settings, api, controller } = setup();
    const pending = deferred<RankedRun>(); api.startRun.mockImplementation(() => pending.promise);
    const hook = await renderHook(() => useRankedGame(settings)); await ready();
    let starting!: Promise<void>;
    await act(() => { starting = hook.result.current.start(); }); await ready();
    expect(api.startRun).toHaveBeenCalledTimes(1);
    browser.doc.hasFocus.mockReturnValue(false);
    await act(() => { browser.win.emit('blur'); jest.advanceTimersByTime(100); });
    if (departure === 'transient') {
      browser.doc.hasFocus.mockReturnValue(true);
      await act(() => { browser.win.emit('focus'); jest.advanceTimersByTime(500); });
    } else if (departure === 'hidden') {
      await act(() => { browser.doc.visibilityState = 'hidden'; browser.doc.emit('visibilitychange'); });
    } else await act(() => jest.advanceTimersByTime(400));
    await act(async () => { pending.resolve(challenge()); await starting; });
    expect(controller.readState().screen).toBe(departure === 'transient' ? 'countdown' : 'title');
    await hook.unmount(); controller.dispose();
    expect(browser.win.count()).toBe(0);
    expect(browser.doc.count()).toBe(0);
  } finally { browser.restore(); Object.defineProperty(Platform, 'OS', descriptor); jest.useRealTimers(); }
});

test('a pending prior result requires a choice and local retry never records into its proof', async () => {
  const { settings, api, controller } = setup();
  api.sendChunk.mockRejectedValue(new OnlineApiError('UNAVAILABLE'));
  const { result } = await renderHook(() => useRankedGame(settings)); await ready();
  await act(() => result.current.start()); await act(() => playAndFall(controller));
  await waitFor(() => expect(result.current.submissionState).toBe('pending'));
  await act(() => result.current.start());
  expect(result.current.pendingChoice).toBe(true);
  expect(api.startRun).toHaveBeenCalledTimes(1);
  await act(() => result.current.startLocal());
  expect(result.current.pendingChoice).toBe(false);
  expect(result.current.submissionState).toBe('local');
  expect(controller.readState().run?.id).not.toBe(771);
});

test('identity loss invalidates the current online display and never binds old ticks to a replacement', async () => {
  const { settings, controller } = setup();
  const { result, rerender } = await renderHook<ReturnType<typeof useRankedGame>, { identity: string | null }>(({ identity }) => useRankedGame({ ...settings,
    online: { ...settings.online, userId: identity } }), { initialProps: { identity: userId as string | null } });
  await ready(); await act(() => result.current.start());
  await rerender({ identity: null });
  expect(controller.readState().screen).toBe('countdown');
  expect(result.current.submissionState).toBe('local');
});

describe('pending-operation cancellation regression', () => {
  test.each(['cancel', 'close', 'identity'] as const)('a delayed pending retry cannot auto-start after %s', async cancellation => {
    const { settings, api, controller, onAcceptedStart } = setup();
    const receipt = deferred<Awaited<ReturnType<typeof api.finalizeRun>>>();
    api.finalizeRun.mockReturnValueOnce(receipt.promise);
    const { result, rerender } = await renderHook<ReturnType<typeof useRankedGame>, { identity: string | null }>(
      ({ identity }) => useRankedGame({ ...settings, online: { ...settings.online, userId: identity } }),
      { initialProps: { identity: userId as string | null } },
    );
    await ready(); await act(() => result.current.start()); await act(() => playAndFall(controller));
    await waitFor(() => expect(api.finalizeRun).toHaveBeenCalledTimes(1));
    // The first upload is still in flight. prepareRun's bounded two-second wait
    // must offer a decision without replacing that valid completed proof.
    await act(() => result.current.start());
    expect(result.current.pendingChoice).toBe(true);
    let retry!: Promise<void>;
    await act(() => { retry = result.current.retryPending(); });
    expect(result.current.startBusy).toBe(true);
    if (cancellation === 'identity') await rerender({ identity: null });
    else await act(() => cancellation === 'close' ? result.current.closePending() : result.current.cancelStart());
    expect(result.current.startBusy).toBe(false);
    await act(async () => {
      receipt.resolve({ runId: challenge().runId, score: 0, bestScore: 0, rank: 1, improved: true });
      await retry;
    });
    expect(controller.readState().screen).toBe('result');
    expect(api.startRun).toHaveBeenCalledTimes(1);
    expect(onAcceptedStart).toHaveBeenCalledTimes(1);
    if (cancellation === 'close') expect(result.current.pendingChoice).toBe(false);
  });

  test.each(['cancel', 'close', 'identity'] as const)('a delayed pending discard cannot auto-start after %s', async cancellation => {
    const { settings, api, controller, onAcceptedStart } = setup();
    api.sendChunk.mockRejectedValue(new OnlineApiError('UNAVAILABLE'));
    const { result, rerender } = await renderHook<ReturnType<typeof useRankedGame>, { identity: string | null }>(
      ({ identity }) => useRankedGame({ ...settings, online: { ...settings.online, userId: identity } }),
      { initialProps: { identity: userId as string | null } },
    );
    await ready(); await act(() => result.current.start()); await act(() => playAndFall(controller));
    await waitFor(() => expect(result.current.submissionState).toBe('pending'));
    await act(() => result.current.start());
    expect(result.current.pendingChoice).toBe(true);
    const cleared = deferred<void>();
    const removeItem = AsyncStorage.removeItem;
    const priorRemovals = jest.mocked(removeItem).mock.calls.length;
    jest.spyOn(AsyncStorage, 'removeItem').mockImplementationOnce(async key => {
      await cleared.promise;
      // The one-shot override has already been consumed, so this calls the
      // normal mock disk implementation rather than recursively delaying.
      return removeItem(key);
    });
    let discard!: Promise<void>;
    await act(() => { discard = result.current.discardAndStart(); });
    await waitFor(() => expect(removeItem).toHaveBeenCalledTimes(priorRemovals + 1));
    expect(result.current.startBusy).toBe(true);
    if (cancellation === 'identity') await rerender({ identity: null });
    else await act(() => cancellation === 'close' ? result.current.closePending() : result.current.cancelStart());
    await act(async () => { cleared.resolve(undefined); await discard; });
    expect(result.current.startBusy).toBe(false);
    expect(controller.readState().screen).toBe('result');
    expect(api.startRun).toHaveBeenCalledTimes(1);
    expect(onAcceptedStart).toHaveBeenCalledTimes(1);
    if (cancellation === 'close') expect(result.current.pendingChoice).toBe(false);
  });
});

describe('leaving a run distinguishes unfinished and completed proofs', () => {
  test.each(['countdown', 'playing', 'paused-countdown', 'paused-playing'] as const)(
    'HOME abandons only the unfinished active %s proof and permits a new ranked attempt', async screen => {
      const { settings, api, controller } = setup();
      const { result } = await renderHook(() => useRankedGame(settings));
      await ready(); await act(() => result.current.start()); await ready();
      await act(() => {
        if (screen === 'playing' || screen === 'paused-playing') {
          controller.advanceFrame(0);
          for (let index = 1; index <= 181; index += 1) controller.advanceFrame(index * 1000 / 60);
          expect(controller.readState().screen).toBe('playing');
        }
        if (screen.startsWith('paused')) controller.dispatch({ type: 'PAUSE' });
      });
      const stored = JSON.parse((await AsyncStorage.getItem(PROOF_STORAGE_KEY))!) as PendingProof;
      expect(stored.terminalRecorded).toBe(false);
      await act(() => {
        result.current.leaveRun();
        // The engine intentionally refuses HOME while actively playing; the
        // app exposes it through its pause menu. Keep that independent rule.
        if (controller.readState().screen === 'playing') controller.dispatch({ type: 'PAUSE' });
        controller.dispatch({ type: 'HOME' });
      });
      await waitFor(async () => expect(await AsyncStorage.getItem(PROOF_STORAGE_KEY)).toBeNull());
      expect(result.current.submissionState).toBe('local');
      expect(api.finalizeRun).not.toHaveBeenCalled();
      await act(() => result.current.start());
      expect(api.startRun).toHaveBeenCalledTimes(2);
      expect(controller.readState().screen).toBe('countdown');
      expect(result.current.pendingChoice).toBe(false);
      expect(result.current.submissionState).toBe('recording');
    },
  );

  test('HOME preserves a completed result awaiting upload and still requests a pending-record choice', async () => {
    const { settings, api, controller } = setup();
    api.sendChunk.mockRejectedValue(new OnlineApiError('UNAVAILABLE'));
    const { result } = await renderHook(() => useRankedGame(settings));
    await ready(); await act(() => result.current.start()); await act(() => playAndFall(controller));
    await waitFor(() => expect(result.current.submissionState).toBe('pending'));
    await ready();
    jest.mocked(AsyncStorage.removeItem).mockClear();
    await act(() => { result.current.leaveRun(); controller.dispatch({ type: 'HOME' }); });
    const stored = JSON.parse((await AsyncStorage.getItem(PROOF_STORAGE_KEY))!) as PendingProof;
    expect(stored.terminalRecorded).toBe(true);
    expect(stored.run.runId).toBe(challenge().runId);
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    await act(() => result.current.start());
    expect(result.current.pendingChoice).toBe(true);
    expect(api.startRun).toHaveBeenCalledTimes(1);
    expect(controller.readState().screen).toBe('title');
  });
});

test('confirmed server deletion remains successful after local proof cleanup fails and a new identity can join', async () => {
  const { settings, api, controller } = setup();
  const { result, rerender } = await renderHook<ReturnType<typeof useRankedGame>, { identity: string | null }>(
    ({ identity }) => useRankedGame({ ...settings, online: { ...settings.online, userId: identity } }),
    { initialProps: { identity: userId as string | null } },
  );
  await ready(); await act(() => result.current.start()); await ready();
  expect(await AsyncStorage.getItem(PROOF_STORAGE_KEY)).not.toBeNull();
  jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce(new Error('disk cleanup failed'));
  const confirmedDelete = jest.fn(async () => true);
  let deleted: boolean | undefined;
  await act(async () => { deleted = await result.current.deleteProfile(confirmedDelete); });
  expect(confirmedDelete).toHaveBeenCalledTimes(1);
  expect(deleted).toBe(true);
  expect(result.current.localNotice).toContain('온라인 삭제는 완료');
  expect(result.current.submissionState).toBe('local');
  expect(result.current.pendingChoice).toBe(false);
  // Auth/profile clearing is owned by useOnlineProfile. Reproduce that boundary,
  // then explicit nickname participation with a genuinely new anonymous identity.
  await rerender({ identity: null });
  await act(() => controller.dispatch({ type: 'HOME' }));
  const replacement = 'a0000000-0000-4000-8000-000000000002';
  await rerender({ identity: replacement }); await ready();
  await act(() => result.current.start());
  // The old identity's unreadable proof is never silently overwritten. Joining
  // again is possible, but requires the explicit pending-record discard choice.
  expect(result.current.pendingChoice).toBe(true);
  expect(api.startRun).toHaveBeenCalledTimes(1);
  await act(() => result.current.discardAndStart());
  expect(api.startRun).toHaveBeenCalledTimes(2);
  expect(controller.readState().screen).toBe('countdown');
  expect(result.current.submissionState).toBe('recording');
  const stored = JSON.parse((await AsyncStorage.getItem(PROOF_STORAGE_KEY))!) as PendingProof;
  expect(stored.userId).toBe(replacement);
});
