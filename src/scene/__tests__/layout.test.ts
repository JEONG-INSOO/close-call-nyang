import { getSceneModel, getScrollOffset, getViewport } from '../layout';

describe('contained game viewport', () => {
  it('matches the design dimensions without letterboxing', () => {
    expect(getViewport(960, 540)).toEqual({ width: 960, height: 540, scale: 1, left: 0, top: 0 });
  });

  it.each([[844, 390], [1366, 768], [390, 844]])('contains the full board in %sx%s', (width, height) => {
    const viewport = getViewport(width, height);
    expect(viewport.width / viewport.height).toBeCloseTo(16 / 9, 10);
    expect(viewport.width).toBeLessThanOrEqual(width);
    expect(viewport.height).toBeLessThanOrEqual(height);
    expect(viewport.left).toBeCloseTo((width - viewport.width) / 2, 10);
    expect(viewport.top).toBeCloseTo((height - viewport.height) / 2, 10);
    expect(viewport.scale).toBeCloseTo(Math.min(width / 960, height / 540), 10);
  });

  it.each([[0, 540], [960, 0], [-1, 540], [960, -1], [NaN, 540], [960, NaN],
    [Infinity, 540], [960, Infinity], [-Infinity, 540]])('safely empties invalid size %sx%s', (width, height) => {
    expect(getViewport(width, height)).toEqual({ width: 0, height: 0, scale: 0, left: 0, top: 0 });
  });
});

describe('distance-based story landmarks', () => {
  it('aligns the cafe with the character at exactly 15 meters', () => {
    expect(getSceneModel(14.9).cafeX).toBeCloseTo(274);
    expect(getSceneModel(15).cafeX).toBe(270);
    expect(getSceneModel(16).cafeX).toBe(230);
  });

  it.each([
    [50, 290, 0, 'street'],
    [50.5, 270, 0.5, 'street'],
    [51, 250, 1, 'office'],
    [10000, -397710, 1, 'office'],
  ])('keeps the doorway and office boundary exact at %sm', (distance, entranceX, officeBlend, stage) => {
    expect(getSceneModel(distance as number)).toMatchObject({ entranceX, officeBlend, stage });
  });

  it.each([-1, NaN, Infinity, -Infinity])('normalizes invalid distance %s', (distance) => {
    expect(getSceneModel(distance)).toEqual(getSceneModel(0));
  });

  it('keeps even maximal finite distances out of infinite SVG coordinates', () => {
    const model = getSceneModel(Number.MAX_VALUE);
    expect(Number.isFinite(model.cafeX)).toBe(true);
    expect(Number.isFinite(model.entranceX)).toBe(true);
    expect(model.stage).toBe('office');
    expect(model.officeBlend).toBe(1);
  });
});

describe('bounded repeated scenery', () => {
  it('scales physical meters by 40 pixels and the layer parallax', () => {
    expect(getScrollOffset(25, 0.2, 960)).toBe(200);
    expect(getScrollOffset(25, 1, 960)).toBe(40);
    expect(getScrollOffset(24, 1, 960)).toBe(0);
  });

  it.each([0, 15, 51, 10000, Number.MAX_SAFE_INTEGER, Number.MAX_VALUE])('bounds scroll after %sm', (distance) => {
    for (const parallax of [0, 0.1, 0.35, 1, 2, Number.MAX_VALUE]) {
      for (const tileWidth of [0.5, 540, 960, 1400, Number.MAX_VALUE]) {
        const offset = getScrollOffset(distance, parallax, tileWidth);
        expect(Number.isFinite(offset)).toBe(true);
        expect(offset).toBeGreaterThanOrEqual(0);
        expect(offset).toBeLessThan(tileWidth);
      }
    }
  });

  it.each([-1, NaN, Infinity, -Infinity])('returns zero for invalid input %s', (invalid) => {
    expect(getScrollOffset(invalid, 1, 960)).toBe(0);
    expect(getScrollOffset(100, invalid, 960)).toBe(0);
    expect(getScrollOffset(100, 1, invalid)).toBe(0);
  });

  it('returns zero for zero-width tiles', () => {
    expect(getScrollOffset(100, 1, 0)).toBe(0);
  });
});
