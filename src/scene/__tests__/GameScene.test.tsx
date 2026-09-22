import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { makeMutable } from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { CHARACTERS, type CharacterId } from '../../characters/catalog';
import { palette } from '../../theme/tokens';
import { GameScene } from '../GameScene';
import { NyangCharacter, NYANG_RIG } from '../NyangCharacter';
import type { SceneFrame } from '../types';

// Reanimated's supplied SVG host mock retains animated props for structural tests.
// This is not a claim about native drawing or browser frame rates.
jest.mock('react-native-svg', () => {
  const svg = jest.requireActual('react-native-reanimated/src/mock-svg');
  return { ...svg, default: svg.Svg };
});

const INITIAL: Readonly<SceneFrame> = Object.freeze({
  distanceM: 0, elapsedSeconds: 0, angleRad: 0, angularVelocity: 0,
  hasCoffee: false, protectionSeconds: 0, playing: true, fallen: false, seed: 7,
});
const hidden = { includeHiddenElements: true };
const byId = (id: string) => screen.getByTestId(id, hidden);

function frame(overrides: Partial<SceneFrame> = {}) {
  return makeMutable<SceneFrame>({ ...INITIAL, ...overrides });
}

async function mountScene(sample = frame(), characterId?: CharacterId, reduceMotion = false) {
  const rendered = await render(<GameScene frame={sample} characterId={characterId} reduceMotion={reduceMotion} />);
  await fireEvent(byId('game-scene'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 960, height: 540 } },
  });
  return rendered;
}

