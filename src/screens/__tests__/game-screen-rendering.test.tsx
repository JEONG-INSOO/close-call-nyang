import { fireEvent, render, screen } from '@testing-library/react-native';
import { makeMutable } from 'react-native-reanimated';
import { StyleSheet } from 'react-native';
import { createGameController } from '../../game/controller';
import { createInitialState, transition } from '../../game/engine';
import type { SceneFrame } from '../../scene/types';
import { GameScreen, sameGameScreenPresentation, type GameScreenProps } from '../GameScreen';

const mockHud = jest.fn();
const mockScene = jest.fn();
jest.mock('../../components/GameHud', () => ({ GameHud: (props: unknown) => { mockHud(props); return null; } }));
jest.mock('../../scene/GameScene', () => ({ GameScene: (props: unknown) => { mockScene(props); return null; } }));

function props(): GameScreenProps {
  const state = transition(createInitialState(), { type: 'START', runId: 1, seed: 44 }, { mockAdsEnabled: false }).state;
  state.screen = 'playing';
  state.run!.event = { id: 'bossCall', direction: -1, phase: 'warning', remainingSeconds: 1, strength: 2 };
  return { controller: createGameController({ mockAdsEnabled: false }),
    snapshot: { state, score: 0, stage: 'street' }, reduceMotion: false, characterId: 'rookie',
    frame: makeMutable<SceneFrame>({ distanceM: 0, elapsedSeconds: 0, angleRad: 0, angularVelocity: 0,
      hasCoffee: false, protectionSeconds: 0, playing: true, fallen: false, seed: 44 }) };
}
beforeEach(() => { mockHud.mockClear(); mockScene.mockClear(); });

it('does not render HUD or scene for 100 snapshots whose visible values have not changed', async () => {
  const initial = props();
  const view = await render(<GameScreen {...initial} />);
  const hudCount = mockHud.mock.calls.length, sceneCount = mockScene.mock.calls.length;
  for (let i = 1; i <= 100; i++) {
    const state = { ...initial.snapshot.state, run: { ...initial.snapshot.state.run!, angleRad: i / 100,
      elapsedSeconds: i / 120, event: { ...initial.snapshot.state.run!.event!, remainingSeconds: 1 - i / 120 } } };
    await view.rerender(<GameScreen {...initial} snapshot={{ ...initial.snapshot, state }} />);
  }
  expect(mockHud).toHaveBeenCalledTimes(hudCount);
  expect(mockScene).toHaveBeenCalledTimes(sceneCount);
});

it('still updates score, event phase/direction/id and clears an ended event', async () => {
  const initial = props();
  const view = await render(<GameScreen {...initial} />);
  for (const event of [
    { ...initial.snapshot.state.run!.event!, phase: 'active' as const },
    { ...initial.snapshot.state.run!.event!, direction: 1 as const },
    { ...initial.snapshot.state.run!.event!, id: 'urgentEdit' as const }, null,
  ]) {
    const state = { ...initial.snapshot.state, run: { ...initial.snapshot.state.run!, event } };
    await view.rerender(<GameScreen {...initial} snapshot={{ ...initial.snapshot, score: 12, state }} />);
    expect(mockHud.mock.lastCall![0]).toMatchObject({ score: 12, event });
  }
});

it('keeps frame, controller, character and motion updates live and releases input on pause', async () => {
  const initial = props();
  const view = await render(<GameScreen {...initial} />);
  const setInput = jest.spyOn(initial.controller, 'setInput');
  await fireEvent(screen.getByTestId('control-left'), 'touchStart', { nativeEvent: { target: 1, changedTouches: [{ target: 1, identifier: 5 }] } });
  expect(setInput).toHaveBeenLastCalledWith('touch', 'left:touch:5', -1, true);
  await view.rerender(<GameScreen {...initial} snapshot={{ ...initial.snapshot, state: { ...initial.snapshot.state, screen: 'paused' } }} />);
  expect(setInput).toHaveBeenLastCalledWith('touch', 'left:touch:5', -1, false);
  expect(screen.getByTestId('control-left', { includeHiddenElements: true }).props.accessibilityState.disabled).toBe(true);
  const variants: Partial<GameScreenProps>[] = [
    { frame: props().frame }, { characterId: 'diligent' }, { reduceMotion: true }, { controller: props().controller },
  ];
  for (const variant of variants) {
    await view.rerender(<GameScreen {...initial} />);
    const before = mockScene.mock.calls.length;
    await view.rerender(<GameScreen {...initial} {...variant} />);
    expect(mockScene.mock.calls.length).toBeGreaterThan(before);
  }
  const controller = props().controller, change = jest.spyOn(controller, 'setInput');
  await view.rerender(<GameScreen {...initial} controller={controller} />);
  await fireEvent(screen.getByTestId('control-left'), 'touchStart', { nativeEvent: { target: 1, changedTouches: [{ target: 1, identifier: 6 }] } });
  expect(change).toHaveBeenLastCalledWith('touch', 'left:touch:6', -1, true);
  await fireEvent(screen.getByTestId('game-screen'), 'layout', { nativeEvent: { layout: { width: 800, height: 450 } } });
  expect(StyleSheet.flatten(screen.getByTestId('game-stage').props.style)).toMatchObject({ width: 800, height: 450 });
  await fireEvent(screen.getByTestId('game-screen'), 'layout', { nativeEvent: { layout: { width: 640, height: 360 } } });
  expect(StyleSheet.flatten(screen.getByTestId('game-stage').props.style)).toMatchObject({ width: 640, height: 360 });
});

it('compares each visible field independently without hiding an update behind another change', () => {
  const initial = props();
  expect(sameGameScreenPresentation(initial, initial)).toBe(true);
  for (const variant of [
    { frame: props().frame }, { controller: props().controller }, { characterId: 'diligent' as const },
    { reduceMotion: true }, { snapshot: { ...initial.snapshot, score: 1 } },
    { snapshot: { ...initial.snapshot, state: { ...initial.snapshot.state, screen: 'paused' as const } } },
  ]) expect(sameGameScreenPresentation(initial, { ...initial, ...variant })).toBe(false);
  for (const event of [
    { ...initial.snapshot.state.run!.event!, phase: 'active' as const },
    { ...initial.snapshot.state.run!.event!, direction: 1 as const },
    { ...initial.snapshot.state.run!.event!, id: 'urgentEdit' as const }, null,
  ]) expect(sameGameScreenPresentation(initial, { ...initial, snapshot: { ...initial.snapshot,
    state: { ...initial.snapshot.state, run: { ...initial.snapshot.state.run!, event } } } })).toBe(false);
});
