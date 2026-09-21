import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import App from '../../../App';
import { CHARACTERS, type CharacterId } from '../../characters/catalog';
import { BALANCE } from '../../game/balance';
import * as controllers from '../../game/controller';
import * as engine from '../../game/engine';
import type { GameState } from '../../game/types';
import { ko } from '../../i18n/ko';
import { parsePreferences, PREFERENCES_KEY } from '../../services/preferences';

const mockAudio = { unlock: jest.fn(), setPlaying: jest.fn(), cue: jest.fn() };
jest.mock('../../services/audio', () => ({ useGameAudio: () => mockAudio }));
jest.mock('../../services/haptics', () => ({ playHaptic: jest.fn(async () => {}) }));
jest.mock('expo-screen-orientation', () => ({
  OrientationLock: { LANDSCAPE: 5 }, lockAsync: jest.fn(async () => {}),
}));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true, default: () => ({ width: 844, height: 390, scale: 1, fontScale: 1 }),
}));
jest.mock('react-native-svg', () => {
  const svg = jest.requireActual('react-native-reanimated/src/mock-svg');
  return { ...svg, default: svg.Svg };
});

const originalCreate = controllers.createGameController;
const originalTransition = engine.transition;
const originalMockFlag = process.env.EXPO_PUBLIC_ENABLE_MOCK_AD;
let controller: controllers.GameController;
let requests: Map<number, FrameRequestCallback>;
let serial = 0;
let timestamp = 0;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  delete process.env.EXPO_PUBLIC_ENABLE_MOCK_AD;
  requests = new Map(); serial = 0; timestamp = 0;
  jest.spyOn(controllers, 'createGameController').mockImplementation(flags => {
    controller = originalCreate(flags);
    return controller;
  });
  jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => {
    const id = ++serial; requests.set(id, callback); return id;
  });
  jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(id => { if (id != null) requests.delete(id); });
  jest.spyOn(Math, 'random').mockReturnValue(0.25);
  jest.spyOn(Date, 'now').mockReturnValue(12345678);
});

afterEach(async () => {
  await cleanup();
  await act(async () => { await Promise.resolve(); });
  jest.restoreAllMocks();
  if (originalMockFlag === undefined) delete process.env.EXPO_PUBLIC_ENABLE_MOCK_AD;
  else process.env.EXPO_PUBLIC_ENABLE_MOCK_AD = originalMockFlag;
});

function deliver() {
  timestamp += 1000 / 60;
  const pending = Array.from(requests.values()); requests.clear();
  pending.forEach(callback => callback(timestamp));
}

async function advance(frames: number) {
  await act(() => { for (let index = 0; index < frames; index += 1) deliver(); });
}

async function startPlaying(retry = false) {
  await fireEvent.press(screen.getByRole('button', { name: retry ? ko.retry : ko.start }));
  expect(controller.readState().screen).toBe('countdown');
  await advance(1); // First display frame establishes the controller clock.
  await advance(180);
  expect(controller.readState().screen).toBe('playing');
}

async function injectDistance(distanceM: number, fall = false) {
  let pending = true;
  const spy = jest.spyOn(engine, 'transition').mockImplementation((state, action, flags) => {
    // A test-only boundary fixture, never an application cheat or mock service.
    if (pending && state.screen === 'playing' && state.run && action.type === 'TICK') {
      pending = false;
      return originalTransition({ ...state, run: { ...state.run, distanceM,
        angleRad: fall ? BALANCE.criticalAngleRad : 0, angularVelocity: 0,
        hasCoffee: distanceM >= 15, event: null, nextEventAt: Number.MAX_VALUE,
      } }, action, flags);
    }
    return originalTransition(state, action, flags);
  });
  try { await advance(1); } finally { spy.mockRestore(); }
  expect(pending).toBe(false);
}

async function renderedCharacter(): Promise<CharacterId | undefined> {
  const scene = screen.getByTestId('game-scene', { includeHiddenElements: true });
  await fireEvent(scene, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 844, height: 390 } } });
  return CHARACTERS.find(character => within(scene).queryByTestId(`face-${character.id}`, { includeHiddenElements: true }))?.id;
}

async function persisted() {
  return parsePreferences(await AsyncStorage.getItem(PREFERENCES_KEY));
}

async function expectCompletions(expected: number) {
  await waitFor(async () => expect((await persisted()).collection.completedRuns).toBe(expected));
}

async function hydrateStored(completedRuns: number, selectedCharacter: CharacterId = 'rookie', reduceMotion = false) {
  const value = parsePreferences(null);
  value.collection = { completedRuns, selectedCharacter };
  value.settings.reduceMotion = reduceMotion;
  await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(value));
}

