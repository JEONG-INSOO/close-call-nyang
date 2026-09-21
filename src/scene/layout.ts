import type { SceneModel, Viewport } from './types';

const DESIGN_WIDTH = 960;
const DESIGN_HEIGHT = 540;
const CHARACTER_X = 270;
const PIXELS_PER_METER = 40;

function nonNegativeFinite(value: number): number {
  'worklet';
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function storyX(storyDistance: number, distanceM: number): number {
  'worklet';
  // An unbounded score must never send infinity into an SVG transform.
  return Math.max(-Number.MAX_VALUE, CHARACTER_X + (storyDistance - distanceM) * PIXELS_PER_METER);
}

/** Contain the complete 16:9 game board, preserving space for future controls. */
export function getViewport(width: number, height: number): Viewport {
  'worklet';
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: 0, height: 0, scale: 0, left: 0, top: 0 };
  }

  const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
  if (scale <= 0) {
    return { width: 0, height: 0, scale: 0, left: 0, top: 0 };
  }
  const containedWidth = DESIGN_WIDTH * scale;
  const containedHeight = DESIGN_HEIGHT * scale;

  return {
    width: containedWidth,
    height: containedHeight,
    scale,
    left: Math.max(0, (width - containedWidth) / 2),
    top: Math.max(0, (height - containedHeight) / 2),
  };
}

/** Narrative landmarks use the real distance, never a wrapped background offset. */
export function getSceneModel(distanceM: number): SceneModel {
  'worklet';
  const distance = nonNegativeFinite(distanceM);
  return {
    cafeX: storyX(15, distance),
    entranceX: storyX(50.5, distance),
    officeBlend: Math.min(1, Math.max(0, distance - 50)),
    stage: distance >= 51 ? 'office' : 'street',
  };
}

/** Positive scroll displacement; render a repeated layer translated by its negative. */
export function getScrollOffset(distanceM: number, parallax: number, tileWidth: number): number {
  'worklet';
  if (!Number.isFinite(tileWidth) || tileWidth <= 0) {
    return 0;
  }

  const distance = nonNegativeFinite(distanceM);
  const speed = nonNegativeFinite(parallax) * PIXELS_PER_METER;
  if (distance === 0 || speed === 0 || !Number.isFinite(speed)) {
    return 0;
  }

  const displacement = distance * speed;
  let offset: number;
  if (Number.isFinite(displacement)) {
    offset = displacement % tileWidth;
  } else {
    // Reduce in meters before multiplying when an extremely long run would overflow.
    const periodM = tileWidth / speed;
    if (!Number.isFinite(periodM) || periodM <= 0) {
      return 0;
    }
    offset = (distance % periodM) * speed;
  }

  // Rounding at enormous scales can reach the tile edge; keep the contract half-open.
  return Number.isFinite(offset) && offset > 0 && offset < tileWidth ? offset : 0;
}
