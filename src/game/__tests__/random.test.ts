import { nextRandom } from '../random';

function statesFrom(seed: number, count: number): number[] {
  const states: number[] = [];
  let state = seed;
  for (let i = 0; i < count; i += 1) {
    state = nextRandom(state).state;
    states.push(state);
  }
  return states;
}

describe('explicit-state xorshift32', () => {
  test('matches the unsigned 13/17/5 golden sequence for seed 1', () => {
    expect(statesFrom(1, 5)).toEqual([270369, 67634689, 2647435461, 307599695, 2398689233]);
  });

  test('zero seeds are normalized to one, avoiding an absorbing zero state', () => {
    expect(statesFrom(0, 32)).toEqual(statesFrom(1, 32));
  });

  test('same seed replays exactly while a different seed produces another sequence', () => {
    expect(statesFrom(123456789, 64)).toEqual(statesFrom(123456789, 64));
    expect(statesFrom(123456789, 64)).not.toEqual(statesFrom(123456788, 64));
  });

  test.each([1, 42, 0xffffffff])('seed %s always returns a uint32 and a sample in [0,1)', (seed) => {
    let state = seed;
    for (let i = 0; i < 1000; i += 1) {
      const sample = nextRandom(state);
      expect(Number.isInteger(sample.state)).toBe(true);
      expect(sample.state).toBeGreaterThan(0);
      expect(sample.state).toBeLessThanOrEqual(0xffffffff);
      expect(sample.value).toBeGreaterThanOrEqual(0);
      expect(sample.value).toBeLessThan(1);
      expect(sample.value).toBe(sample.state / 4294967296);
      state = sample.state;
    }
  });

  test('numeric coercion remains deterministic even for invalid numeric inputs', () => {
    expect(nextRandom(-1)).toEqual(nextRandom(0xffffffff));
    expect(nextRandom(4294967297)).toEqual(nextRandom(1));
    expect(nextRandom(1.9)).toEqual(nextRandom(1));
    for (const input of [NaN, Infinity, -Infinity]) {
      expect(nextRandom(input)).toEqual(nextRandom(1));
    }
  });
});
