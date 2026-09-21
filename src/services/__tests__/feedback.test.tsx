import { act, renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useGameAudio as useNativeAudio } from '../audio';
import { useGameAudio as useWebAudio } from '../audio.web';
import { playHaptic } from '../haptics';
import type { Settings } from '../preferences';

type StatusListener = (status: Record<string, unknown>) => void;
function mockNativePlayer() {
  const listeners = new Set<StatusListener>();
  return {
    loop: false, volume: 1, muted: false,
    play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(() => Promise.resolve()), release: jest.fn(),
    addListener: jest.fn((_name: string, callback: StatusListener) => {
      listeners.add(callback); return { remove: jest.fn(() => listeners.delete(callback)) };
    }),
    status(status: Record<string, unknown>) { listeners.forEach(callback => callback({ isLoaded: true, isBuffering: false, playing: false, didJustFinish: false, ...status })); },
    listenerCount: () => listeners.size,
  };
}
const mockNativePlayers: ReturnType<typeof mockNativePlayer>[] = [];
jest.mock('expo-audio', () => {
  const React = jest.requireActual('react');
  return {
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
    useAudioPlayer: () => {
      const [player] = React.useState(() => { const next = mockNativePlayer(); mockNativePlayers.push(next); return next; });
      React.useEffect(() => () => player.release(), [player]);
      return player;
    },
  };
});
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()), impactAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Warning: 'warning' }, ImpactFeedbackStyle: { Light: 'light' },
}));
jest.mock('expo-asset', () => ({ Asset: { fromModule: (source: unknown) => ({ uri: `local-asset:${String(source)}` }) } }));

const SETTINGS: Settings = { musicEnabled: true, sfxEnabled: true, hapticsEnabled: true, reduceMotion: false };
const originalOS = Object.getOwnPropertyDescriptor(Platform, 'OS')!;
function platform(os: 'ios' | 'web') { Object.defineProperty(Platform, 'OS', { configurable: true, value: os }); }
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
beforeEach(() => { mockNativePlayers.length = 0; jest.clearAllMocks(); platform('ios'); });
afterEach(() => { Object.defineProperty(Platform, 'OS', originalOS); });

