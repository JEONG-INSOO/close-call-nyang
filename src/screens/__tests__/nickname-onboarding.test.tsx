import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import App from '../../../App';
import * as controllers from '../../game/controller';
import * as engine from '../../game/engine';
import { BALANCE } from '../../game/balance';
import { ko } from '../../i18n/ko';
import type { PlayerProfile } from '../../online/contracts';
import type { OnlineStatus } from '../../online/types';
import { NICKNAME_ONBOARDING_KEY } from '../../services/nicknameOnboarding';

const mockAudio = { unlock: jest.fn(), setPlaying: jest.fn(), cue: jest.fn() };
jest.mock('../../services/audio', () => ({ useGameAudio: () => mockAudio }));
jest.mock('../../services/haptics', () => ({ playHaptic: jest.fn(async () => {}) }));
jest.mock('expo-screen-orientation', () => ({ OrientationLock: { LANDSCAPE: 5 }, lockAsync: jest.fn(async () => {}) }));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true, default: () => ({ width: 844, height: 390, scale: 1, fontScale: 1 }),
}));

let mockOnline: {
  status: OnlineStatus; profile: PlayerProfile | null; error: null; userId: null; api: null;
  isBusy: boolean; deletionPending: boolean; saveNickname: jest.Mock; deleteProfile: jest.Mock; refresh: jest.Mock;
};
jest.mock('../../online/useOnlineProfile', () => ({ useOnlineProfile: () => mockOnline }));

const realCreate = controllers.createGameController;
let controller: controllers.GameController;
let frames: Map<number, FrameRequestCallback>;
let serial = 0;
let timestamp = 0;

beforeEach(async () => {
  await AsyncStorage.clear(); jest.clearAllMocks();
  mockOnline = { status: 'guest', profile: null, error: null, userId: null, api: null,
    isBusy: false, deletionPending: false, saveNickname: jest.fn(async () => true),
    deleteProfile: jest.fn(async () => true), refresh: jest.fn(async () => {}) };
  frames = new Map(); serial = 0; timestamp = 0;
  jest.spyOn(controllers, 'createGameController').mockImplementation(flags => {
    controller = realCreate(flags); return controller;
  });
  jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => {
    const id = ++serial; frames.set(id, callback); return id;
  });
  jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(id => { if (id != null) frames.delete(id); });
  jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
});
afterEach(async () => { await cleanup(); jest.restoreAllMocks(); });

async function start() {
  await fireEvent.press(screen.getByRole('button', { name: ko.start }));
  const step = () => {
    timestamp += 1000 / 60;
    const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(timestamp));
  };
  await act(() => { step(); for (let i = 0; i < 180; i += 1) step(); });
  expect(controller.readState().screen).toBe('playing');
}
async function finishRun() {
  const real = engine.transition;
  let used = false;
  const spy = jest.spyOn(engine, 'transition').mockImplementation((state, action, flags) => {
    if (!used && action.type === 'TICK' && state.screen === 'playing' && state.run) {
      used = true;
      return real({ ...state, run: { ...state.run, angleRad: BALANCE.criticalAngleRad } }, action, flags);
    }
    return real(state, action, flags);
  });
  try {
    await act(() => {
      timestamp += 1000 / 60;
      const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(timestamp));
    });
  } finally { spy.mockRestore(); }
  expect(controller.readState().screen).toBe('result');
}

it('offers one welcome, saves later locally, and keeps manual setup after remount', async () => {
  const first = await render(<App />);
  expect(screen.getByTestId('nickname-welcome-panel')).toBeOnTheScreen();
  expect(mockOnline.saveNickname).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByTestId('nickname-welcome-later'));
  expect(screen.queryByTestId('nickname-welcome-panel')).toBeNull();
  expect(JSON.parse((await AsyncStorage.getItem(NICKNAME_ONBOARDING_KEY))!)).toEqual({ schemaVersion: 1, handled: true });
  await first.unmount();
  await render(<App />);
  expect(screen.queryByTestId('nickname-welcome-panel')).toBeNull();
  await fireEvent.press(screen.getByTestId('title-nickname'));
  expect(screen.getByTestId('nickname-panel')).toBeOnTheScreen();
});

