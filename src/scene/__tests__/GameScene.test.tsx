import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { makeMutable } from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { CHARACTERS, type CharacterId } from '../../characters/catalog';
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
      height: 205, headHeight: 118, torsoHeight: 51, legHeight: 36,
      pivotX: 0, pivotY: 0, legLeftX: -19, legRightX: 19, cupX: 58, cupY: -58,
    });
  });

  it.each([false, true])('uses engine coffee state, not a duplicate score threshold (%s)', async hasCoffee => {
    const sample = frame({ distanceM: hasCoffee ? 14.9 : 15, hasCoffee });
    await mountScene(sample);
    expect(byId('cup-visibility')).toHaveAnimatedProps({ opacity: hasCoffee ? 1 : 0 });
    expect(byId('cup').props.transform).toBe('translate(58 -58)');
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

  it.each([-0.55, 0.55])('passes lean %s through a feet-centered rotation', async angleRad => {
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

  it.each(CHARACTERS.flatMap(({ id }) => [false, true].map(hasCoffee => ({ id, hasCoffee }))))(
    'keeps the $id rig and cup grip identical with coffee=$hasCoffee', async ({ id, hasCoffee }) => {
      const sample = frame({ hasCoffee, angleRad: 0.55 });
      await render(<Svg><NyangCharacter frame={sample} characterId={id} reduceMotion={true} /></Svg>);
      expect(byId(`face-${id}`)).toBeTruthy();
      expect(byId(`outfit-${id}`)).toBeTruthy();
      expect(byId('cup').props.transform).toBe('translate(58 -58)');
      expect(byId('cup-visibility')).toHaveAnimatedProps({ opacity: hasCoffee ? 1 : 0 });
      const root = byId('nyang-root').props.jestAnimatedProps.value;
      expect((root.matrix ?? root.transform).slice(4)).toEqual([0, 0]);
      expect(sample.value.angleRad).toBe(0.55);
    },
  );

  it('animates updated shared samples without a React rerender or engine mutation', async () => {
    const sample = frame();
    await mountScene(sample);
    await act(() => {
      sample.value = { ...sample.value, distanceM: 15, elapsedSeconds: 16.3, hasCoffee: true, angleRad: -0.55 };
    });
    expect(byId('cup-visibility')).toHaveAnimatedProps({ opacity: 1 });
    const root = byId('nyang-root').props.jestAnimatedProps.value;
    expect((root.matrix ?? root.transform)[1]).toBeCloseTo(Math.sin(-0.55));
    expect(sample.value.distanceM).toBe(15);
  });

  it('switches every scene subscription when a new run supplies a new shared frame', async () => {
    const previous = frame();
    const rendered = await mountScene(previous);
    const replacement = frame({ distanceM: 51, hasCoffee: true });
    await rendered.rerender(<GameScene frame={replacement} reduceMotion={false} />);
    await act(() => { replacement.value = { ...replacement.value, distanceM: 52 }; });
    const cafe = byId('cafe').props.jestAnimatedProps.value;
    const entrance = byId('company-entrance').props.jestAnimatedProps.value;
    expect((cafe.matrix ?? cafe.transform)[4]).toBe(270 + (15 - 52) * 40);
    expect((entrance.matrix ?? entrance.transform)[4]).toBe(270 + (50.5 - 52) * 40);
    expect(byId('office-scene')).toHaveAnimatedProps({ opacity: 1 });
    expect(byId('cup-visibility')).toHaveAnimatedProps({ opacity: 1 });
    await act(() => { previous.value = { ...previous.value, distanceM: 5 }; });
    expect(byId('cafe').props.jestAnimatedProps.value).toEqual(cafe);
  });

  it.each([false, true])('finishes a visual tumble without changing the scored frame (reduced=%s)', async reduceMotion => {
    jest.useFakeTimers();
    try {
      const sample = frame({ angleRad: 0.7, distanceM: 37, playing: false, fallen: true });
      const original = { ...sample.value };
      await render(<Svg><NyangCharacter frame={sample} reduceMotion={reduceMotion} /></Svg>);
      await act(() => { jest.advanceTimersByTime(500); });
      const root = byId('nyang-root').props.jestAnimatedProps.value;
      expect((root.matrix ?? root.transform)[0]).toBeCloseTo(Math.cos(82 * Math.PI / 180));
      expect(sample.value).toEqual(original);
    } finally { jest.useRealTimers(); }
  });

  it.each([false, true])('shows a soft protection outline without a flashing timer (reduced=%s)', async reduceMotion => {
    await render(<Svg><NyangCharacter frame={frame({ protectionSeconds: 1.5 })} reduceMotion={reduceMotion} /></Svg>);
    expect(byId('protection-outline')).toHaveAnimatedProps({ opacity: 0.5 });
  });
});
