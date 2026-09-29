import { act, render, screen, waitFor } from '@testing-library/react-native';
import { makeMutable } from 'react-native-reanimated';
import Svg from 'react-native-svg';
import { NyangCharacter, NYANG_WALK } from '../NyangCharacter';
import { VETERAN_ART, veteranFrameIndexAt } from '../VeteranSprite';
import type { SceneFrame } from '../types';

jest.mock('react-native-svg', () => {
  const svg = jest.requireActual('react-native-reanimated/src/mock-svg');
  return { ...svg, default: svg.Svg };
});

const initial: SceneFrame = {
  distanceM: 0, elapsedSeconds: 0, angleRad: 0, angularVelocity: 0,
  hasCoffee: false, protectionSeconds: 0, playing: true, fallen: false, seed: 1,
};
const byId = (id: string) => screen.getByTestId(id, { includeHiddenElements: true });
const atlasX = () => {
  const props = byId('veteran-atlas-shift').props.jestAnimatedProps.value;
  return (props.matrix ?? props.transform)[4];
};

test('one clipped atlas displays the four supplied frames in exact numeric order', async () => {
  const sample = makeMutable<SceneFrame>({ ...initial });
  await render(<Svg><NyangCharacter frame={sample} characterId="veteran" reduceMotion /></Svg>);
  expect(VETERAN_ART).toMatchObject({ width: 380, height: 425, feetY: 415 });
  expect(byId('veteran-atlas').props).toMatchObject({ width: 2280, height: 425 });
  expect(byId('veteran-sprite')).toBeTruthy();
  for (let index = 0; index < 4; index++) {
    const next = { ...initial, distanceM: NYANG_WALK.metersPerCycle * (index * 2 + 1) / 8 };
    expect(veteranFrameIndexAt('game', next.distanceM)).toBe(index);
    await act(() => { sample.value = next; });
    await waitFor(() => expect(atlasX()).toBe(-index * VETERAN_ART.width));
    expect(sample.value).toEqual(next);
  }
});

test('danger and fall take precedence, then revive restores the current walking frame', async () => {
  const sample = makeMutable<SceneFrame>({ ...initial, distanceM: NYANG_WALK.metersPerCycle * 7 / 8 });
  await render(<Svg><NyangCharacter frame={sample} characterId="veteran" reduceMotion /></Svg>);
  expect(atlasX()).toBe(-3 * 380);
  await act(() => { sample.value = { ...sample.value, angleRad: 40 * Math.PI / 180 }; });
  await waitFor(() => expect(atlasX()).toBe(-4 * 380));
  await act(() => { sample.value = { ...sample.value, fallen: true, playing: false }; });
  await waitFor(() => expect(atlasX()).toBe(-5 * 380));
  await act(() => { sample.value = { ...sample.value, fallen: false, angleRad: 0 }; });
  await waitFor(() => expect(atlasX()).toBe(-3 * 380));
});

test('coffee and protection read only the supplied game frame; preview hides the cup', async () => {
  const sample = makeMutable<SceneFrame>({ ...initial, hasCoffee: true, protectionSeconds: 1 });
  const rendered = await render(<Svg><NyangCharacter frame={sample} characterId="veteran" reduceMotion /></Svg>);
  expect(byId('cup-visibility')).toHaveAnimatedProps({ opacity: 1 });
  expect(byId('protection-outline')).toHaveAnimatedProps({ opacity: 0.5 });
  expect(byId('cup').props.transform).toBe('translate(64 -60)');
  await rendered.rerender(<Svg><NyangCharacter frame={sample} characterId="veteran" pose="walk" reduceMotion /></Svg>);
  await waitFor(() => expect(byId('cup-visibility')).toHaveAnimatedProps({ opacity: 0 }));
  expect(veteranFrameIndexAt('walk', 100)).toBe(0);
  expect(sample.value).toEqual({ ...initial, hasCoffee: true, protectionSeconds: 1 });
});