describe('native game audio policy', () => {
  it('owns five stable players, never requests recording, and removes listeners/resources on unmount', async () => {
    const hook = await renderHook(({ settings }: { settings: Settings }) => useNativeAudio(settings), { initialProps: { settings: SETTINGS } });
    expect(mockNativePlayers).toHaveLength(5);
    expect(setAudioModeAsync).toHaveBeenCalledWith(expect.objectContaining({ allowsRecording: false, shouldPlayInBackground: false }));
    expect(mockNativePlayers[0]).toMatchObject({ loop: true, volume: 0.15 });
    await hook.rerender({ settings: { ...SETTINGS, reduceMotion: true } });
    expect(mockNativePlayers).toHaveLength(5);
    expect(mockNativePlayers.every(player => player.play.mock.calls.length === 0)).toBe(true);
    await hook.unmount();
    for (const player of mockNativePlayers) {
      expect(player.listenerCount()).toBe(0);
      expect(player.release).toHaveBeenCalledTimes(1);
    }
  });
  it('requires a user unlock, obeys independent toggles, and permits fall after setPlaying(false)', async () => {
    const hook = await renderHook(({ settings }: { settings: Settings }) => useNativeAudio(settings), { initialProps: { settings: SETTINGS } });
    const [music, step, , fall] = mockNativePlayers;
    await act(() => { hook.result.current.setPlaying(true); hook.result.current.cue('footstep'); });
    expect(music.play).not.toHaveBeenCalled(); expect(step.play).not.toHaveBeenCalled();
    await act(async () => { hook.result.current.unlock(); hook.result.current.cue('footstep'); await flush(); });
    expect(music.play).toHaveBeenCalledTimes(1); expect(step.play).toHaveBeenCalledTimes(1);
    await hook.rerender({ settings: { ...SETTINGS, musicEnabled: false } });
    expect(music.pause).toHaveBeenCalled();
    await act(async () => { hook.result.current.setPlaying(false); hook.result.current.cue('fall'); await flush(); });
    expect(fall.play).toHaveBeenCalledTimes(1);
    await hook.rerender({ settings: { ...SETTINGS, sfxEnabled: false } });
    await act(async () => { hook.result.current.unlock(); hook.result.current.cue('fall'); await flush(); });
    expect(fall.play).toHaveBeenCalledTimes(1);
    await hook.unmount();
  });
  it('caps overlap at two, throttles thousands of repeated cues, and gives fall priority', async () => {
    const hook = await renderHook(() => useNativeAudio(SETTINGS));
    await act(async () => {
      hook.result.current.unlock(); hook.result.current.setPlaying(true);
      for (let index = 0; index < 2000; index += 1) hook.result.current.cue('footstep');
      hook.result.current.cue('wobble'); hook.result.current.cue('coffee'); await flush();
    });
    expect(mockNativePlayers).toHaveLength(5);
    expect(mockNativePlayers[1].play).toHaveBeenCalledTimes(1);
    expect(mockNativePlayers[2].play).toHaveBeenCalledTimes(1);
    expect(mockNativePlayers[4].play).not.toHaveBeenCalled();
    await act(async () => { hook.result.current.cue('fall'); await flush(); });
    expect(mockNativePlayers[3].play).toHaveBeenCalledTimes(1);
    expect(mockNativePlayers[1].pause).toHaveBeenCalled();
    await hook.unmount();
  });
  it('does not play a pending seek after pause, disabling SFX, or unmount', async () => {
    const hook = await renderHook(({ settings }: { settings: Settings }) => useNativeAudio(settings), { initialProps: { settings: SETTINGS } });
    let finish = () => {};
    mockNativePlayers[1].seekTo.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
    await act(() => { hook.result.current.unlock(); hook.result.current.setPlaying(true); hook.result.current.cue('footstep'); hook.result.current.setPlaying(false); });
    await act(async () => { finish(); await flush(); });
    expect(mockNativePlayers[1].play).not.toHaveBeenCalled();
    mockNativePlayers[3].seekTo.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
    await act(() => hook.result.current.cue('fall'));
    await hook.rerender({ settings: { ...SETTINGS, sfxEnabled: false } });
    await hook.unmount();
    await act(async () => { finish(); await flush(); });
    expect(mockNativePlayers[3].play).not.toHaveBeenCalled();
  });
  it('contains playback/seek rejection and requires a new gesture after interruption', async () => {
    const hook = await renderHook(() => useNativeAudio(SETTINGS));
    await act(() => { hook.result.current.unlock(); hook.result.current.setPlaying(true); });
    const music = mockNativePlayers[0];
    await act(() => { music.status({ playing: true }); music.status({ playing: false }); });
    const before = music.play.mock.calls.length;
    await act(() => hook.result.current.setPlaying(true));
    expect(music.play).toHaveBeenCalledTimes(before);
    await act(() => hook.result.current.unlock());
    expect(music.play).toHaveBeenCalledTimes(before + 1);
    mockNativePlayers[1].seekTo.mockRejectedValueOnce(new Error('seek unavailable'));
    await act(async () => { hook.result.current.cue('footstep'); await flush(); });
    expect(mockNativePlayers[1].play).not.toHaveBeenCalled();
    await act(() => music.status({ mediaServicesDidReset: true }));
    await act(() => music.status({ playing: true }));
    expect(music.pause).toHaveBeenCalled();
    await hook.unmount();
  });
});

