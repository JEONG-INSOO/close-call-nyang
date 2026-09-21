import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import * as Orientation from 'expo-screen-orientation';
import App from '../../../App';
import * as controllers from '../../game/controller';
import * as engine from '../../game/engine';
import { BALANCE } from '../../game/balance';
import { ko } from '../../i18n/ko';
import { installBrowserFixture } from '../../input/__tests__/browserFixture';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('expo-screen-orientation', () => ({
  OrientationLock: { LANDSCAPE: 5 }, lockAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../services/audio', () => {
  const api = { unlock: jest.fn(), setPlaying: jest.fn(), cue: jest.fn() };
  return { useGameAudio: () => api };
});
jest.mock('../../services/haptics', () => ({ playHaptic: jest.fn(() => Promise.resolve()) }));
let mockDimensions = { width: 844, height: 390, scale: 1, fontScale: 1 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true, default: () => mockDimensions,
}));

const actualCreate = controllers.createGameController;
let controller: controllers.GameController;
let requests: Map<number, FrameRequestCallback>;
let requestSerial = 0;
let timestamp = 0;
let lifecycle: ((state: AppStateStatus) => void) | undefined;

beforeEach(async () => {
  await AsyncStorage.clear();
  requests = new Map();
  requestSerial = 0;
  timestamp = 0;
  lifecycle = undefined;
  mockDimensions = { width: 844, height: 390, scale: 1, fontScale: 1 };
  let fixtureController: controllers.GameController | undefined;
  jest.spyOn(controllers, 'createGameController').mockImplementation(flags => {
    // Inject one fixture even when StrictMode invokes the state initializer twice.
    fixtureController ??= actualCreate(flags);
    controller = fixtureController;
    return controller;
  });
  jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => {
    const id = ++requestSerial;
    requests.set(id, callback);
    return id;
  });
  jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(id => { if (id != null) requests.delete(id); });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, callback) => {
    lifecycle = callback;
    return { remove: jest.fn(() => { lifecycle = undefined; }) };
  });
  jest.spyOn(Math, 'random').mockReturnValue(0.25);
});

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

function deliver(deltaMs = 1000 / 60) {
  timestamp += deltaMs;
  const pending = Array.from(requests.values());
  requests.clear();
  pending.forEach(callback => callback(timestamp));
}

async function advance(seconds: number) {
  await act(() => { for (let i = 0; i < Math.round(seconds * 60); i += 1) deliver(); });
}

async function startPlaying() {
  await fireEvent.press(screen.getByRole('button', { name: ko.start }));
  expect(controller.readState().screen).toBe('countdown');
  await act(() => deliver()); // The first timestamp only establishes the clock.
  await advance(3);
  expect(controller.readState().screen).toBe('playing');
}

async function fixtureFall(distanceM: number) {
  const actualTransition = engine.transition;
  let inject = true;
  const spy = jest.spyOn(engine, 'transition').mockImplementation((state, action, flags) => {
    // Explicit test fixture at the engine boundary, never an app URL/debug action.
    if (inject && action.type === 'TICK' && state.screen === 'playing' && state.run) {
      inject = false;
      return actualTransition({ ...state, run: { ...state.run,
        distanceM, angleRad: BALANCE.criticalAngleRad } }, action, flags);
    }
    return actualTransition(state, action, flags);
  });
  try { await advance(1 / 60); } finally { spy.mockRestore(); }
}

