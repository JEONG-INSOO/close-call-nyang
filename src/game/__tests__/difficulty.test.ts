import { BALANCE } from '../balance';
import { difficultyAt, scoreOf, speedAt, stageOf } from '../difficulty';

describe('distance milestones', () => {
  test.each([
    [-1, 0],
    [0, 0],
    [14.999, 14],
    [15, 15],
    [50.999, 50],
    [51, 51],
    [99.999, 99],
    [100, 100],
    [102.9, 102],
    [1000.8, 1000],
  ])('scoreOf(%s) floors to %s without a 100%% ceiling', (distance, score) => {
    expect(scoreOf(distance)).toBe(score);
  });

  test.each([0, 15, 50, 50.999999])('distance %s is still the street', (distance) => {
    expect(stageOf(distance)).toBe('street');
  });

  test.each([51, 51.000001, 100, 1000])('distance %s is the office', (distance) => {
    expect(stageOf(distance)).toBe('office');
  });

  test.each([NaN, Infinity, -Infinity, -100])('invalid distance %s uses safe zero', (distance) => {
    expect(scoreOf(distance)).toBe(0);
    expect(stageOf(distance)).toBe('street');
    expect(speedAt(distance)).toBe(speedAt(0));
    expect(difficultyAt(distance)).toEqual(difficultyAt(0));
  });
});

describe('initial difficulty tuning', () => {
  test('the initial curve is flat through the exact 15 meter boundary', () => {
    const initial = {
      level: 0,
      speedMps: BALANCE.baseSpeedMps,
      instability: 2.2,
      disturbance: 0.12,
      eventStrength: 0.8,
      eventIntervalSeconds: 10,
    };
    for (const distance of [0, 14.999999, 15]) {
      expect(difficultyAt(distance)).toEqual(initial);
    }
    expect(difficultyAt(15.000001).level).toBeGreaterThan(0);
    expect(speedAt(15.000001)).toBeGreaterThan(BALANCE.baseSpeedMps);
  });

  test.each([15, 50, 100, 200, 1000])('distance %s follows the documented formulas', (distance) => {
    const extra = Math.max(0, distance - 15);
    const level = Math.log1p(extra / 35);
    const expected = {
      level,
      speedMps: BALANCE.baseSpeedMps * (1 + 0.7 * Math.log1p(extra / 85)),
      instability: 2.2 + 0.9 * level,
      disturbance: 0.12 + 0.16 * level,
      eventStrength: 0.8 + 0.5 * level,
      eventIntervalSeconds: Math.max(5, 10 / (1 + 0.2 * level)),
    };
    const actual = difficultyAt(distance);
    // The explicit log series preserves tuning to floating-point precision.
    for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
      expect(actual[key]).toBeCloseTo(expected[key], 12);
    }
  });

  test('speed and force continue rising beyond 100 and 200 without a gameplay cap', () => {
    const points = [15, 50, 100, 200, 1000, 1e10, Number.MAX_VALUE].map(difficultyAt);
    for (let i = 1; i < points.length; i += 1) {
      const previous = points[i - 1];
      const current = points[i];
      for (const key of ['level', 'speedMps', 'instability', 'disturbance', 'eventStrength'] as const) {
        expect(current[key]).toBeGreaterThan(previous[key]);
      }
      expect(current.eventIntervalSeconds).toBeLessThanOrEqual(previous.eventIntervalSeconds);
      expect(current.eventIntervalSeconds).toBeGreaterThanOrEqual(5);
      expect(Object.values(current).every(Number.isFinite)).toBe(true);
    }
    expect(points[points.length - 1].eventIntervalSeconds).toBe(5);
  });

  test('speed-only fixed-step integration reaches 100 meters in 90 ± 0.5 active seconds', () => {
    let distance = 0;
    let elapsed = 0;
    while (distance < 100 && elapsed < 120) {
      distance += speedAt(distance) * BALANCE.fixedDt;
      elapsed += BALANCE.fixedDt;
    }
    expect(distance).toBeGreaterThanOrEqual(100);
    expect(elapsed).toBeGreaterThanOrEqual(89.5);
    expect(elapsed).toBeLessThanOrEqual(90.5);
  });
});
