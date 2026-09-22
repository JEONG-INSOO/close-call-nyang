import { BALANCE } from '../game/balance';

/** Presentation-only poses. The engine continues to supply the unmodified frame. */
export type EmployeePose = 'game' | 'walk' | 'run';

/** One left/right cycle is two initial footstep intervals; distance speeds it up. */
export const NYANG_WALK = Object.freeze({
  metersPerCycle: 2 * BALANCE.baseSpeedMps * BALANCE.footstepBaseSeconds,
  strideDegrees: 11, lateralTravel: 2, lift: 5,
});

export function walkPhaseAt(distanceM: number): number {
  'worklet';
  if (!Number.isFinite(distanceM) || distanceM <= 0) return 0;
  // Bound before multiplying so long runs never send infinity into SVG props.
  return (distanceM % NYANG_WALK.metersPerCycle) / NYANG_WALK.metersPerCycle * Math.PI * 2;
}

// Worklet dependencies must be initialized before capture (keep below walkPhaseAt).
export function strideFor(pose: EmployeePose, distance: number): number {
  'worklet';
  return pose === 'run' ? 1 : pose === 'walk' ? 0.85 : Math.sin(walkPhaseAt(distance));
}