describe('character collection integrated with real application services', () => {
  it('starts with rookie, persists the first 100 immediately, and shows its award only after the run', async () => {
    await render(<App />);
    expect(await renderedCharacter()).toBe('rookie');
    await startPlaying();
    await injectDistance(99.99);
    expect(controller.readState().run!.distanceM).toBeGreaterThanOrEqual(100);
    expect(controller.readState().screen).toBe('playing');
    await expectCompletions(1);
    expect(await renderedCharacter()).toBe('rookie');
    expect(screen.queryByTestId('character-unlock-notice')).toBeNull();
    expect(screen.queryByRole('button', { name: ko.characters })).toBeNull();
    // The milestone itself produces neither a new sound cue nor an equip command.
    expect(mockAudio.cue).not.toHaveBeenCalled();
    await injectDistance(128, true);
    expect(screen.getByTestId('character-unlock-notice')).toHaveTextContent(`${ko.characterUnlocked}: ${ko.characterDiligent}`);
    expect((await persisted()).collection.selectedCharacter).toBe('rookie');
    expect(await renderedCharacter()).toBe('rookie');
  });

  it('applies explicit selection only to the next START and restores it from local storage', async () => {
    let view = await render(<App />);
    await startPlaying();
    await injectDistance(100, true);
    const frozenRun = controller.readState().run;
    await fireEvent.press(screen.getByRole('button', { name: ko.characterSelect }));
    await fireEvent.press(screen.getByRole('button', { name: `${ko.characterDiligent} ${ko.characterSelectAction}` }));
    await waitFor(async () => expect((await persisted()).collection.selectedCharacter).toBe('diligent'));
    expect(await renderedCharacter()).toBe('rookie');
    expect(controller.readState().run).toBe(frozenRun);
    await fireEvent.press(screen.getByRole('button', { name: ko.close }));
    await startPlaying(true);
    expect(await renderedCharacter()).toBe('diligent');
    expect(controller.readState().run!.id).toBe(frozenRun!.id + 1);
    expect(screen.queryByTestId('character-unlock-notice')).toBeNull();
    await view.unmount();
    await act(async () => { await Promise.resolve(); });
    view = await render(<App />);
    await startPlaying();
    expect(await renderedCharacter()).toBe('diligent');
    await view.unmount();
  });

  it('adds one distinct qualifying run to saved count nine and awards veteran without auto-equipping', async () => {
    await hydrateStored(9, 'diligent');
    await render(<App />);
    await startPlaying();
    expect(await renderedCharacter()).toBe('diligent');
    await injectDistance(100, true);
    await expectCompletions(10);
    expect(screen.getByTestId('character-unlock-notice')).toHaveTextContent(`${ko.characterUnlocked}: ${ko.characterVeteran}`);
    expect((await persisted()).collection.selectedCharacter).toBe('diligent');
    expect(await renderedCharacter()).toBe('diligent');
    await fireEvent.press(screen.getByRole('button', { name: ko.characterSelect }));
    expect(screen.getByTestId('select-veteran')).toBeEnabled();
  });

  it('counts 100/200, repeated publications, pause/resume, result and rerender only once per attempt', async () => {
    const view = await render(<App />);
    await startPlaying();
    await injectDistance(100);
    await expectCompletions(1);
    await injectDistance(200);
    await fireEvent.press(screen.getByRole('button', { name: ko.pause }));
    await view.rerender(<App />);
    await expectCompletions(1);
    await fireEvent.press(screen.getByRole('button', { name: ko.resume }));
    await advance(1); // Explicit RESUME resets the display clock.
    await injectDistance(220, true);
    await expectCompletions(1);
    expect((await persisted()).bestScore).toBe(220);
    await view.rerender(<App />);
    await expectCompletions(1);
    await startPlaying(true);
    await injectDistance(100, true);
    await expectCompletions(2);
    expect(screen.queryByTestId('character-unlock-notice')).toBeNull();
  });

  it('excludes development mock-ad-enabled attempts, even before an ad is used', async () => {
    process.env.EXPO_PUBLIC_ENABLE_MOCK_AD = 'true';
    await render(<App />);
    await startPlaying();
    await injectDistance(200, true);
    expect(screen.getByRole('button', { name: ko.revive })).toBeOnTheScreen();
    await waitFor(async () => expect((await persisted()).bestScore).toBe(200));
    expect((await persisted()).collection.completedRuns).toBe(0);
    expect(screen.queryByTestId('character-unlock-notice')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: ko.characters }));
    expect(screen.getByTestId('select-diligent')).toBeDisabled();
    expect(screen.getByTestId('select-veteran')).toBeDisabled();
  });

  it('keeps the same actual engine fall state for all three skins with reduced motion off and on', async () => {
    const outcomes: GameState[] = [];
    for (const reduceMotion of [false, true]) {
      for (const character of CHARACTERS) {
        await hydrateStored(10, character.id, reduceMotion);
        const view = await render(<App />);
        // Verify the stored setting actually hydrated through the app before this run.
        await fireEvent.press(screen.getByRole('button', { name: ko.settings }));
        expect(screen.getByRole('switch', { name: ko.reduceMotion }).props.value).toBe(reduceMotion);
        await fireEvent.press(screen.getByRole('button', { name: ko.close }));
        await startPlaying();
        expect(await renderedCharacter()).toBe(character.id);
        await act(() => {
          controller.setInput('keyboard', 'ArrowLeft', -1, true);
          for (let index = 0; index < 600 && controller.readState().screen === 'playing'; index += 1) deliver();
        });
        expect(controller.readState().screen).toBe('result');
        outcomes.push(controller.readState());
        await view.unmount();
        await act(async () => { await Promise.resolve(); });
      }
    }
    expect(outcomes).toHaveLength(6);
    outcomes.forEach(outcome => expect(outcome).toEqual(outcomes[0]));
  });
});
