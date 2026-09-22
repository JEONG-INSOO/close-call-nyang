import { act, render, screen, waitFor } from '@testing-library/react-native';
import { makeMutable } from 'react-native-reanimated';
import Svg from 'react-native-svg';
import { GREY_TABBY_COLORS as C } from '../GreyTabbyParts';
import { NyangCharacter, NYANG_COLORS, NYANG_WALK, soleRevealAt, type EmployeePose } from '../NyangCharacter';
import { EmployeeCharacterSheet } from '../EmployeeCharacterSheet';
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

test('approved rookie has grey stripes, two bright eyes, smile, jacket, collar and photographed ID', async () => {
  const frame = makeMutable({ ...initial });
  await render(<Svg><NyangCharacter frame={frame} reduceMotion /></Svg>);
  expect(byId('head-contour').props.fill).toBe(C.fur);
  expect(byId('grey-tabby-stripes')).toBeTruthy();
  expect(byId('grey-tabby-bright-eyes').children).toHaveLength(2);
  expect(byId('eye-glint-left').props.fill).toBe(C.shirt);
  expect(byId('eye-glint-right').props.fill).toBe(C.shirt);
  expect(byId('rookie-smile').props.fill).toBe(C.pink);
  expect(byId('suit-jacket').props.fill).toBe(C.suit);
  expect(byId('collared-shirt').props.fill).toBe(C.shirt);
  for (const id of ['tie-rookie', 'lanyard-rookie', 'badge-portrait', 'employee-badge-rookie']) expect(byId(id)).toBeTruthy();
  expect(byId('badge-text').props.children).toBe('ID: 001');
  expect(byId('paw-left').props.fill).toBe(C.fur);
  expect(byId('paw-right').props.fill).toBe(C.fur);
  expect(byId('plush-body').props).toMatchObject({ rx: 62, ry: 45 });
  for (const side of ['left', 'right']) {
    expect(byId(`paw-pad-${side}`)).toBeTruthy();
    expect(screen.getAllByTestId(new RegExp(`^paw-bean-${side}-`), { includeHiddenElements: true })).toHaveLength(3);
  }
  expect(frame.value).toEqual(initial);
});

test('rookie sole reveal is hidden while planted and remains partial at peak lift', () => {
  for (const stride of [-1, 0, 0.1, NaN]) expect(soleRevealAt(stride, false)).toBe(0);
  expect(soleRevealAt(0.55, false)).toBeGreaterThan(0);
  expect(soleRevealAt(0.55, false)).toBeLessThan(0.82);
  expect(soleRevealAt(1, false)).toBeCloseTo(0.82);
  expect(soleRevealAt(-1, true)).toBe(1);
});

test.each(['walk', 'water', 'run', 'notes'] as const)('art pose %s overrides props visually without mutating a coffee game frame', async pose => {
  const frame = makeMutable({ ...initial, hasCoffee: true, distanceM: 55 });
  const original = { ...frame.value };
  await render(<Svg><NyangCharacter frame={frame} reduceMotion pose={pose} /></Svg>);
  expect(byId('cup-visibility')).toHaveAnimatedProps({ opacity: 0 });
  expect(screen.queryByTestId('water-bottle')).toBe(pose === 'water' ? byId('water-bottle') : null);
  expect(screen.queryByTestId('note-pad')).toBe(pose === 'notes' ? byId('note-pad') : null);
  expect(screen.queryByTestId('pencil')).toBe(pose === 'notes' ? byId('pencil') : null);
  if (pose === 'notes') {
    expect(screen.queryByTestId('rookie-arm-left')).toBeNull();
    expect(byId('note-writing-sleeve')).toBeTruthy();
  }
  expect(frame.value).toEqual(original);
});

test.each(['diligent', 'veteran'] as const)('reward %s keeps its previous skin and ignores rookie-only art props', async characterId => {
  await render(<Svg><NyangCharacter frame={makeMutable<SceneFrame>({ ...initial, hasCoffee: true })} characterId={characterId} pose="water" reduceMotion /></Svg>);
  expect(byId('head-contour').props.fill).toBe(NYANG_COLORS.fur);
  expect(byId(`outfit-${characterId}`).children).toHaveLength(2);
  expect(screen.queryByTestId('grey-tabby-stripes')).toBeNull();
  expect(screen.queryByTestId('water-bottle')).toBeNull();
  expect(byId('cup-visibility')).toHaveAnimatedProps({ opacity: 1 });
});

test('walk and run have distinct bounded short strides; water and notes have planted feet', async () => {
  const frame = makeMutable({ ...initial });
  const renderPose = (pose: EmployeePose) => <Svg><NyangCharacter frame={frame} pose={pose} reduceMotion /></Svg>;
  const rendered = await render(renderPose('walk'));
  const walk = matrixOf('leg-left');
  await rendered.rerender(renderPose('run'));
  await waitFor(() => expect(matrixOf('leg-left')[1]).toBeCloseTo(Math.sin(25 * Math.PI / 180)));
  expect(matrixOf('leg-left')[5]).toBe(-30);
  expect(matrixOf('leg-left')).not.toEqual(walk);
  for (const pose of ['water', 'notes'] as const) {
    await rendered.rerender(renderPose(pose));
    await waitFor(() => expect(matrixOf('leg-left')[5]).toBe(-18));
    expect(matrixOf('leg-right')[5]).toBe(-18);
  }
  expect(frame.value).toEqual(initial);
});

test('new shoulder animations follow a replaced shared frame and leave the stale frame disconnected', async () => {
  const previous = makeMutable({ ...initial });
  const rendered = await render(<Svg><NyangCharacter frame={previous} reduceMotion /></Svg>);
  const replacement = makeMutable({ ...initial });
  await rendered.rerender(<Svg><NyangCharacter frame={replacement} reduceMotion /></Svg>);
  await act(() => { replacement.value = { ...initial, distanceM: NYANG_WALK.metersPerCycle / 4 }; });
  await waitFor(() => expect(matrixOf('rookie-arm-left')[1]).toBeCloseTo(Math.sin(-16 * Math.PI / 180)));
  const pose = [...matrixOf('rookie-arm-left')];
  await act(() => { previous.value = { ...initial, distanceM: NYANG_WALK.metersPerCycle * 3 / 4 }; });
  expect(matrixOf('rookie-arm-left')).toEqual(pose);
  expect(replacement.value.distanceM).toBe(NYANG_WALK.metersPerCycle / 4);
});

test('four-pose sheet reuses exactly four actual rookie renderers with identical badge identity', async () => {
  await render(<EmployeeCharacterSheet />);
  expect(screen.getAllByTestId('face-rookie')).toHaveLength(4);
  expect(screen.getAllByTestId('badge-text').map(node => node.props.children)).toEqual(Array(4).fill('ID: 001'));
  for (const pose of ['walk', 'water', 'run', 'notes']) expect(byId(`employee-pose-${pose}`)).toBeTruthy();
  expect(screen.getAllByTestId('water-bottle')).toHaveLength(1);
  expect(screen.getAllByTestId('note-pad')).toHaveLength(1);
});