describe('GameScene contracts', () => {
  it('renders a safe empty canvas until measured and uses contained landscape coordinates', async () => {
    await render(<GameScene frame={frame()} reduceMotion={false} />);
    expect(screen.queryByTestId('scene-canvas', hidden)).toBeNull();
    await fireEvent(byId('game-scene'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 844, height: 390 } },
    });
    expect(byId('scene-canvas').props.viewBox).toBe('0 0 960 540');
    expect(byId('scene-canvas').props.width).toBeCloseTo(390 * 16 / 9);
    expect(byId('scene-canvas').props.height).toBe(390);
    expect(byId('character-anchor').props.transform).toBe('translate(270 425)');
  });

  it('is decorative, forwards the omitted default, and never changes the input frame', async () => {
    const sample = frame();
    const original = { ...sample.value };
    await mountScene(sample);
    expect(byId('game-scene').props.pointerEvents).toBe('none');
    expect(byId('face-rookie')).toBeTruthy();
    expect(byId('outfit-rookie')).toBeTruthy();
    expect(sample.value).toEqual(original);
  });

  it.each(CHARACTERS.map(character => character.id))('forwards %s to the same body rig', async id => {
    await mountScene(frame(), id);
    expect(byId(`face-${id}`)).toBeTruthy();
    expect(byId(`outfit-${id}`)).toBeTruthy();
    expect(byId('character-anchor').props.transform).toBe('translate(270 425)');
    expect(byId('leg-left')).toBeTruthy();
    expect(byId('leg-right')).toBeTruthy();
    expect(byId('tail')).toBeTruthy();
  });

  it('keeps the agreed shared proportions, feet pivot and cup grip', () => {
    expect(NYANG_RIG).toMatchObject({
      height: 186, headHeight: 118, torsoHeight: 50, legHeight: 18,
      pivotX: 0, pivotY: 0, legLeftX: -23, legRightX: 23, cupX: 62, cupY: -39,
    });
  });

  it.each(CHARACTERS.map(character => character.id))('gives %s a cream plush body and two short round paws, not human shoes', async id => {
    await mountScene(frame(), id);
    expect(byId('plush-head').props.transform).toBe('translate(0 19)');
    expect(byId('plush-body').props.fill).toBe(palette.cream);
    expect(byId('paw-left').props.fill).toBe(palette.cream);
    expect(byId('paw-right').props.fill).toBe(palette.cream);
    expect(byId('paw-left').props.d).toBe(byId('paw-right').props.d);
    const left = byId('leg-left').props.jestAnimatedProps.value;
    const right = byId('leg-right').props.jestAnimatedProps.value;
    expect(left.matrix ?? left.transform).toEqual([1, 0, -0, 1, -23, -18]);
    expect(right.matrix ?? right.transform).toEqual([1, -0, 0, 1, 23, -18]);
    expect(byId('front-paw-left').props.rx).toBe(10);
    expect(byId('front-paw-right').props.ry).toBe(10);
    expect(byId('coffee-grip').props.cx).toBe(52);
    expect(byId('coffee-grip').props.cy).toBe(-35);
  });

  it.each([Math.PI / 10, 3 * Math.PI / 10])('uses an eight-degree, two-unit short step with a three-unit lift at phase %s', async distanceM => {
    await mountScene(frame({ distanceM }));
    const stride = Math.sin(distanceM * 5);
    for (const [id, direction, baseX] of [['leg-left', stride, -23], ['leg-right', -stride, 23]] as const) {
      const props = byId(id).props.jestAnimatedProps.value;
      const matrix = props.matrix ?? props.transform;
      expect(matrix[0]).toBeCloseTo(Math.cos(direction * 8 * Math.PI / 180));
      expect(matrix[1]).toBeCloseTo(Math.sin(direction * 8 * Math.PI / 180));
      expect(matrix[4]).toBeCloseTo(baseX + direction * 2);
      expect(matrix[5]).toBeCloseTo(-18 - Math.max(0, direction) * 3);
    }
  });

  it.each([false, true])('uses engine coffee state, not a duplicate score threshold (%s)', async hasCoffee => {
    const sample = frame({ distanceM: hasCoffee ? 14.9 : 15, hasCoffee });
    await mountScene(sample);
    expect(byId('cup-visibility')).toHaveAnimatedProps({ opacity: hasCoffee ? 1 : 0 });
    expect(byId('cup').props.transform).toBe('translate(62 -39)');
    expect(byId('empty-hand')).toHaveAnimatedProps({ opacity: hasCoffee ? 0 : 1 });
  });

  it.each([0, 14.9, 15, 50, 50.5, 51, 100, 250, 10000])('renders bounded decoration at %sm', async distanceM => {
    await mountScene(frame({ distanceM, hasCoffee: distanceM >= 15 }));
    expect(screen.getAllByTestId('street-scene', hidden)).toHaveLength(1);
    expect(screen.getAllByTestId('office-scene', hidden)).toHaveLength(1);
    expect(screen.getAllByTestId('cafe', hidden)).toHaveLength(1);
    expect(screen.getAllByTestId('company-entrance', hidden)).toHaveLength(1);
    expect(byId('office-scene')).toHaveAnimatedProps({ opacity: Math.min(1, Math.max(0, distanceM - 50)) });
  });

  it('renders the same node count for a short and a long run', async () => {
    const sample = frame({ distanceM: 51 });
    const rendered = await mountScene(sample);
    const count = (node: unknown): number => {
      if (Array.isArray(node)) return node.reduce<number>((total, item) => total + count(item), 0);
      if (node && typeof node === 'object') return 1 + count((node as { children?: unknown }).children);
      return 0;
    };
    const before = count(rendered.toJSON());
    await act(() => { sample.value = { ...sample.value, distanceM: 10000 }; });
    expect(count(rendered.toJSON())).toBe(before);
  });

  it.each([-65 * Math.PI / 180, -Math.PI / 3, -0.55, 0.55, Math.PI / 3, 65 * Math.PI / 180])('passes lean %s through a feet-centered rotation', async angleRad => {
    await render(<Svg><NyangCharacter frame={frame({ angleRad })} reduceMotion={true} /></Svg>);
    const props = byId('nyang-root').props.jestAnimatedProps.value;
    const matrix = props.matrix ?? props.transform;
    expect(matrix[0]).toBeCloseTo(Math.cos(angleRad));
    expect(matrix[1]).toBeCloseTo(Math.sin(angleRad));
    expect(matrix[2]).toBeCloseTo(-Math.sin(angleRad));
    expect(matrix[3]).toBeCloseTo(Math.cos(angleRad));
    expect(matrix[4]).toBe(0);
    expect(matrix[5]).toBe(0);
  });

  it('keeps a paused frame and limb poses unchanged while wall-clock timers advance', async () => {
    jest.useFakeTimers();
    try {
      const sample = frame({ elapsedSeconds: 3.25, angleRad: 0.2, playing: false });
      const original = { ...sample.value };
      await mountScene(sample);
      const left = { ...byId('leg-left').props.jestAnimatedProps.value };
      const right = { ...byId('leg-right').props.jestAnimatedProps.value };
      await act(() => { jest.advanceTimersByTime(1000); });
      expect(byId('leg-left')).toHaveAnimatedProps(left);
      expect(byId('leg-right')).toHaveAnimatedProps(right);
      expect(sample.value).toEqual(original);
    } finally { jest.useRealTimers(); }
  });

  it.each(CHARACTERS.flatMap(({ id }) => [false, true].flatMap(hasCoffee => [-Math.PI / 3, Math.PI / 3].map(angleRad => ({ id, hasCoffee, angleRad })))))(
    'keeps the $id rig and cup grip identical with coffee=$hasCoffee at $angleRad', async ({ id, hasCoffee, angleRad }) => {
      const sample = frame({ hasCoffee, angleRad });
      await render(<Svg><NyangCharacter frame={sample} characterId={id} reduceMotion={true} /></Svg>);
      expect(byId(`face-${id}`)).toBeTruthy();
      expect(byId(`outfit-${id}`)).toBeTruthy();
      expect(byId('cup').props.transform).toBe('translate(62 -39)');
      expect(byId('cup-visibility')).toHaveAnimatedProps({ opacity: hasCoffee ? 1 : 0 });
      const root = byId('nyang-root').props.jestAnimatedProps.value;
      expect((root.matrix ?? root.transform).slice(4)).toEqual([0, 0]);
      expect((root.matrix ?? root.transform)[1]).toBeCloseTo(Math.sin(angleRad));
      expect(sample.value.angleRad).toBe(angleRad);
    },
  );

  it('animates updated shared samples without a React rerender or engine mutation', async () => {
    const sample = frame();
    await mountScene(sample);
    await act(() => {
      sample.value = { ...sample.value, distanceM: 15, elapsedSeconds: 16.3, hasCoffee: true, angleRad: -0.55 };
    });
    await waitFor(() => {
      expect(byId('cup-visibility')).toHaveAnimatedProps({ opacity: 1 });
      const root = byId('nyang-root').props.jestAnimatedProps.value;
      expect((root.matrix ?? root.transform)[1]).toBeCloseTo(Math.sin(-0.55));
    });
    expect(sample.value.distanceM).toBe(15);
  });

  it('switches every scene subscription when a new run supplies a new shared frame', async () => {
    const previous = frame();
    const rendered = await mountScene(previous);
    const replacement = frame({ distanceM: 51, hasCoffee: true, angleRad: Math.PI / 3, protectionSeconds: 1.5 });
    await rendered.rerender(<GameScene frame={replacement} reduceMotion={false} />);
    await act(() => { replacement.value = { ...replacement.value, distanceM: 52 }; });
    await waitFor(() => {
      const cafe = byId('cafe').props.jestAnimatedProps.value;
      const entrance = byId('company-entrance').props.jestAnimatedProps.value;
      expect((cafe.matrix ?? cafe.transform)[4]).toBe(270 + (15 - 52) * 40);
      expect((entrance.matrix ?? entrance.transform)[4]).toBe(270 + (50.5 - 52) * 40);
      expect(byId('office-scene')).toHaveAnimatedProps({ opacity: 1 });
      expect(byId('cup-visibility')).toHaveAnimatedProps({ opacity: 1 });
      expect(byId('empty-hand')).toHaveAnimatedProps({ opacity: 0 });
      expect(byId('protection-outline')).toHaveAnimatedProps({ opacity: 0.5 });
      const root = byId('nyang-root').props.jestAnimatedProps.value;
      expect((root.matrix ?? root.transform)[1]).toBeCloseTo(Math.sin(Math.PI / 3));
      const left = byId('leg-left').props.jestAnimatedProps.value;
      expect((left.matrix ?? left.transform)[4]).toBeCloseTo(-23 + Math.sin(52 * 5) * 2);
    });
    const cafe = byId('cafe').props.jestAnimatedProps.value;
    const root = byId('nyang-root').props.jestAnimatedProps.value;
    await act(() => { previous.value = { ...previous.value, distanceM: 5, angleRad: -Math.PI / 3 }; });
    expect(byId('cafe').props.jestAnimatedProps.value).toEqual(cafe);
    expect(byId('nyang-root').props.jestAnimatedProps.value).toEqual(root);
    expect(byId('cup-visibility')).toHaveAnimatedProps({ opacity: 1 });
  });

  it.each([false, true].flatMap(reduceMotion => [-1, 1].map(side => ({ reduceMotion, side }))))('finishes a visual tumble without changing the scored frame (reduced=$reduceMotion side=$side)', async ({ reduceMotion, side }) => {
    jest.useFakeTimers();
    try {
      const sample = frame({ angleRad: side * 65 * Math.PI / 180, distanceM: 37, playing: false, fallen: true });
      const original = { ...sample.value };
      await render(<Svg><NyangCharacter frame={sample} reduceMotion={reduceMotion} /></Svg>);
      await act(() => { jest.advanceTimersByTime(500); });
      const root = byId('nyang-root').props.jestAnimatedProps.value;
      expect((root.matrix ?? root.transform)[0]).toBeCloseTo(Math.cos(82 * Math.PI / 180));
      expect((root.matrix ?? root.transform)[1]).toBeCloseTo(Math.sin(side * 82 * Math.PI / 180));
      expect((root.matrix ?? root.transform).slice(4)).toEqual([0, 0]);
      expect(sample.value).toEqual(original);
    } finally { jest.useRealTimers(); }
  });

  it('does not reduce the actual sixty-degree lean or walking pose when motion reduction changes', async () => {
    const sample = frame({ angleRad: -Math.PI / 3, distanceM: 23, elapsedSeconds: 19 });
    const original = { ...sample.value };
    const rendered = await render(<Svg><NyangCharacter frame={sample} reduceMotion={false} /></Svg>);
    const root = byId('nyang-root').props.jestAnimatedProps.value;
    const left = byId('leg-left').props.jestAnimatedProps.value;
    const right = byId('leg-right').props.jestAnimatedProps.value;
    await rendered.rerender(<Svg><NyangCharacter frame={sample} reduceMotion={true} /></Svg>);
    await waitFor(() => {
      expect(byId('nyang-root')).toHaveAnimatedProps(root);
      expect(byId('leg-left')).toHaveAnimatedProps(left);
      expect(byId('leg-right')).toHaveAnimatedProps(right);
    });
    expect(sample.value).toEqual(original);
  });

  it.each([false, true])('shows a soft protection outline without a flashing timer (reduced=%s)', async reduceMotion => {
    await render(<Svg><NyangCharacter frame={frame({ protectionSeconds: 1.5 })} reduceMotion={reduceMotion} /></Svg>);
    expect(byId('protection-outline')).toHaveAnimatedProps({ opacity: 0.5 });
  });
});
