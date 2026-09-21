import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type AppStateStatus } from 'react-native';
import App from '../../../App';
import * as config from '../../config/app';
import * as controllers from '../../game/controller';
import * as engine from '../../game/engine';
import * as sharing from '../../services/share';
import { BALANCE } from '../../game/balance';
import { ko } from '../../i18n/ko';
import { PREFERENCES_KEY, parsePreferences } from '../../services/preferences';
import { playHaptic } from '../../services/haptics';

const mockAudio = { unlock: jest.fn(), setPlaying: jest.fn(), cue: jest.fn() };
jest.mock('../../services/audio', () => ({ useGameAudio: () => mockAudio }));
jest.mock('../../services/haptics', () => ({ playHaptic: jest.fn(() => Promise.resolve()) }));
jest.mock('expo-screen-orientation', () => ({ OrientationLock: { LANDSCAPE: 5 }, lockAsync: jest.fn(() => Promise.resolve()) }));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true, default: () => ({ width: 844, height: 390, scale: 1, fontScale: 1 }),
}));

const createController = controllers.createGameController;
const realFlags = config.getFeatureFlags;
let controller: controllers.GameController;
let lifecycle: ((state: AppStateStatus) => void) | undefined;
let callbacks: Map<number, FrameRequestCallback>;
let serial = 0;
let timestamp = 0;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  callbacks = new Map(); serial = 0; timestamp = 0;
  jest.spyOn(config, 'getFeatureFlags').mockReturnValue({ mockAdsEnabled: false });
  jest.spyOn(controllers, 'createGameController').mockImplementation(flags => {
    controller = createController(flags); return controller;
  });
  jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => {
    const id = ++serial; callbacks.set(id, callback); return id;
  });
  jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(id => { if (id != null) callbacks.delete(id); });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    lifecycle = callback; return { remove: () => { lifecycle = undefined; } };
  });
});
afterEach(async () => { await cleanup(); jest.restoreAllMocks(); });

function frame(delta = 1000 / 60) {
  timestamp += delta;
  const pending = [...callbacks.values()]; callbacks.clear();
  pending.forEach(callback => callback(timestamp));
}
async function advance(seconds: number) {
  await act(() => { for (let i = 0; i < Math.round(seconds * 60); i += 1) frame(); });
}
async function establishClock() { await act(() => frame()); }
async function start() {
  await fireEvent.press(screen.getByRole('button', { name: ko.start }));
  await establishClock(); await advance(3);
  expect(controller.readState().screen).toBe('playing');
}
async function fall(score = 42) {
  const actual = engine.transition;
  let once = true;
  const spy = jest.spyOn(engine, 'transition').mockImplementation((state, action, flags) => {
    if (once && action.type === 'TICK' && state.screen === 'playing' && state.run) {
      once = false;
      return actual({ ...state, run: { ...state.run, distanceM: score, angleRad: BALANCE.criticalAngleRad } }, action, flags);
    }
    return actual(state, action, flags);
  });
  try { await advance(1 / 60); } finally { spy.mockRestore(); }
  expect(controller.readState().screen).toBe('result');
}

