import { svgTransform } from '../svgMotion';

function adapterFor(platform: 'ios' | 'android' | 'web') {
  let adapter: typeof import('../svgMotion').svgTransformAdapter;
  jest.isolateModules(() => {
    jest.doMock('react-native', () => ({ Platform: { OS: platform } }));
    adapter = require('../svgMotion').svgTransformAdapter;
  });
  jest.dontMock('react-native');
  return adapter!;
}

describe('SVG platform motion contract', () => {
  it('preserves the local support pivot and requested translation at rest', () => {
    const matrix = svgTransform(0, 270, 425);
    expect(matrix.slice(0, 2)).toEqual([1, 0]);
    expect(matrix[2]).toBeCloseTo(0);
    expect(matrix.slice(3)).toEqual([1, 270, 425]);
  });

  it.each([-0.55, 0, 0.55])('uses the same column-major rotation for %s radians', radians => {
    const matrix = svgTransform(radians * 180 / Math.PI);
    expect(matrix[0]).toBeCloseTo(Math.cos(radians));
    expect(matrix[1]).toBeCloseTo(Math.sin(radians));
    expect(matrix[2]).toBeCloseTo(-Math.sin(radians));
    expect(matrix[3]).toBeCloseTo(Math.cos(radians));
    expect(matrix.slice(4)).toEqual([0, 0]);
    expect(matrix.every(Number.isFinite)).toBe(true);
  });

  it.each(['ios', 'android'] as const)('adapts only the transform name for %s Fabric SVG', platform => {
    const transform = svgTransform(30, -19, -36);
    const props: Record<string, unknown> = { transform, opacity: 0.5, testID: 'limb' };
    adapterFor(platform)(props);
    expect(props).toEqual({ matrix: transform, opacity: 0.5, testID: 'limb' });
    expect(props.matrix).toBe(transform);
    expect(props).not.toHaveProperty('transform');
  });

  it('leaves the SVG transform array unchanged for web', () => {
    const transform = svgTransform(-30, 58, -58);
    const props: Record<string, unknown> = { transform, opacity: 1 };
    adapterFor('web')(props);
    expect(props).toEqual({ transform, opacity: 1 });
    expect(props.transform).toBe(transform);
    expect(props).not.toHaveProperty('matrix');
  });

  it('does not reinterpret unrelated SVG props or a static transform string', () => {
    const props = { transform: 'translate(58 -58)', opacity: 0 };
    adapterFor('ios')(props);
    expect(props).toEqual({ transform: 'translate(58 -58)', opacity: 0 });
  });
});
