import { act, render, screen, waitFor } from '@testing-library/react-native';
import { makeMutable } from 'react-native-reanimated';
import Svg from 'react-native-svg';
import { NyangCharacter, NYANG_COLORS, NYANG_WALK, type EmployeePose } from '../NyangCharacter';
import { EmployeeCharacterSheet } from '../EmployeeCharacterSheet';
import { expressionAt, ROOKIE_ART } from '../RookieSprite';
import type { SceneFrame } from '../types';

jest.mock('react-native-svg', () => {
  const svg = jest.requireActual('react-native-reanimated/src/mock-svg');
  return { ...svg, default: svg.Svg };
});
const initial: SceneFrame = { distanceM: 0, elapsedSeconds: 0, angleRad: 0,
  angularVelocity: 0, hasCoffee: false, protectionSeconds: 0, playing: true, fallen: false, seed: 1 };
const byId = (id: string) => screen.getByTestId(id, { includeHiddenElements: true });
const matrixOf = (id: string) => {
  const props = byId(id).props.jestAnimatedProps.value;
  return props.matrix ?? props.transform;
};
const opacityOf = (id: string) => byId(id).props.jestAnimatedProps.value.opacity;
const DEG = Math.PI / 180;

test('rookie is assembled from the generated parts at the shared 200-unit rig height', async () => {
  const frame = makeMutable<SceneFrame>({ ...initial });
  await render(<Svg><NyangCharacter frame={frame} reduceMotion /></Svg>);
  expect(ROOKIE_ART.scale).toBeCloseTo(200 / 543);
  expect(byId('rookie-sprite').props.transform).toBe(`scale(${200 / 543})`);
  for (const id of ['tail', 'leg-left', 'leg-right', 'outfit-rookie', 'head-contour', 'face-rookie', 'raised-arm-left', 'raised-arm-right']) {
    expect(byId(id)).toBeTruthy();
  }
  for (const id of ['face-calm', 'face-alarm', 'face-hurt']) expect(byId(id)).toBeTruthy();
  expect(frame.value).toEqual(initial);
});

test('expression is calm below 40 degrees, alarmed from 40 degrees and hurt once fallen', () => {
  expect(ROOKIE_ART.alarmDegrees).toBe(40);
  for (const angle of [0, 0.3, -0.69]) expect(expressionAt(angle, false)).toBe(0);
  for (const angle of [40 * DEG, -40 * DEG, 0.9, -1.1]) expect(expressionAt(angle, false)).toBe(1);
  for (const angle of [0, 1.13, -1.13]) expect(expressionAt(angle, true)).toBe(2);
});

test.each([
  { name: 'calm', angleRad: 0, fallen: false, calm: 1, alarm: 0, hurt: 0, raised: 0 },
  { name: 'alarm', angleRad: 0.8, fallen: false, calm: 0, alarm: 1, hurt: 0, raised: 1 },
  { name: 'hurt', angleRad: 65 * DEG, fallen: true, calm: 0, alarm: 0, hurt: 1, raised: 1 },
])('shows exactly the $name face and matching arms', async ({ angleRad, fallen, calm, alarm, hurt, raised }) => {
  await render(<Svg><NyangCharacter frame={makeMutable<SceneFrame>({ ...initial, angleRad, fallen })} reduceMotion /></Svg>);
  expect(opacityOf('face-calm')).toBe(calm);
  expect(opacityOf('face-alarm')).toBe(alarm);
  expect(opacityOf('face-hurt')).toBe(hurt);
  expect(opacityOf('raised-arm-left')).toBe(raised);
  expect(opacityOf('raised-arm-right')).toBe(raised);
  expect(opacityOf('rookie-arm-left')).toBe(1 - raised);
  expect(opacityOf('empty-hand')).toBe(1 - raised);
});

test('coffee replaces the right arm and stays in hand while alarmed', async () => {
  await render(<Svg><NyangCharacter frame={makeMutable<SceneFrame>({ ...initial, hasCoffee: true, angleRad: 0.8 })} reduceMotion /></Svg>);
  expect(opacityOf('cup-visibility')).toBe(1);
  expect(opacityOf('empty-hand')).toBe(0);
  expect(opacityOf('raised-arm-right')).toBe(0);
  expect(opacityOf('raised-arm-left')).toBe(1);
});

test.each([-1, 1])('head counter-tilts against the tumble so the hurt face stays readable (side %s)', async side => {
  await render(<Svg><NyangCharacter frame={makeMutable<SceneFrame>({ ...initial, angleRad: side * 65 * DEG, fallen: true })} reduceMotion /></Svg>);
  expect(matrixOf('plush-head')[1]).toBeCloseTo(Math.sin(-45 * side * DEG));
  expect(matrixOf('plush-head').slice(4)).toEqual([12, -291]);
});