describe('playable app flow', () => {
  it('counts down, runs, falls immediately, retries and preserves the best record', async () => {
    await render(<App />);
    await startPlaying();
    const id = controller.readState().run!.id;
    await fixtureFall(128.7);
    expect(controller.readState().screen).toBe('result');
    expect(screen.getByRole('button', { name: ko.retry })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: ko.revive })).toBeNull();
    expect(screen.getByRole('button', { name: ko.share })).toBeOnTheScreen();
    expect(screen.getAllByText(/128%/).length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByRole('button', { name: ko.retry }));
    expect(controller.readState().screen).toBe('countdown');
    expect(controller.readState().run).toMatchObject({ id: id + 1, distanceM: 0, reviveUsed: false });
    await act(() => { controller.dispatch({ type: 'PAUSE' }); });
    await fireEvent.press(screen.getByRole('button', { name: ko.home }));
    expect(screen.getByRole('button', { name: ko.start })).toBeOnTheScreen();
    expect(screen.getByText(/128%/)).toBeOnTheScreen();
  });

  it('pauses during countdown without consuming time and resumes only when requested', async () => {
    await render(<App />);
    await fireEvent.press(screen.getByRole('button', { name: ko.start }));
    await act(() => deliver());
    await advance(1);
    await fireEvent.press(screen.getByRole('button', { name: ko.pause }));
    const paused = controller.readState();
    await advance(2);
    expect(controller.readState()).toEqual(paused);
    expect(paused.resumeTo).toBe('countdown');
    await fireEvent.press(screen.getByRole('button', { name: ko.resume }));
    expect(controller.readState().screen).toBe('countdown');
  });

  it('freezes on background and does not automatically resume on foreground', async () => {
    await render(<App />);
    await startPlaying();
    await act(() => {
      controller.setInput('keyboard', 'KeyA', -1, true);
      lifecycle?.('background');
    });
    expect(controller.readState().screen).toBe('paused');
    const paused = controller.readState();
    await act(() => lifecycle?.('active'));
    await advance(1);
    expect(controller.readState()).toEqual(paused);
    expect(screen.getByRole('button', { name: ko.resume })).toBeOnTheScreen();
  });

  it('turns a delayed animation frame into a pause instead of fast-forwarding', async () => {
    await render(<App />);
    await startPlaying();
    const distance = controller.readState().run!.distanceM;
    await act(() => deliver(2000));
    expect(controller.readState().screen).toBe('paused');
    expect(controller.readState().run!.distanceM).toBe(distance);
  });

  it('gates web portrait, preserves progress, and stays paused after landscape returns', async () => {
    const browser = installBrowserFixture();
    jest.replaceProperty(Platform, 'OS', 'web');
    try {
      const rendered = await render(<App />);
      await startPlaying();
      mockDimensions = { ...mockDimensions, width: 390, height: 844 };
      await rendered.rerender(<App />);
      expect(screen.getByTestId('landscape-gate')).toBeOnTheScreen();
      expect(controller.readState().screen).toBe('paused');
      const distance = controller.readState().run!.distanceM;
      expect(screen.getByTestId('landscape-content', { includeHiddenElements: true })).toHaveStyle({ display: 'none' });
      // Non-pointer activation bypasses pointerEvents; the app guard must reject it.
      const hiddenResume = screen.getByRole('button', { name: ko.resume, includeHiddenElements: true });
      expect(hiddenResume.props.onClick).toEqual(expect.any(Function));
      await fireEvent(hiddenResume, 'click', { nativeEvent: {}, currentTarget: 0, target: 0 });
      expect(controller.readState().screen).toBe('paused');
      await advance(2);
      mockDimensions = { ...mockDimensions, width: 844, height: 390 };
      await rendered.rerender(<App />);
      expect(screen.queryByTestId('landscape-gate')).toBeNull();
      expect(controller.readState().screen).toBe('paused');
      expect(controller.readState().run!.distanceM).toBe(distance);
    } finally {
      await cleanup();
      browser.restore();
    }
  });

  it('rejects start behind the web portrait gate while keeping the scene mounted', async () => {
    const browser = installBrowserFixture();
    jest.replaceProperty(Platform, 'OS', 'web');
    mockDimensions = { ...mockDimensions, width: 390, height: 844 };
    try {
      const rendered = await render(<App />);
      const hiddenStart = screen.getByRole('button', { name: ko.start, includeHiddenElements: true });
      expect(hiddenStart.props.onClick).toEqual(expect.any(Function));
      await fireEvent(hiddenStart, 'click', { nativeEvent: {}, currentTarget: 0, target: 0 });
      expect(controller.readState().screen).toBe('title');
      expect(controller.readState().run).toBeNull();
      expect(screen.getByTestId('landscape-content', { includeHiddenElements: true })).toHaveStyle({ display: 'none' });
      mockDimensions = { ...mockDimensions, width: 844, height: 390 };
      await rendered.rerender(<App />);
      await startPlaying();
    } finally {
      await cleanup();
      browser.restore();
    }
  });

  it('keeps working across StrictMode effect cleanup and cancels the loop on unmount', async () => {
    const rendered = await render(<StrictMode><App /></StrictMode>);
    await startPlaying();
    expect(requests.size).toBe(1);
    const dispose = jest.spyOn(controller, 'dispose');
    await rendered.unmount();
    await act(async () => { await Promise.resolve(); });
    expect(requests.size).toBe(0);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(lifecycle).toBeUndefined();
  });

  it('shows a nonfatal native orientation hint if the device declines the lock', async () => {
    jest.mocked(Orientation.lockAsync).mockRejectedValueOnce(new Error('unsupported'));
    await render(<App />);
    expect(screen.getByTestId('orientation-hint')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: ko.start })).toBeOnTheScreen();
  });
});
