import { useEffect, useMemo, useRef } from 'react';
import type { Settings } from './preferences';

export type AudioCue = 'footstep' | 'wobble' | 'fall' | 'coffee';
export type AudioKey = 'music' | AudioCue;
export const AUDIO_KEYS: readonly AudioKey[] = ['music', 'footstep', 'wobble', 'fall', 'coffee'];
export interface FeedbackStatus {
  playing: boolean; loaded: boolean; buffering: boolean; ended: boolean;
  error?: string | null; interrupted?: boolean;
}
export interface AudioPort {
  configure(loop: boolean, volume: number): void;
  mute(value: boolean): void;
  play(): void | Promise<void>;
  pause(): void;
  seek(): Promise<void>;
  subscribe(listener: (status: FeedbackStatus) => void): () => void;
}
export type AudioPorts = Readonly<Record<AudioKey, AudioPort>>;
const COOLDOWN: Record<AudioCue, number> = { footstep: 120, wobble: 1200, fall: 500, coffee: 300 };
const DURATION: Record<AudioCue, number> = { footstep: 100, wobble: 360, fall: 580, coffee: 320 };

/** Shared policy; platform adapters own exactly five lifetime-managed players. */
export function useAudioCoordinator(settings: Settings, ports: AudioPorts, needsGesturePriming: boolean) {
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const live = useRef(true);
  const actions = useMemo(() => {
    let playing = false;
    let unlocked = false;
    let blocked = false;
    let generation = 0;
    let lifetime = 0;
    const ready = new Set<AudioKey>();
    const priming = new Set<AudioKey>();
    const expected = new Set<AudioKey>();
    const wasPlaying = new Set<AudioKey>();
    const active = new Map<AudioCue, number>();
    const last = new Map<AudioCue, number>();
    const tickets = new Map<AudioCue, number>();
    const playTickets = new Map<AudioKey, number>();
    const safePause = (key: AudioKey) => {
      // Invalidate regular play promises before pause can reject them asynchronously.
      playTickets.set(key, (playTickets.get(key) ?? 0) + 1);
      expected.delete(key);
      wasPlaying.delete(key);
      if (priming.has(key) && live.current) return;
      try { ports[key].pause(); } catch { /* Audio never controls game progress. */ }
    };
    const stopEffects = () => {
      generation += 1;
      active.clear();
      for (const key of AUDIO_KEYS) if (key !== 'music') safePause(key);
    };
    const interrupt = () => {
      blocked = true;
      safePause('music');
      stopEffects();
    };
    const play = (key: AudioKey) => {
      const ticket = (playTickets.get(key) ?? 0) + 1;
      const lease = lifetime;
      playTickets.set(key, ticket);
      expected.add(key);
      const failed = () => {
        if (live.current && lease === lifetime && playTickets.get(key) === ticket && expected.has(key)) interrupt();
      };
      try { void Promise.resolve(ports[key].play()).catch(failed); }
      catch { failed(); }
    };
    const syncMusic = () => {
      if (!live.current) return;
      if (playing && unlocked && !blocked && ready.has('music') && settingsRef.current.musicEnabled) {
        if (!expected.has('music')) play('music');
      } else safePause('music');
    };
    return {
      unlock() {
        if (!live.current) return;
        unlocked = true;
        blocked = false;
        last.clear();
        for (const key of AUDIO_KEYS) {
          if (!needsGesturePriming) { ready.add(key); continue; }
          if (ready.has(key) || priming.has(key)) continue;
          priming.add(key);
          const lease = lifetime;
          // Called synchronously from start/retry/resume, never after awaiting.
          try {
            ports[key].mute(true);
            void Promise.resolve(ports[key].play()).then(() => {
              if (lease !== lifetime) return;
              priming.delete(key);
              safePause(key);
              if (!live.current) return;
              ports[key].mute(false);
              ready.add(key);
              syncMusic();
            }).catch(() => {
              if (lease !== lifetime) return;
              priming.delete(key);
              safePause(key);
              try { ports[key].mute(false); } catch { /* Already disposed. */ }
              ready.delete(key);
            });
          } catch { priming.delete(key); ready.delete(key); }
        }
        syncMusic();
      },
      setPlaying(value: boolean) {
        playing = value;
        if (!value) stopEffects();
        syncMusic();
      },
      cue(cue: AudioCue) {
        if (!live.current || !unlocked || blocked || !settingsRef.current.sfxEnabled || !ready.has(cue)) return;
        if (cue !== 'fall' && !playing) return;
        const now = Date.now();
        const prior = last.get(cue);
        if (prior !== undefined && now >= prior && now - prior < COOLDOWN[cue]) return;
        for (const [key, end] of active) if (end <= now) {
          active.delete(key);
          tickets.set(key, (tickets.get(key) ?? 0) + 1);
          safePause(key);
        }
        if (cue === 'fall') stopEffects();
        else if (active.size >= 2 && !active.has(cue)) return;
        last.set(cue, now);
        active.set(cue, now + DURATION[cue]);
        safePause(cue);
        const requestedGeneration = generation;
        const ticket = (tickets.get(cue) ?? 0) + 1;
        tickets.set(cue, ticket);
        try {
          void ports[cue].seek().then(() => {
            if (tickets.get(cue) !== ticket) return;
            if (Date.now() > now + DURATION[cue]) { active.delete(cue); return; }
            if (live.current && requestedGeneration === generation && !blocked && settingsRef.current.sfxEnabled) play(cue);
          }).catch(() => { active.delete(cue); });
        } catch { active.delete(cue); }
      },
      settingsChanged() {
        if (!settingsRef.current.sfxEnabled) stopEffects();
        syncMusic();
      },
      status(key: AudioKey, status: FeedbackStatus) {
        if (!live.current || priming.has(key)) return;
        if (status.error || status.interrupted) { interrupt(); return; }
        if (status.playing) {
          if (blocked || !expected.has(key)) { safePause(key); return; }
          wasPlaying.add(key);
        } else {
          const unexpected = wasPlaying.has(key) && expected.has(key) && status.loaded && !status.buffering && !status.ended;
          wasPlaying.delete(key);
          if (status.ended) {
            expected.delete(key);
            if (key !== 'music') active.delete(key);
          }
          if (unexpected) interrupt();
        }
      },
      stop() {
        playing = false; unlocked = false; lifetime += 1; generation += 1;
        priming.clear(); ready.clear(); safePause('music'); stopEffects();
      },
    };
  }, [ports, needsGesturePriming]);

  useEffect(() => {
    live.current = true;
    const removers = AUDIO_KEYS.map(key => {
      try {
        ports[key].configure(key === 'music', key === 'music' ? 0.15 : key === 'fall' ? 0.4 : 0.3);
        return ports[key].subscribe(status => actions.status(key, status));
      } catch { return () => {}; }
    });
    return () => {
      live.current = false;
      actions.stop();
      removers.forEach(remove => { try { remove(); } catch { /* Already released. */ } });
    };
  }, [ports, actions]);
  useEffect(() => actions.settingsChanged(), [actions, settings.musicEnabled, settings.sfxEnabled]);
  return useMemo(() => ({ unlock: actions.unlock, setPlaying: actions.setPlaying, cue: actions.cue }), [actions]);
}