it('uses the existing editor and invites only the next run after an unregistered result', async () => {
  const view = await render(<App />);
  await fireEvent.press(screen.getByTestId('nickname-welcome-setup'));
  expect(screen.queryByTestId('nickname-welcome-panel')).toBeNull();
  expect(screen.getByTestId('nickname-panel')).toBeOnTheScreen();
  expect(mockOnline.saveNickname).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByTestId('nickname-panel-close'));
  await start(); await finishRun();
  expect(screen.getByTestId('result-nickname-notice')).toBeOnTheScreen();
  expect(screen.getByText(ko.nicknameRankingInvite)).toBeOnTheScreen();
  expect(screen.getByText(ko.nicknameRankingNextRun)).toBeOnTheScreen();
  expect(screen.queryByTestId('ranking-submission-status')).toBeNull();
  await fireEvent.press(screen.getByTestId('result-nickname'));
  mockOnline.saveNickname.mockImplementationOnce(async () => {
    mockOnline.status = 'ready';
    mockOnline.profile = { publicId: 'public-1', nickname: '새 냥대리', updatedAt: '2026-09-28T00:00:00Z' };
    return true;
  });
  await fireEvent.changeText(screen.getByTestId('nickname-input'), '새 냥대리');
  await fireEvent.press(screen.getByTestId('nickname-save'));
  await view.rerender(<App />);
  expect(screen.queryByTestId('result-nickname-notice')).toBeNull();
  expect(screen.queryByText(ko.rankingSubmitted)).toBeNull();
});

it('never prompts an existing profile or an uncertain online state', async () => {
  mockOnline.status = 'ready';
  mockOnline.profile = { publicId: 'public-1', nickname: '기존 냥대리', updatedAt: '2026-09-28T00:00:00Z' };
  const first = await render(<App />);
  expect(screen.queryByTestId('nickname-welcome-panel')).toBeNull();
  await first.unmount();
  expect(JSON.parse((await AsyncStorage.getItem(NICKNAME_ONBOARDING_KEY))!)).toEqual({ schemaVersion: 1, handled: true });
  await AsyncStorage.clear();
  mockOnline.status = 'offline'; mockOnline.profile = null;
  await render(<App />);
  expect(screen.queryByTestId('nickname-welcome-panel')).toBeNull();
  await start(); await finishRun();
  expect(screen.queryByTestId('result-nickname-notice')).toBeNull();
});

it('lets a guest play while the welcome read is pending and shows it only back at home', async () => {
  const realGet = AsyncStorage.getItem.bind(AsyncStorage);
  let finishRead!: (value: string | null) => void;
  jest.spyOn(AsyncStorage, 'getItem').mockImplementation(key => key === NICKNAME_ONBOARDING_KEY
    ? new Promise(resolve => { finishRead = resolve; }) : realGet(key));
  await render(<App />);
  await start();
  await act(async () => { finishRead(null); await Promise.resolve(); });
  expect(screen.queryByTestId('nickname-welcome-panel')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: ko.pause }));
  await fireEvent.press(screen.getByRole('button', { name: ko.home }));
  expect(screen.getByTestId('nickname-welcome-panel')).toBeOnTheScreen();
});

it('does not auto-open when onboarding storage cannot be read', async () => {
  const realGet = AsyncStorage.getItem.bind(AsyncStorage);
  jest.spyOn(AsyncStorage, 'getItem').mockImplementation(key => key === NICKNAME_ONBOARDING_KEY
    ? Promise.reject(new Error('read failed')) : realGet(key));
  await render(<App />);
  expect(screen.queryByTestId('nickname-welcome-panel')).toBeNull();
  await start();
  expect(controller.readState().screen).toBe('playing');
});