test('alarm tilts the head 18 degrees against the lean; calm keeps it upright', async () => {
  const frame = makeMutable<SceneFrame>({ ...initial, angleRad: -0.8 });
  await render(<Svg><NyangCharacter frame={frame} reduceMotion /></Svg>);
  expect(matrixOf('plush-head')[1]).toBeCloseTo(Math.sin(18 * DEG));
  await act(() => { frame.value = { ...initial, angleRad: 0.2 }; });
  await waitFor(() => expect(matrixOf('plush-head')[1]).toBeCloseTo(0));
});

test('art poses do not mutate a coffee game frame and hide the cup', async () => {
  for (const pose of ['walk', 'run'] as const) {
    const frame = makeMutable<SceneFrame>({ ...initial, hasCoffee: true, distanceM: 55 });
    const original = { ...frame.value };
    const rendered = await render(<Svg><NyangCharacter frame={frame} reduceMotion pose={pose} /></Svg>);
    expect(opacityOf('cup-visibility')).toBe(0);
    expect(frame.value).toEqual(original);
    await rendered.unmount();
  }
});

test('walk and run have distinct bounded strides', async () => {
  const frame = makeMutable<SceneFrame>({ ...initial });
  const renderPose = (pose: EmployeePose) => <Svg><NyangCharacter frame={frame} pose={pose} reduceMotion /></Svg>;
  const rendered = await render(renderPose('walk'));
  expect(matrixOf('leg-right')[1]).toBeCloseTo(Math.sin(-22 * 0.85 * DEG));
  await rendered.rerender(renderPose('run'));
  await waitFor(() => expect(matrixOf('leg-right')[1]).toBeCloseTo(Math.sin(-22 * 1.3 * DEG)));
  expect(matrixOf('leg-left')[5]).toBeCloseTo(-95 - 8 * 1.3);
  expect(frame.value).toEqual(initial);
});

test.each(['diligent', 'veteran'] as const)('reward %s keeps its previous flat skin', async characterId => {
  await render(<Svg><NyangCharacter frame={makeMutable<SceneFrame>({ ...initial, hasCoffee: true })} characterId={characterId} reduceMotion /></Svg>);
  expect(byId('head-contour').props.fill).toBe(NYANG_COLORS.fur);
  expect(byId(`outfit-${characterId}`).children).toHaveLength(2);
  expect(screen.queryByTestId('rookie-sprite')).toBeNull();
  expect(opacityOf('cup-visibility')).toBe(1);
});

test.each([-1, 0, 1])('hanging arms stay splayed outward at stride %s so the paws never tuck behind the jacket', async stride => {
  const quarter = NYANG_WALK.metersPerCycle / 4;
  const distanceM = stride === 0 ? 0 : stride > 0 ? quarter : quarter * 3;
  await render(<Svg><NyangCharacter frame={makeMutable<SceneFrame>({ ...initial, distanceM })} reduceMotion /></Svg>);
  // The left arm is mirrored, so a positive angle opens it outward; the right arm opens with a negative one.
  expect(matrixOf('rookie-arm-left')[1]).toBeGreaterThan(0);
  expect(matrixOf('empty-hand')[1]).toBeLessThan(0);
});

test('arm swing follows a replaced shared frame and leaves the stale frame disconnected', async () => {
  const previous = makeMutable<SceneFrame>({ ...initial });
  const rendered = await render(<Svg><NyangCharacter frame={previous} reduceMotion /></Svg>);
  const replacement = makeMutable<SceneFrame>({ ...initial });
  await rendered.rerender(<Svg><NyangCharacter frame={replacement} reduceMotion /></Svg>);
  await act(() => { replacement.value = { ...initial, distanceM: NYANG_WALK.metersPerCycle / 4 }; });
  await waitFor(() => expect(matrixOf('rookie-arm-left')[1]).toBeCloseTo(Math.sin(10 * DEG)));
  const pose = [...matrixOf('rookie-arm-left')];
  await act(() => { previous.value = { ...initial, distanceM: NYANG_WALK.metersPerCycle * 3 / 4 }; });
  expect(matrixOf('rookie-arm-left')).toEqual(pose);
  expect(replacement.value.distanceM).toBe(NYANG_WALK.metersPerCycle / 4);
});

test('four-pose sheet reuses four actual rookie renderers', async () => {
  await render(<EmployeeCharacterSheet />);
  expect(screen.getAllByTestId('rookie-sprite', { includeHiddenElements: true })).toHaveLength(4);
  for (const pose of ['walk', 'run', 'coffee', 'alarm']) expect(byId(`employee-pose-${pose}`)).toBeTruthy();
});
