import { createRunRecorder } from '../runRecorder';
import { RULES_VERSION } from '../rulesVersion';
import type { RankedRun } from '../contracts';
import { createGameController } from '../../game/controller';
import { createInitialState, transition } from '../../game/engine';
import { BALANCE } from '../../game/balance';

const run: RankedRun = { runId: 'a1111111-1111-4111-8111-111111111111', engineRunId: 19,
  seed: 7, rulesVersion: RULES_VERSION, issuedAt: '2026-09-22T00:00:00.000Z', expiresAt: '2026-09-23T00:00:00.000Z' };

describe('canonical fixed tick recorder', () => {
  test('merges equal directions, caps chunks at 1200 and flushes the last partial falling tick', () => {
    const recorder = createRunRecorder(run);
    for (let tickIndex = 1; tickIndex <= 1205; tickIndex += 1) {
      recorder.record({ runId: 19, tickIndex, direction: tickIndex <= 1000 ? 0 : tickIndex <= 1200 ? -1 : 1,
        terminal: tickIndex === 1205 });
    }
    expect(recorder.takeChunk()).toEqual({ runId: run.runId, seq: 0, spans: [{ direction: 0, ticks: 1000 }, { direction: -1, ticks: 200 }] });
    expect(recorder.takeChunk()).toEqual({ runId: run.runId, seq: 1, spans: [{ direction: 1, ticks: 5 }] });
    expect(recorder.takeChunk()).toBeNull();
    expect(() => recorder.record({ runId: 19, tickIndex: 1206, direction: 0, terminal: false })).toThrow();
  });
  test('full terminal chunk does not emit an empty extra chunk', () => {
    const recorder = createRunRecorder(run);
    for (let tickIndex = 1; tickIndex <= 1200; tickIndex += 1) recorder.record({ runId: 19, tickIndex, direction: 0, terminal: tickIndex === 1200 });
    expect(recorder.takeChunk()!.spans).toEqual([{ direction: 0, ticks: 1200 }]);
    recorder.finish();
    expect(recorder.takeChunk()).toBeNull();
  });
  test.each([
    { runId: 20, tickIndex: 1, direction: 0, terminal: false },
    { runId: 19, tickIndex: 0, direction: 0, terminal: false },
    { runId: 19, tickIndex: 2, direction: 0, terminal: false },
    { runId: 19, tickIndex: 1, direction: 2, terminal: false },
  ])('rejects foreign, missing or invalid authoritative ticks %p', (tick) => {
    const recorder = createRunRecorder(run);
    expect(() => recorder.record(tick as Parameters<typeof recorder.record>[0])).toThrow();
    expect(recorder.takeChunk()).toBeNull();
  });
  test('does not emit any input without playing ticks and never mutates taken chunks', () => {
    const recorder = createRunRecorder(run);
    expect(recorder.takeChunk()).toBeNull();
    recorder.record({ runId: 19, tickIndex: 1, direction: -1, terminal: true });
    const chunk = recorder.takeChunk();
    recorder.finish();
    expect(chunk).toEqual({ runId: run.runId, seq: 0, spans: [{ direction: -1, ticks: 1 }] });
  });
  test('actual controller proof reproduces the full engine result including the final partial fall step', () => {
    const flags = { mockAdsEnabled: false };
    const controller = createGameController(flags);
    const recorder = createRunRecorder(run);
    controller.subscribeTicks(recorder.record);
    controller.dispatch({ type: 'START', runId: run.engineRunId, seed: run.seed });
    controller.advanceFrame(0);
    for (let frame = 1; frame <= 30; frame += 1) controller.advanceFrame(frame * 100);
    controller.setInput('touch', 'right', 1, true);
    for (let frame = 31; frame < 100 && controller.readState().screen === 'playing'; frame += 1) controller.advanceFrame(frame * 100);
    expect(controller.readState().screen).toBe('result');
    let replay = transition(createInitialState(), { type: 'START', runId: run.engineRunId, seed: run.seed }, flags).state;
    for (let tick = 0; tick < 360; tick += 1) replay = transition(replay, {
      type: 'TICK', dt: BALANCE.fixedDt, input: { left: false, right: false },
    }, flags).state;
    let chunk = recorder.takeChunk(); let observedTicks = 0;
    while (chunk) {
      for (const span of chunk.spans) for (let tick = 0; tick < span.ticks; tick += 1) {
        observedTicks += 1;
        replay = transition(replay, { type: 'TICK', dt: BALANCE.fixedDt,
          input: { left: span.direction === -1, right: span.direction === 1 } }, flags).state;
      }
      chunk = recorder.takeChunk();
    }
    expect(observedTicks).toBe(controller.readState().run!.stepIndex);
    expect(replay).toEqual(controller.readState());
    controller.dispose();
  });
});