describe('settings, sharing and development reward integration', () => {
  it('restores independent settings and the best record after an app remount', async () => {
    const first = await render(<App />);
    await fireEvent.press(screen.getByRole('button', { name: ko.settings }));
    await fireEvent(screen.getByTestId('setting-musicEnabled'), 'valueChange', false);
    await fireEvent(screen.getByTestId('setting-reduceMotion'), 'valueChange', true);
    await fireEvent.press(screen.getByRole('button', { name: ko.close }));
    await start(); await fall(121.7);
    const saved = parsePreferences(await AsyncStorage.getItem(PREFERENCES_KEY));
    expect(saved.bestScore).toBe(121);
    expect(saved.settings).toEqual({ musicEnabled: false, sfxEnabled: true, hapticsEnabled: true, reduceMotion: true });
    await first.unmount(); await render(<App />);
    expect(screen.getByText(/121%/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: ko.settings }));
    expect(screen.getByTestId('setting-musicEnabled')).toHaveProp('value', false);
    expect(screen.getByTestId('setting-reduceMotion')).toHaveProp('value', true);
  });

  it('keeps a settings overlay paused after closing and unlocks music only through explicit play gestures', async () => {
    await render(<App />); await start();
    expect(mockAudio.unlock).toHaveBeenCalledTimes(1);
    expect(mockAudio.setPlaying).toHaveBeenLastCalledWith(true);
    await fireEvent.press(screen.getByRole('button', { name: ko.pause }));
    await fireEvent.press(screen.getByRole('button', { name: ko.settings }));
    const frozen = controller.readState();
    await advance(2);
    expect(controller.readState()).toEqual(frozen);
    await fireEvent.press(screen.getByRole('button', { name: ko.close }));
    expect(controller.readState().screen).toBe('paused');
    expect(mockAudio.setPlaying).toHaveBeenLastCalledWith(false);
    await fireEvent.press(screen.getByRole('button', { name: ko.resume }));
    expect(mockAudio.unlock).toHaveBeenCalledTimes(2);
    expect(controller.readState().screen).toBe('playing');
  });

  it('keeps the game usable on read failure without overwriting unread storage automatically', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk unavailable'));
    await render(<App />);
    expect(screen.getByText(ko.storageMemoryOnly)).toBeOnTheScreen();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    await start();
    expect(controller.readState().screen).toBe('playing');
  });

  it('offers selectable manual share text on failure and stays quiet for cancellation', async () => {
    const share = jest.spyOn(sharing, 'shareScore').mockResolvedValueOnce({ status: 'manual', text: sharing.formatShareText(42) })
      .mockResolvedValueOnce({ status: 'cancelled', text: sharing.formatShareText(42) });
    await render(<App />); await start(); await fall();
    await fireEvent.press(screen.getByRole('button', { name: ko.share }));
    expect(screen.getByRole('header', { name: ko.shareManual })).toBeOnTheScreen();
    expect(screen.getByText(sharing.formatShareText(42))).toHaveProp('selectable', true);
    expect(screen.queryByText(ko.shareCopied)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: ko.shareClose }));
    await fireEvent.press(screen.getByRole('button', { name: ko.share }));
    expect(share).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(ko.shareManual)).toBeNull();
  });

  it('does not open a delayed share response over a newer attempt', async () => {
    let resolve!: (value: sharing.ShareResult) => void;
    jest.spyOn(sharing, 'shareScore').mockReturnValue(new Promise(done => { resolve = done; }));
    await render(<App />); await start(); await fall();
    await fireEvent.press(screen.getByRole('button', { name: ko.share }));
    await fireEvent.press(screen.getByRole('button', { name: ko.retry }));
    await act(async () => resolve({ status: 'manual', text: 'previous run' }));
    expect(screen.queryByText('previous run')).toBeNull();
    expect(controller.readState().screen).toBe('countdown');
  });

  it('completes exactly five active ad seconds, pauses in background and grants only one revive', async () => {
    jest.mocked(config.getFeatureFlags).mockReturnValue({ mockAdsEnabled: true });
    await render(<App />); await start(); await fall();
    const run = controller.readState().run!;
    await fireEvent.press(screen.getByRole('button', { name: ko.revive }));
    expect(screen.getByText(ko.mockAdTitle)).toBeOnTheScreen();
    await establishClock(); await advance(2);
    await act(() => lifecycle?.('background'));
    expect(controller.readState().resumeTo).toBe('ad');
    const remaining = controller.readState().adSeconds;
    await act(() => lifecycle?.('active')); await advance(6);
    expect(controller.readState().screen).toBe('paused');
    expect(controller.readState().adSeconds).toBe(remaining);
    await fireEvent.press(screen.getByRole('button', { name: ko.resume }));
    await establishClock(); await advance(remaining - 1 / 60);
    expect(controller.readState().screen).toBe('ad');
    expect(controller.readState().run!.reviveUsed).toBe(false);
    await advance(1 / 60);
    expect(controller.readState()).toMatchObject({ screen: 'countdown', countdownSeconds: 3,
      run: { id: run.id, distanceM: run.distanceM, reviveUsed: true, angleRad: 0, angularVelocity: 0, protectionSeconds: 1.5 } });
    await advance(3); await advance(1.6); await fall();
    expect(screen.queryByRole('button', { name: ko.revive })).toBeNull();
    await act(() => controller.dispatch({ type: 'REQUEST_AD' }));
    expect(controller.readState().screen).toBe('result');
  });

  it('cancels a virtual ad without a reward and has no stale view-timer reward', async () => {
    jest.mocked(config.getFeatureFlags).mockReturnValue({ mockAdsEnabled: true });
    await render(<App />); await start(); await fall();
    await fireEvent.press(screen.getByRole('button', { name: ko.revive }));
    await establishClock(); await advance(1);
    await fireEvent.press(screen.getByTestId('mock-ad-cancel'));
    await advance(8);
    expect(controller.readState().screen).toBe('result');
    expect(controller.readState().run!.reviveUsed).toBe(false);
  });

  it('cannot display or dispatch production ads even with public env opt-in', async () => {
    jest.mocked(config.getFeatureFlags).mockImplementation(() => realFlags(false, 'true'));
    await render(<App />); await start(); await fall();
    expect(screen.queryByRole('button', { name: ko.revive })).toBeNull();
    await act(() => controller.dispatch({ type: 'REQUEST_AD' }));
    expect(controller.readState().screen).toBe('result');
    expect(screen.queryByTestId('mock-ad-screen')).toBeNull();
  });

  it('does not derive any sound or haptic from the first100 snapshot notification', async () => {
    await render(<App />); await start();
    mockAudio.cue.mockClear(); jest.mocked(playHaptic).mockClear();
    const actual = engine.transition;
    const spy = jest.spyOn(engine, 'transition').mockImplementation((state, action, flags) => {
      if (state.screen === 'playing' && state.run && action.type === 'TICK') {
        return { state: { ...state, run: { ...state.run, distanceM: 100, hasCoffee: true } }, effects: [] };
      }
      return actual(state, action, flags);
    });
    try { await advance(1 / 60); } finally { spy.mockRestore(); }
    expect(controller.getSnapshot().score).toBe(100);
    expect(mockAudio.cue).not.toHaveBeenCalled();
    expect(playHaptic).not.toHaveBeenCalled();
    expect(screen.queryByTestId('character-unlock-notice')).toBeNull();
  });
});