const mockWebPlayers: MockMedia[] = [];
class MockMedia {
  paused = true; readyState = 4; ended = false; error: { code: number } | null = null;
  loop = false; volume = 1; muted = false; preload = ''; currentTime = 0;
  listeners = new Map<string, Set<() => void>>();
  constructor(readonly src: string) { mockWebPlayers.push(this); }
  play = jest.fn(() => { this.paused = false; return Promise.resolve(); });
  pause = jest.fn(() => { this.paused = true; });
  load = jest.fn(); removeAttribute = jest.fn();
  addEventListener(name: string, listener: () => void) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name)!.add(listener); }
  removeEventListener(name: string, listener: () => void) { this.listeners.get(name)?.delete(listener); }
  emit(name: string) { this.listeners.get(name)?.forEach(listener => listener()); }
}
describe('web audio gesture boundary', () => {
  let originalAudio: PropertyDescriptor | undefined;
  beforeEach(() => {
    platform('web'); mockWebPlayers.length = 0;
    originalAudio = Object.getOwnPropertyDescriptor(globalThis, 'Audio');
    Object.defineProperty(globalThis, 'Audio', { configurable: true, value: MockMedia });
  });
  afterEach(() => { if (originalAudio) Object.defineProperty(globalThis, 'Audio', originalAudio); else Reflect.deleteProperty(globalThis, 'Audio'); });
  it('primes five elements from the gesture, survives countdown, and keeps stable elements across toggles', async () => {
    const hook = await renderHook(({ settings }: { settings: Settings }) => useWebAudio(settings), { initialProps: { settings: SETTINGS } });
    expect(mockWebPlayers).toHaveLength(5);
    expect(mockWebPlayers.every(player => player.play.mock.calls.length === 0)).toBe(true);
    await act(async () => { hook.result.current.unlock(); hook.result.current.setPlaying(false); await flush(); });
    expect(mockWebPlayers.every(player => player.play.mock.calls.length === 1 && !player.muted && player.paused)).toBe(true);
    await act(() => hook.result.current.setPlaying(true));
    expect(mockWebPlayers[0].play).toHaveBeenCalledTimes(2);
    await hook.rerender({ settings: { ...SETTINGS, musicEnabled: false } });
    expect(mockWebPlayers[0].paused).toBe(true);
    expect(mockWebPlayers).toHaveLength(5);
    await hook.unmount();
    for (const player of mockWebPlayers) {
      expect(player.removeAttribute).toHaveBeenCalledWith('src');
      expect([...player.listeners.values()].every(entries => entries.size === 0)).toBe(true);
    }
  });
  it('catches denied autoplay and can retry priming on the next user gesture', async () => {
    const hook = await renderHook(() => useWebAudio(SETTINGS));
    mockWebPlayers.forEach(player => player.play.mockRejectedValueOnce(new Error('NotAllowedError')));
    await act(async () => { hook.result.current.unlock(); hook.result.current.setPlaying(true); await flush(); });
    expect(mockWebPlayers[0].play).toHaveBeenCalledTimes(1);
    await act(async () => { hook.result.current.unlock(); await flush(); });
    expect(mockWebPlayers[0].play).toHaveBeenCalledTimes(3);
    await hook.unmount();
  });
  it('does not revive a delayed priming promise after unmount', async () => {
    const hook = await renderHook(() => useWebAudio(SETTINGS));
    let finish = () => {};
    mockWebPlayers[0].play.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    await act(async () => { hook.result.current.unlock(); hook.result.current.setPlaying(true); await flush(); });
    await hook.unmount();
    await act(async () => { finish(); await flush(); });
    expect(mockWebPlayers[0].play).toHaveBeenCalledTimes(1);
    expect(mockWebPlayers[0].paused).toBe(true);
  });
  it('ignores an older regular music rejection after pause and a new gesture/play', async () => {
    const hook = await renderHook(() => useWebAudio(SETTINGS));
    await act(async () => { hook.result.current.unlock(); await flush(); });
    const music = mockWebPlayers[0];
    let rejectOld = (_reason: Error) => {};
    music.play.mockImplementationOnce(() => {
      music.paused = false;
      return new Promise<void>((_resolve, reject) => { rejectOld = reject; });
    });
    await act(() => hook.result.current.setPlaying(true));
    await act(async () => {
      hook.result.current.setPlaying(false);
      hook.result.current.unlock(); hook.result.current.setPlaying(true); await flush();
    });
    const pauses = music.pause.mock.calls.length;
    expect(music.paused).toBe(false);
    await act(async () => { rejectOld(new Error('AbortError from old play')); await flush(); });
    expect(music.pause).toHaveBeenCalledTimes(pauses);
    expect(music.paused).toBe(false);
    await hook.unmount();
  });
  it('still interrupts on the latest regular play rejection until another gesture', async () => {
    const hook = await renderHook(() => useWebAudio(SETTINGS));
    await act(async () => { hook.result.current.unlock(); await flush(); });
    const music = mockWebPlayers[0];
    music.play.mockRejectedValueOnce(new Error('latest playback denied'));
    await act(async () => { hook.result.current.setPlaying(true); await flush(); });
    const plays = music.play.mock.calls.length;
    expect(music.paused).toBe(true);
    await act(() => hook.result.current.setPlaying(true));
    expect(music.play).toHaveBeenCalledTimes(plays);
    await act(async () => { hook.result.current.unlock(); await flush(); });
    expect(music.play).toHaveBeenCalledTimes(plays + 1);
    expect(music.paused).toBe(false);
    await hook.unmount();
  });
});

describe('optional mobile haptics', () => {
  it('never invokes native feedback when disabled or on web', async () => {
    await playHaptic('coffee', false); platform('web'); await playHaptic('fall', true);
    expect(Haptics.impactAsync).not.toHaveBeenCalled(); expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });
  it('uses light coffee/wobble and warning fall, throttles wobble, and contains rejection', async () => {
    await playHaptic('coffee', true); await playHaptic('wobble', true); await playHaptic('wobble', true);
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(2);
    jest.mocked(Haptics.notificationAsync).mockRejectedValueOnce(new Error('unsupported'));
    await expect(playHaptic('fall', true)).resolves.toBeUndefined();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning');
  });
});
