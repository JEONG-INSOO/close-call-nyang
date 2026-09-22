import type { PlayedTick } from '../game/controller';
import type { InputSpan, ProofChunk, RankedRun } from './contracts';

export const CHUNK_TICKS = 1200;
export interface RunRecorder {
  record(tick: PlayedTick): void;
  takeChunk(): ProofChunk | null;
  finish(): void;
}

/** Records canonical inputs, never frame time, score, paused time or cosmetics. */
export function createRunRecorder(run: RankedRun): RunRecorder {
  let nextTick = 1;
  let nextSeq = 0;
  let ticks = 0;
  let spans: InputSpan[] = [];
  let finished = false;
  const ready: ProofChunk[] = [];
  function flush(): void {
    if (ticks === 0) return;
    ready.push({ runId: run.runId, seq: nextSeq++, spans });
    spans = [];
    ticks = 0;
  }
  return {
    record(tick) {
      if (finished) throw new Error('Recording already finished');
      if (tick.runId !== run.engineRunId || tick.tickIndex !== nextTick ||
          ![-1, 0, 1].includes(tick.direction) || typeof tick.terminal !== 'boolean') {
        throw new Error('Non-contiguous or foreign playing tick');
      }
      nextTick += 1;
      const last = spans.at(-1);
      if (last?.direction === tick.direction) last.ticks += 1;
      else spans.push({ direction: tick.direction, ticks: 1 });
      ticks += 1;
      if (ticks === CHUNK_TICKS || tick.terminal) flush();
      if (tick.terminal) finished = true;
    },
    takeChunk: () => ready.shift() ?? null,
    finish() { flush(); finished = true; },
  };
}
