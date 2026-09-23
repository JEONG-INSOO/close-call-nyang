import { BALANCE } from './balance';
import { stableLog1p } from './deterministicMath';
import { nextRandom } from './random';
import type { Difficulty, Stage } from './types';

function safeDistance(distanceM: number): number {
  return Number.isFinite(distanceM) ? Math.max(0, distanceM) : 0;
}

export function scoreOf(distanceM: number): number {
  return Math.floor(safeDistance(distanceM));
}

export function stageOf(distanceM: number): Stage {
  return safeDistance(distanceM) >= 51 ? 'office' : 'street';
}

export function speedAt(distanceM: number): number {
  const acceleratedDistance = Math.max(0, safeDistance(distanceM) - 15);
  return BALANCE.baseSpeedMps * (1 + 0.7 * stableLog1p(acceleratedDistance / 85));
}

export function difficultyAt(distanceM: number): Difficulty {
  const distance = safeDistance(distanceM);
  const level = stableLog1p(Math.max(0, distance - 15) / 35);
  return {
    level,
    speedMps: speedAt(distance),
    instability: 7.6 + 1.1 * level,
    disturbance: 1.8 + 0.32 * level,
    eventStrength: 1.6 + 0.65 * level,
    eventIntervalSeconds: Math.max(4, 6 / (1 + 0.3 * level)),
  };
}

/** After coffee, the drift waveform itself cycles faster as distance rises. */
export function driftRateAt(distanceM: number): number {
  const distance = safeDistance(distanceM);
  const level = stableLog1p(Math.max(0, distance - 15) / 35);
  return 1 + Math.min(1.8, 0.85 * level);
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}

/** First three active seconds are gentle; full pressure arrives continuously at five. */
export function adaptationAt(elapsedSeconds: number): number {
  const time = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
  return smoothstep(Math.max(0, Math.min(1, (time - 3) / 2)));
}

function signedSample(seed: number, index: number, salt: number): number {
  const mixed = (seed >>> 0) ^ Math.imul(index, 0x9e3779b9) ^ salt;
  return nextRandom(nextRandom(mixed).state ^ 0x85ebca6b).value * 2 - 1;
}

function noiseAt(time: number, seed: number, period: number, salt: number): number {
  const position = time / period;
  const index = Math.floor(position);
  // Past the representable clock range the engine retains its last finite checkpoint.
  if (!Number.isSafeInteger(index)) return 0;
  const fraction = smoothstep(position - index);
  const left = signedSample(seed, index, salt);
  const right = signedSample(seed, index + 1, salt);
  return left + (right - left) * fraction;
}

/** Stateless bounded drift: it never consumes the separate event RNG stream. */
export function balanceDrift(elapsedSeconds: number, seed: number, distanceM = 0): number {
  const time = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
  const normalizedSeed = Number.isFinite(seed) ? seed >>> 0 : 1;
  const rate = driftRateAt(distanceM);
  const pressureTime = time * rate;
  return 0.65 * noiseAt(pressureTime, normalizedSeed, 0.8, 0x243f6a88)
    + 0.35 * noiseAt(pressureTime, normalizedSeed, 1.15, 0xb7e15162);
}
