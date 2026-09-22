import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import type { GameController } from '../game/controller';
import type { PlayerProfile, RankedRun } from './contracts';
import type { OnlineStatus, RankingApi } from './types';
import { createRankedSession } from './rankedSession';

type Session = ReturnType<typeof createRankedSession>;
const LOCAL = { state: 'local' as const, hasPending: false, needsPendingDecision: false,
  runId: null, engineRunId: null, receipt: null, error: null };
const noopSubscribe = () => () => {};
const localSnapshot = () => LOCAL;

/** UI orchestration only. The engine never waits for network acknowledgements. */
export function useRankedGame(options: {
  controller: GameController;
  online: { api: RankingApi | null; userId: string | null; profile: PlayerProfile | null; status: OnlineStatus };
  eligible: boolean;
  canStart(): boolean;
  onAcceptedStart(runId: number): void;
}) {
  const { controller, online, eligible } = options;
  const latest = useRef(options); latest.current = options;
  const session = useMemo(() => eligible && online.api && online.userId
    ? createRankedSession({ api: online.api, userId: online.userId }) : null,
  [eligible, online.api, online.userId]);
  const currentSession = useRef(session); currentSession.current = session;
  const snapshot = useSyncExternalStore(session?.subscribe ?? noopSubscribe,
    session?.getSnapshot ?? localSnapshot, session?.getSnapshot ?? localSnapshot);
  const [restored, setRestored] = useState<Session | null>(null);
  const [startBusy, setStartBusy] = useState(false);
  const [pendingChoice, setPendingChoice] = useState(false);
  const [localNotice, setLocalNotice] = useState<string | null>(null);
  const [currentRanked, setCurrentRanked] = useState<{ session: Session; runId: string } | null>(null);
  const activeRecording = useRef<{ session: Session; engineRunId: number } | null>(null);
  const generation = useRef(0);
  const starting = useRef(false);
  const lease = useRef(0);
  const alive = useRef(true);
  const nextLocalId = useRef(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const lastReceipt = useRef<string | null>(null);

  const cancelStart = useCallback(() => {
    generation.current += 1;
    starting.current = false;
    if (alive.current) setStartBusy(false);
  }, []);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; generation.current += 1; starting.current = false; };
  }, []);

  useEffect(() => {
    const currentLease = ++lease.current;
    activeRecording.current = null;
    cancelStart();
    let active = true;
    if (session) void session.restore().then(() => {
      if (active) setRestored(session);
    }).catch(() => { if (active) setRestored(session); });
    return () => {
      active = false;
      session?.setForeground(false);
      lease.current = currentLease + 1;
      const released = lease.current;
      void Promise.resolve().then(() => {
        if (lease.current === released || currentSession.current !== session) session?.dispose();
      });
    };
  }, [session, cancelStart]);

  useEffect(() => {
    if (!session) return;
    const setForeground = (foreground: boolean) => {
      session.setForeground(foreground);
      if (!foreground) cancelStart();
    };
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const visibility = () => setForeground(document.visibilityState !== 'hidden');
      const blur = () => setForeground(false);
      const focus = () => visibility();
      visibility();
      document.addEventListener('visibilitychange', visibility);
      window.addEventListener('blur', blur); window.addEventListener('focus', focus);
      return () => {
        document.removeEventListener('visibilitychange', visibility);
        window.removeEventListener('blur', blur); window.removeEventListener('focus', focus);
      };
    }
    setForeground(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => subscription.remove();
  }, [session, cancelStart]);

  useEffect(() => controller.subscribeTicks(tick => {
    const recording = activeRecording.current;
    if (!recording || recording.session !== currentSession.current || tick.runId !== recording.engineRunId) return;
    if (controller.readState().run?.reviveUsed) { recording.session.freeze(); activeRecording.current = null; return; }
    recording.session.record(tick);
  }), [controller]);

  useEffect(() => {
    // A persisted deletion retry is not a reason to resume an older upload queue.
    if (online.status === 'deleting') { session?.freeze(); activeRecording.current = null; cancelStart(); }
  }, [online.status, session, cancelStart]);

  useEffect(() => {
    if (snapshot.receipt && snapshot.receipt.runId !== lastReceipt.current) {
      lastReceipt.current = snapshot.receipt.runId;
      setRefreshKey(value => value + 1);
    }
  }, [snapshot.receipt]);

  const launch = useCallback((challenge: RankedRun | null, owner: Session | null) => {
    if (!alive.current || !latest.current.canStart()) return;
    const screen = controller.readState().screen;
    if (screen !== 'title' && screen !== 'result') return;
    // Detach recording before START so local ticks never join a previous proof.
    const runId = challenge?.engineRunId ?? ++nextLocalId.current;
    const seed = challenge?.seed ?? ((Math.floor(Math.random() * 0x100000000) ^ (Date.now() >>> 0)) >>> 0);
    activeRecording.current = null;
    controller.dispatch({ type: 'START', runId, seed });
    if (controller.readState().run?.id !== runId || controller.readState().screen !== 'countdown') return;
    const accepted = !!(challenge && owner && owner.begin(challenge));
    activeRecording.current = accepted ? { session: owner!, engineRunId: runId } : null;
    setCurrentRanked(accepted ? { session: owner!, runId: challenge!.runId } : null);
    latest.current.onAcceptedStart(runId);
  }, [controller]);

  const start = useCallback(async (forceLocal = false) => {
    if (starting.current || !latest.current.canStart()) return;
    const screen = controller.readState().screen;
    if (screen !== 'title' && screen !== 'result') return;
    setPendingChoice(false);
    const current = latest.current.online;
    if (forceLocal || !session || restored !== session || !current.profile || current.status === 'deleting') {
      launch(null, null); return;
    }
    starting.current = true; setStartBusy(true);
    const request = ++generation.current;
    let challenge: RankedRun | null = null;
    try { challenge = await session.prepareRun(); } catch { /* Network failure means a local run. */ }
    if (!alive.current || request !== generation.current || currentSession.current !== session) return;
    starting.current = false; setStartBusy(false);
    if (!latest.current.canStart()) return;
    if (session.getSnapshot().needsPendingDecision) { setPendingChoice(true); return; }
    launch(challenge, session);
  }, [launch, restored, session]);

  const startLocal = useCallback(() => { cancelStart(); setPendingChoice(false); launch(null, null); }, [cancelStart, launch]);
  const discardAndStart = useCallback(async () => {
    if (!session || starting.current) return;
    const request = ++generation.current;
    starting.current = true; setStartBusy(true);
    try { await session.discard(); } catch {
      if (alive.current && request === generation.current) setLocalNotice('대기 기록을 지우지 못했어요. 로컬로 플레이하거나 다시 시도해 주세요.');
      return;
    } finally {
      if (alive.current && request === generation.current) { starting.current = false; setStartBusy(false); }
    }
    if (!alive.current || request !== generation.current || currentSession.current !== session || !latest.current.canStart()) return;
    setPendingChoice(false);
    await start();
  }, [session, start]);
  const retryPending = useCallback(async () => {
    if (!session || starting.current) return;
    const request = ++generation.current;
    starting.current = true; setStartBusy(true);
    try { await session.retry(); } finally {
      if (alive.current && request === generation.current) { starting.current = false; setStartBusy(false); }
    }
    if (alive.current && request === generation.current && currentSession.current === session &&
        latest.current.canStart() && !session.getSnapshot().hasPending) { setPendingChoice(false); await start(); }
  }, [session, start]);
  const deleteProfile = useCallback(async (remove: () => Promise<boolean>) => {
    cancelStart(); activeRecording.current = null;
    session?.freeze();
    const success = await remove();
    if (success) {
      try { await session?.discard(); } catch {
        if (alive.current) setLocalNotice('온라인 삭제는 완료됐지만 기기의 전송 대기 정보는 지우지 못했어요. 저장 공간을 확인해 주세요.');
      }
      if (alive.current) { setCurrentRanked(null); setPendingChoice(false); }
    }
    return success;
  }, [cancelStart, session]);
  const leaveRun = useCallback(() => {
    cancelStart();
    const state = controller.readState();
    const recording = activeRecording.current;
    const unfinished = state.screen === 'countdown' || state.screen === 'playing' ||
      (state.screen === 'paused' && (state.resumeTo === 'countdown' || state.resumeTo === 'playing'));
    if (recording && unfinished) {
      activeRecording.current = null; setCurrentRanked(null);
      // HOME explicitly abandons an unfinished game, not a completed pending result.
      void recording.session.discard().catch(() => {
        if (alive.current) setLocalNotice('중단한 판의 전송 대기 정보를 지우지 못했어요. 이 판은 랭킹에 등록되지 않아요.');
      });
    }
  }, [cancelStart, controller]);
  const isCurrent = currentRanked?.session === session;
  return { start, startLocal, discardAndStart, retryPending, cancelStart, deleteProfile, leaveRun, localNotice, startBusy,
    pendingChoice, closePending: () => { cancelStart(); setPendingChoice(false); }, pendingError: localNotice ?? snapshot.error,
    submissionState: isCurrent ? snapshot.state : 'local' as const,
    receipt: isCurrent && snapshot.receipt?.runId === currentRanked?.runId ? snapshot.receipt : null,
    retrySubmission: () => session?.retry(), refreshKey };
}
