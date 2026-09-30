import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { makeMutable } from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { CHARACTERS, type CharacterId } from '../../characters/catalog';
import { BALANCE } from '../../game/balance';
import { GameScene } from '../GameScene';
import { NyangCharacter, NYANG_RIG, NYANG_WALK, walkPhaseAt } from '../NyangCharacter';
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
const ROOKIE_CUP = 'translate(88 -248) scale(1.04)';
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
    expect(byId('character-anchor').props.transform).toBe('translate(270 425)');
    if (id === 'diligent' || id === 'veteran') {
      expect(byId(`${id}-sprite`)).toBeTruthy();
      expect(byId(`${id}-atlas`)).toBeTruthy();
      expect(screen.queryByTestId('rookie-sprite', hidden)).toBeNull();
    } else {
      expect(byId(`face-${id}`)).toBeTruthy();
      expect(byId(`outfit-${id}`)).toBeTruthy();
      expect(byId('leg-left')).toBeTruthy();
      expect(byId('leg-right')).toBeTruthy();
      expect(byId('tail')).toBeTruthy();
    }
  });

  it('keeps the agreed shared proportions, feet pivot and cup grip', () => {
    expect(NYANG_RIG).toMatchObject({
      height: 200, headHeight: 104, torsoHeight: 78, legHeight: 18,
      pivotX: 0, pivotY: 0, legLeftX: -25, legRightX: 25, cupX: 64, cupY: -60,
    });
  });

  it('uses the approved veteran atlas, not the old flat cat parts', async () => {
    const id = 'veteran';
    await render(<Svg><NyangCharacter frame={frame()} characterId={id} reduceMotion={false} /></Svg>);
    expect(byId('veteran-sprite')).toBeTruthy();
    expect(byId('veteran-atlas')).toBeTruthy();
    expect(byId('veteran-atlas-shift')).toBeTruthy();
    expect(screen.queryByTestId('head-contour', hidden)).toBeNull();
    expect(screen.queryByTestId('outfit-veteran', hidden)).toBeNull();
  });

  it('matches the initial .30-second alternating footstep cadence with a bounded distance-only phase', () => {
    expect(NYANG_WALK.metersPerCycle / (2 * BALANCE.baseSpeedMps)).toBeCloseTo(0.30);
    expect(walkPhaseAt(0)).toBe(0);
    expect(walkPhaseAt(NYANG_WALK.metersPerCycle / 4)).toBeCloseTo(Math.PI / 2);
    expect(walkPhaseAt(NYANG_WALK.metersPerCycle)).toBeCloseTo(0);
    for (const distance of [100, 10000, Number.MAX_VALUE]) {
      expect(walkPhaseAt(distance)).toBeGreaterThanOrEqual(0);
      expect(walkPhaseAt(distance)).toBeLessThan(Math.PI * 2);
    }
    for (const value of [-1, NaN, Infinity]) expect(walkPhaseAt(value)).toBe(0);
  });

  it.each([
    { distanceM: NYANG_WALK.metersPerCycle / 4, stride: 1 },
    { distanceM: NYANG_WALK.metersPerCycle * 3 / 4, stride: -1 },
  ])('walks the rookie rightward with alternating 22-degree hip swings ($distanceM m)', async ({ distanceM, stride }) => {
    await mountScene(frame({ distanceM }));
    // leg-left is the far leg, leg-right the near leg; +x is the walking direction.
    for (const [id, degrees, hipX, lift] of [
      ['leg-left', 22 * stride, -12, Math.max(0, stride) * 8],
      ['leg-right', -22 * stride, 16, Math.max(0, -stride) * 8],
    ] as const) {
      const props = byId(id).props.jestAnimatedProps.value;
      const matrix = props.matrix ?? props.transform;
      expect(matrix[1]).toBeCloseTo(Math.sin(degrees * Math.PI / 180));
      expect(matrix[4]).toBe(hipX);
      expect(matrix[5]).toBeCloseTo(-95 - lift);
    }
  });

  it('uses the four approved veteran frames in numeric order', async () => {
    await render(<Svg><NyangCharacter frame={frame({ distanceM: NYANG_WALK.metersPerCycle / 4 })} characterId="veteran" reduceMotion /></Svg>);
    const props = byId('veteran-atlas-shift').props.jestAnimatedProps.value;
    const matrix = props.matrix ?? props.transform;
    expect(matrix[4]).toBe(-380);
  });

  it('cycles through all four supplied diligent poses by distance without mutating the game frame', async () => {
    const sample = frame({ distanceM: NYANG_WALK.metersPerCycle / 8 });
    const rendered = await render(<Svg><NyangCharacter frame={sample} characterId="diligent" reduceMotion /></Svg>);
    for (let index = 0; index < 4; index++) {
      const next = { ...sample.value, distanceM: NYANG_WALK.metersPerCycle * (index * 2 + 1) / 8 };
      await act(() => { sample.value = next; });
      await waitFor(() => {
        const props = byId('diligent-atlas-shift').props.jestAnimatedProps.value;
        expect((props.matrix ?? props.transform)[4]).toBe(-index * 380);
      });
      expect(sample.value).toEqual(next);
    }
    await rendered.unmount();
  });

  it('shows the diligent falling expression while paused and reuses the shared fall/protection cues', async () => {
    const sample = frame({ distanceM: NYANG_WALK.metersPerCycle * 3 / 4,
      playing: false, fallen: true, angleRad: 65 * Math.PI / 180, protectionSeconds: 1 });
    const original = { ...sample.value };
    await render(<Svg><NyangCharacter frame={sample} characterId="diligent" reduceMotion /></Svg>);
    const props = byId('diligent-atlas-shift').props.jestAnimatedProps.value;
    expect((props.matrix ?? props.transform)[4]).toBe(-5 * 380);
    expect(byId('protection-outline')).toHaveAnimatedProps({ opacity: 0.5 });
    const root = byId('nyang-root').props.jestAnimatedProps.value;
    expect((root.matrix ?? root.transform)[1]).toBeCloseTo(Math.sin(82 * Math.PI / 180));
    expect(sample.value).toEqual(original);
  });

  it.each([-1, 1])('shows the diligent worried expression at the shared danger angle (%s)', async direction => {
    const sample = frame({ angleRad: direction * 40 * Math.PI / 180 });
    await render(<Svg><NyangCharacter frame={sample} characterId="diligent" reduceMotion /></Svg>);
    const atlasX = () => {
      const props = byId('diligent-atlas-shift').props.jestAnimatedProps.value;
      return (props.matrix ?? props.transform)[4];
    };
    expect(atlasX()).toBe(-4 * 380);
    await act(() => { sample.value = { ...sample.value, angleRad: 0 }; });
    await waitFor(() => expect(atlasX()).toBeCloseTo(0));
  });

  it('restores the current walking pose after a diligent revive', async () => {
    const sample = frame({ distanceM: NYANG_WALK.metersPerCycle * 7 / 8 });
    await render(<Svg><NyangCharacter frame={sample} characterId="diligent" reduceMotion /></Svg>);
    const before = { ...sample.value };
    const atlasX = () => {
      const props = byId('diligent-atlas-shift').props.jestAnimatedProps.value;
      return (props.matrix ?? props.transform)[4];
    };
    expect(atlasX()).toBe(-3 * 380);
    await act(() => { sample.value = { ...sample.value, fallen: true }; });
    await waitFor(() => {
      expect(atlasX()).toBe(-5 * 380);
    });
    await act(() => { sample.value = { ...sample.value, fallen: false }; });
    await waitFor(() => {
      expect(atlasX()).toBe(-3 * 380);
    });
    expect(sample.value).toEqual(before);
  });

  it.each([false, true])('uses engine coffee state, not a duplicate score threshold (%s)', async hasCoffee => {
    const sample = frame({ distanceM: hasCoffee ? 14.9 : 15, hasCoffee });
    await mountScene(sample);
    expect(byId('cup-visibility')).toHaveAnimatedProps({ opacity: hasCoffee ? 1 : 0 });
    expect(byId('cup').props.transform).toBe(ROOKIE_CUP);
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
      if (id === 'diligent' || id === 'veteran') expect(byId(`${id}-sprite`)).toBeTruthy();
      else {
        expect(byId(`face-${id}`)).toBeTruthy();
        expect(byId(`outfit-${id}`)).toBeTruthy();
      }
      expect(byId('cup').props.transform).toBe(id === 'rookie' ? ROOKIE_CUP : 'translate(64 -60)');
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
      expect((cafe.matrix ?? cafe.transform)[4]).toBe(270 + (15 - 52) * 120);
      expect((entrance.matrix ?? entrance.transform)[4]).toBe(270 + (50.5 - 52) * 120);
      expect(byId('office-scene')).toHaveAnimatedProps({ opacity: 1 });
      expect(byId('cup-visibility')).toHaveAnimatedProps({ opacity: 1 });
      expect(byId('empty-hand')).toHaveAnimatedProps({ opacity: 0 });
      expect(byId('protection-outline')).toHaveAnimatedProps({ opacity: 0.5 });
      const root = byId('nyang-root').props.jestAnimatedProps.value;
      expect((root.matrix ?? root.transform)[1]).toBeCloseTo(Math.sin(Math.PI / 3));
      const left = byId('leg-left').props.jestAnimatedProps.value;
      expect((left.matrix ?? left.transform)[1]).toBeCloseTo(Math.sin(22 * Math.sin(walkPhaseAt(52)) * Math.PI / 180));
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
