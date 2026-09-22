import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRankingApi, invalidateLeaderboardCache } from './api';
import { clearOnlineSession, ensureGuestSession, getOnlineConfig, getOnlineIdentity, getPendingDeletion, startOnlineSessionLifecycle, subscribeOnlineIdentity, withOnlineDeadline } from './client';
import { validateNickname } from './nickname';
import { OnlineApiError, onlineErrorMessage, type OnlineProfileState } from './types';

export function useOnlineProfile() {
  const configured = useMemo(() => getOnlineConfig() !== null, []);
  const [state, setState] = useState<OnlineProfileState>({ status: configured ? 'loading' : 'unconfigured', profile: null, error: null });
  const [userId, setUserId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const identity = useRef<string | null>(null);
  const mounted = useRef(false);
  const busy = useRef(false);
  const generation = useRef(0);
  const api = useMemo(() => createRankingApi(userId ?? undefined), [userId]);

  const setIdentity = useCallback((next: string | null) => {
    if (!mounted.current || identity.current === next) return;
    identity.current = next;
    invalidateLeaderboardCache();
    setUserId(next);
    setState(previous => ({ ...previous, profile: null }));
  }, []);

  const lostIdentity = useCallback(async (expected: string | null): Promise<boolean> => {
    if (await getPendingDeletion()) return false;
    const current = await getOnlineIdentity();
    if (current && current.userId !== expected) return false;
    await clearOnlineSession();
    setIdentity(null);
    return true;
  }, [setIdentity]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!mounted.current || !configured || busy.current) return;
    const request = ++generation.current;
    let expected: string | null = identity.current;
    setState(previous => ({ ...previous, status: previous.status === 'deleting' ? 'deleting' : 'loading', error: null }));
    try {
      await withOnlineDeadline(async signal => {
        const pending = await getPendingDeletion();
        const current = await getOnlineIdentity();
        if (signal.aborted || !mounted.current || request !== generation.current) return;
        expected = current?.userId ?? null;
        const previous = identity.current;
        setIdentity(expected);
        if (pending) {
          setState(previousState => ({ ...previousState, status: 'deleting', error: '온라인 정보 삭제가 아직 확인되지 않았어요. 삭제를 다시 시도해 주세요.' }));
          return;
        }
        if (!current) {
          setState({ status: 'guest', profile: null, error: previous ? onlineErrorMessage(new OnlineApiError('UNAUTHORIZED')) : null });
          return;
        }
        const profile = await createRankingApi(current.userId)!.getProfile();
        if (signal.aborted || !mounted.current || request !== generation.current) return;
        setState({ status: profile ? 'ready' : 'guest', profile, error: null });
      }, 10_000);
    } catch (error) {
      if (!mounted.current || request !== generation.current) return;
      if (error instanceof OnlineApiError && error.code === 'UNAUTHORIZED') {
        try { await lostIdentity(expected); } catch { /* Preserve credentials if local cleanup fails. */ }
        if (!mounted.current || request !== generation.current) return;
        setState({ status: 'guest', profile: null, error: onlineErrorMessage(error) });
      } else setState(previous => ({ ...previous, status: 'offline', error: onlineErrorMessage(error) }));
    }
  }, [configured, lostIdentity, setIdentity]);

  useEffect(() => {
    mounted.current = true;
    const stopLifecycle = startOnlineSessionLifecycle();
    const unsubscribe = subscribeOnlineIdentity(current => {
      if (!mounted.current || current?.userId === identity.current || (!current && !identity.current)) return;
      if (busy.current) { setIdentity(current?.userId ?? null); return; }
      void refresh();
    });
    void refresh();
    return () => { mounted.current = false; generation.current += 1; unsubscribe(); stopLifecycle(); };
  }, [refresh, setIdentity]);

  const saveNickname = useCallback(async (name: string): Promise<boolean> => {
    if (!mounted.current || !configured || busy.current) return false;
    const validated = validateNickname(name);
    if (!validated.ok) { setState(previous => ({ ...previous, error: validated.reason })); return false; }
    busy.current = true;
    setIsBusy(true);
    const request = ++generation.current;
    let expected = identity.current;
    setState(previous => ({ ...previous, status: previous.status === 'deleting' ? 'deleting' : 'loading', error: null }));
    try {
      if (await getPendingDeletion()) throw new OnlineApiError('UNAVAILABLE');
      await ensureGuestSession();
      const current = await getOnlineIdentity();
      if (!current) throw new OnlineApiError('UNAUTHORIZED', 401);
      expected = current.userId;
      if (!mounted.current || request !== generation.current) return false;
      setIdentity(current.userId);
      const profile = await createRankingApi(current.userId)!.saveNickname(validated.value);
      const confirmedOwner = await getOnlineIdentity();
      if (confirmedOwner?.userId !== current.userId) throw new OnlineApiError('UNAUTHORIZED', 401);
      if (!mounted.current || request !== generation.current) return false;
      setState({ status: 'ready', profile, error: null });
      return true;
    } catch (error) {
      if (!mounted.current || request !== generation.current) return false;
      const pending = await getPendingDeletion().catch(() => null);
      if (error instanceof OnlineApiError && error.code === 'UNAUTHORIZED' && !pending) {
        try { await lostIdentity(expected); } catch { /* Keep local gameplay and a visible error. */ }
      }
      if (mounted.current && request === generation.current) setState(previous => ({ ...previous, status: pending ? 'deleting' : 'offline', error: pending ? '온라인 정보 삭제가 아직 확인되지 않았어요. 삭제를 다시 시도해 주세요.' : onlineErrorMessage(error) }));
      return false;
    } finally { busy.current = false; if (mounted.current) setIsBusy(false); }
  }, [configured, lostIdentity, setIdentity]);

  const deleteProfile = useCallback(async (): Promise<boolean> => {
    if (!mounted.current || !configured || busy.current) return false;
    busy.current = true;
    setIsBusy(true);
    const request = ++generation.current;
    setState(previous => ({ ...previous, status: 'deleting', error: null }));
    try {
      const current = await getOnlineIdentity();
      if (!current) throw new OnlineApiError('UNAUTHORIZED', 401);
      await createRankingApi(current.userId)!.deleteProfile();
      if (!mounted.current || request !== generation.current) return false;
      setIdentity(null);
      setState({ status: 'guest', profile: null, error: null });
      return true;
    } catch (error) {
      if (mounted.current && request === generation.current) setState(previous => ({ ...previous, status: 'deleting', error: '삭제 완료를 확인하지 못했어요. 같은 참여 정보로 삭제를 다시 시도해 주세요.' }));
      return false;
    } finally { busy.current = false; if (mounted.current) setIsBusy(false); }
  }, [configured, setIdentity]);

  return { ...state, api, userId, isBusy, deletionPending: state.status === 'deleting', saveNickname, deleteProfile, refresh };
}
