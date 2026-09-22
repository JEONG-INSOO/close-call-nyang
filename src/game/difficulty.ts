import { BALANCE } from './balance';
import { stableLog1p } from './deterministicMath';
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
    instability: 4.8 + 0.9 * level,
    disturbance: 0.22 + 0.16 * level,
    eventStrength: 0.8 + 0.5 * level,
    eventIntervalSeconds: Math.max(5, 10 / (1 + 0.2 * level)),
  };
}
