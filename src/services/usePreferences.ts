import { useCallback, useEffect, useRef, useState } from 'react';
import { getUnlockedCharacterIds } from '../characters/catalog';
import type { CharacterId } from '../characters/catalog';
import { applyCompletion, normalizeCollection } from './characterProgress';
import { loadPreferences, parsePreferences, savePreferences, SETTINGS_KEYS, updateBest } from './preferences';
import type { Preferences, PreferencesResult, Settings, StorageStatus } from './preferences';

interface Attempt { id: number; eligible: boolean; counted: boolean }
interface Session {
  value: Preferences;
  hydrated: boolean;
  dirty: boolean;
  touchedSettings: Set<keyof Settings>;
  touchedSelection: boolean;
  completionDelta: number;
  noticeBaselineDelta: number;
  nextAttempt: number;
  attempt: Attempt | null;
  saveSequence: number;
}

export function usePreferences(): {
  value: Preferences;
  status: StorageStatus;
  setSettings(patch: Partial<Settings>): void;
  recordScore(score: number): void;
  beginAttempt(eligible: boolean): number;
  observeAttempt(attemptId: number, score: number): void;
  selectCharacter(id: CharacterId): boolean;
  newlyUnlocked: readonly CharacterId[];
  clearUnlockNotice(): void;
} {
  const sessionRef = useRef<Session | null>(null);
  if (!sessionRef.current) {
    sessionRef.current = {
      value: parsePreferences(null), hydrated: false, dirty: false,
      touchedSettings: new Set(), touchedSelection: false,
      completionDelta: 0, noticeBaselineDelta: 0,
      nextAttempt: 0, attempt: null, saveSequence: 0,
    };
  }
  const [value, setValue] = useState(sessionRef.current.value);
  const [status, setStatus] = useState<StorageStatus>('loading');
  const statusRef = useRef<StorageStatus>('loading');
  const [newlyUnlocked, setNewlyUnlocked] = useState<readonly CharacterId[]>([]);
  const mounted = useRef(true);
  const loadPromise = useRef<Promise<PreferencesResult> | null>(null);

  const updateStatus = useCallback((next: StorageStatus) => {
    statusRef.current = next;
    if (mounted.current) setStatus(next);
  }, []);

  const publish = useCallback((next: Preferences) => {
    sessionRef.current!.value = next;
    if (mounted.current) setValue(next);
  }, []);

  const persist = useCallback((next: Preferences) => {
    const session = sessionRef.current!;
    if (!session.hydrated) {
      session.dirty = true;
      return;
    }
    const sequence = ++session.saveSequence;
    void savePreferences(next).then((saved) => {
      if (mounted.current && sequence === sessionRef.current!.saveSequence) {
        updateStatus(saved ? 'ready' : 'memoryOnly');
      }
    });
  }, [updateStatus]);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    loadPromise.current ??= loadPreferences().catch(() => ({ value: parsePreferences(null), status: 'memoryOnly' as const }));
    void loadPromise.current.then((loaded) => {
      const session = sessionRef.current!;
      if (!active || session.hydrated) return;
      session.hydrated = true;
      const dirty = session.dirty;
      session.dirty = false;
      if (loaded.status === 'ready') {
        const settings = { ...loaded.value.settings };
        for (const key of session.touchedSettings) settings[key] = session.value.settings[key];
        const completedRuns = Math.min(10, loaded.value.collection.completedRuns + session.completionDelta);
        const selectedCharacter = session.touchedSelection
          ? session.value.collection.selectedCharacter : loaded.value.collection.selectedCharacter;
        const collection = normalizeCollection({ completedRuns, selectedCharacter });
        const merged: Preferences = {
          schemaVersion: 1,
          bestScore: Math.max(loaded.value.bestScore, session.value.bestScore),
          settings,
          collection,
        };
        // Notices only cover awards since the latest begin/clear, never previously shown attempts.
        const baseline = getUnlockedCharacterIds(Math.min(10,
          loaded.value.collection.completedRuns + session.noticeBaselineDelta));
        setNewlyUnlocked(getUnlockedCharacterIds(completedRuns).filter((id) => !baseline.includes(id)));
        publish(merged);
        updateStatus('ready');
        if (dirty) persist(merged);
      } else {
        // The unread record may be valuable: keep session changes without writing defaults back.
        updateStatus('memoryOnly');
      }
      session.completionDelta = 0;
      session.noticeBaselineDelta = 0;
      session.touchedSettings.clear();
      session.touchedSelection = false;
    });
    return () => { active = false; mounted.current = false; };
  }, [persist, publish, updateStatus]);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    if (!mounted.current || !patch) return;
    const session = sessionRef.current!;
    const settings = { ...session.value.settings };
    let touched = false;
    for (const key of SETTINGS_KEYS) {
      if (typeof patch[key] === 'boolean') {
        settings[key] = patch[key];
        if (!session.hydrated) session.touchedSettings.add(key);
        touched = true;
      }
    }
    if (!touched) return;
    const next = { ...session.value, settings };
    publish(next);
    persist(next);
  }, [persist, publish]);

  const recordScore = useCallback((score: number) => {
    if (!mounted.current || !Number.isFinite(score) || score < 0) return;
    const current = sessionRef.current!.value;
    const next = updateBest(current, score);
    if (next !== current) publish(next);
    if (next !== current || statusRef.current === 'memoryOnly') persist(next);
  }, [persist, publish]);

  const clearUnlockNotice = useCallback(() => {
    if (!mounted.current) return;
    const session = sessionRef.current!;
    session.noticeBaselineDelta = session.completionDelta;
    setNewlyUnlocked([]);
  }, []);

  const beginAttempt = useCallback((eligible: boolean) => {
    const session = sessionRef.current!;
    if (!mounted.current) return session.nextAttempt;
    const id = ++session.nextAttempt;
    session.attempt = { id, eligible: eligible === true, counted: false };
    session.noticeBaselineDelta = session.completionDelta;
    setNewlyUnlocked([]);
    return id;
  }, []);

  const observeAttempt = useCallback((attemptId: number, score: number) => {
    if (!mounted.current || !Number.isFinite(score) || score < 100) return;
    const session = sessionRef.current!;
    const attempt = session.attempt;
    if (!attempt || attempt.id !== attemptId || !attempt.eligible || attempt.counted) return;
    attempt.counted = true; // Synchronous ref guard also covers back-to-back snapshots before a rerender.
    if (!session.hydrated) session.completionDelta = Math.min(10, session.completionDelta + 1);
    const completion = applyCompletion(session.value);
    publish(completion.value);
    setNewlyUnlocked(completion.unlocked);
    persist(completion.value);
  }, [persist, publish]);

  const selectCharacter = useCallback((id: CharacterId) => {
    if (!mounted.current) return false;
    const session = sessionRef.current!;
    if (!getUnlockedCharacterIds(session.value.collection.completedRuns).includes(id)) return false;
    if (!session.hydrated) session.touchedSelection = true;
    const next: Preferences = { ...session.value, collection: { ...session.value.collection, selectedCharacter: id } };
    publish(next);
    persist(next);
    return true;
  }, [persist, publish]);

  return { value, status, setSettings, recordScore, beginAttempt, observeAttempt,
    selectCharacter, newlyUnlocked, clearUnlockNotice };
}
