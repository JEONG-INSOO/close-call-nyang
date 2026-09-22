import fixtures from '../../../../test-fixtures/ranked-replays.json' with { type: 'json' };
import { BALANCE } from '../game/balance.ts';
import { createInitialState, transition } from '../game/engine.ts';
import { difficultyAt } from '../game/difficulty.ts';
import { stableSin } from '../game/deterministicMath.ts';
import { RULES_VERSION } from '../game/rulesVersion.ts';
import type { GameState } from '../game/types.ts';
import { ProofValidationError, verifyChunk, type InputSpan } from '../verifyProof.ts';

function assert(condition: unknown, message = 'Assertion failed'): asserts condition {
  if (!condition) throw new Error(message);
}
function equal(actual: unknown, expected: unknown): void {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function rejects(callback: () => unknown): void {
  let caught: unknown;
  try { callback(); } catch (error) { caught = error; }
  assert(caught instanceof ProofValidationError, 'Expected a safe proof validation error');
  equal(caught.code, 'PROOF_REJECTED');
}
function start(seed = 42, runId = 1): GameState {
  const flags = { mockAdsEnabled: false };
  let state = transition(createInitialState(), { type: 'START', seed, runId }, flags).state;
  for (let tick = 0; tick < 360; tick += 1) {
    state = transition(state, {
      type: 'TICK', dt: BALANCE.fixedDt, input: { left: false, right: false },
    }, flags).state;
  }
  assert(state.screen === 'playing');
  return state;
}

function boundedChunks(spans: readonly InputSpan[], limit: number): InputSpan[][] {
  const chunks: InputSpan[][] = [];
  let current: InputSpan[] = [];
  let size = 0;
  for (const span of spans) {
    let remaining = span.ticks;
    while (remaining > 0) {
      const count = Math.min(remaining, limit - size);
      current.push({ direction: span.direction, ticks: count });
      remaining -= count;
      size += count;
      if (size === limit) { chunks.push(current); current = []; size = 0; }
    }
  }
  if (current.length) chunks.push(current);
  return chunks;
}

Deno.test('golden rules version matches generated kernel', () => {
  equal(fixtures.rulesVersion, RULES_VERSION);
});

for (const fixture of fixtures.cases) {
  for (const size of [137, 1200]) {
    Deno.test(`Deno proof golden ${fixture.name}, chunks <= ${size}`, async () => {
      let state = start(fixture.seed, fixture.engineRunId);
      let ticks = 0;
      let terminal = false;
      for (const spans of boundedChunks(fixture.spans as InputSpan[], size)) {
        assert(!terminal, 'No proof accepted after terminal checkpoint');
        const next = verifyChunk(state, spans);
        state = next.state;
        ticks += next.ticks;
        terminal = next.terminal;
      }
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(state)));
      const digest = [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
      equal(digest, fixture.expected.stateDigest);
      equal(ticks, fixture.expected.ticks);
      equal(terminal, fixture.expected.terminal);
      equal(Math.floor(state.run!.distanceM), fixture.expected.score);
      equal(state.run!.hasCoffee, fixture.expected.hasCoffee);
    });
  }
}

Deno.test('rejects malformed, empty, oversized, fractional and injected spans', () => {
  const invalid: unknown[] = [
    null, {}, [], [{ direction: 2, ticks: 1 }], [{ direction: '1', ticks: 1 }],
    [{ direction: 0, ticks: 0 }], [{ direction: 0, ticks: -1 }], [{ direction: 0, ticks: 1.5 }],
    [{ direction: 0, ticks: NaN }], [{ direction: 0, ticks: Infinity }],
    [{ direction: 0, ticks: 1201 }], [{ direction: 0, ticks: 1200 }, { direction: 1, ticks: 1 }],
    Array.from({ length: 1201 }, () => ({ direction: 0, ticks: 1 })),
    [{ direction: 0, ticks: 1, score: 999 }], [{ type: 'REQUEST_AD', ticks: 1 }],
    [{ direction: 0 }], [null], [1], [[0, 1]],
  ];
  const state = start();
  const snapshot = JSON.stringify(state);
  for (const spans of invalid) rejects(() => verifyChunk(state, spans as InputSpan[]));
  equal(JSON.stringify(state), snapshot);
});

Deno.test('accepts canonical-equivalent span boundaries without mutating inputs or checkpoint', () => {
  const checkpoint = start();
  Object.freeze(checkpoint.run);
  Object.freeze(checkpoint);
  const spans = Object.freeze([Object.freeze({ direction: 0 as const, ticks: 2 })]);
  const combined = verifyChunk(checkpoint, spans);
  const split = verifyChunk(checkpoint, [{ direction: 0, ticks: 1 }, { direction: 0, ticks: 1 }]);
  equal(combined, split);
  equal(checkpoint.run!.stepIndex, 0);
  equal(combined.ticks, 2);
  equal(combined.terminal, false);
});

Deno.test('the first fall must be the last tick, and cannot be replayed after terminal', () => {
  const fixture = fixtures.cases[1];
  const state = start(fixture.seed, fixture.engineRunId);
  const valid = verifyChunk(state, fixture.spans as InputSpan[]);
  assert(valid.terminal);
  rejects(() => verifyChunk(state, [{ direction: 1, ticks: fixture.expected.ticks + 1 }]));
  rejects(() => verifyChunk(valid.state, [{ direction: 0, ticks: 1 }]));
  rejects(() => verifyChunk(state, [...fixture.spans as InputSpan[], { direction: 0, ticks: 1 }]));
});

Deno.test('a valid tick landing on the rounded critical angle can be finalized', () => {
  const state = start();
  const angleRad = 0.69;
  const target = 0.6999999998;
  const difficulty = difficultyAt(0);
  const phase = 42 / 1000;
  const accelerationWithoutDamping = difficulty.instability * stableSin(angleRad)
    + difficulty.disturbance * (stableSin(phase) + 0.35 * stableSin(phase));
  const angularVelocity = ((target - angleRad) / BALANCE.fixedDt
    - accelerationWithoutDamping * BALANCE.fixedDt) / (1 - BALANCE.damping * BALANCE.fixedDt);
  const checkpoint = { ...state, run: { ...state.run!, angleRad, angularVelocity,
    distanceM: 14.9999999998 - difficulty.speedMps * BALANCE.fixedDt } };
  const result = verifyChunk(checkpoint, [{ direction: 0, ticks: 1 }]);
  equal(result.terminal, true);
  equal(result.ticks, 1);
  equal(result.state.run!.angleRad, BALANCE.criticalAngleRad);
  equal(result.state.run!.stepIndex, 1);
  equal(result.state.run!.distanceM, 15);
  equal(result.state.run!.hasCoffee, true);
});

Deno.test('rounded cafe checkpoint grants coffee on the same proof tick', () => {
  const state = start();
  const checkpoint = { ...state, run: { ...state.run!,
    distanceM: 14.9999999998 - BALANCE.baseSpeedMps * BALANCE.fixedDt } };
  const result = verifyChunk(checkpoint, [{ direction: 0, ticks: 1 }]);
  equal(result.terminal, false);
  equal(result.state.run!.distanceM, 15);
  equal(result.state.run!.hasCoffee, true);
  equal(result.state.run!.nextEventAt, result.state.run!.elapsedSeconds + 6);
});

Deno.test('ranked checkpoints never accept protection, revival, malformed state or numeric exhaustion', () => {
  const initial = start();
  for (const patch of [
    { reviveUsed: true }, { protectionSeconds: 1.5 }, { distanceM: NaN },
    { distanceM: Number.MAX_VALUE }, { elapsedSeconds: Number.MAX_VALUE },
    { stepIndex: Number.MAX_SAFE_INTEGER }, { seed: 0 }, { id: -1 }, { rng: -1 },
    { event: { id: 'coffeeRush', phase: 'active', direction: 1, remainingSeconds: 0.5, strength: Infinity } },
  ]) {
    const state = { ...initial, run: { ...initial.run!, ...patch } } as GameState;
    rejects(() => verifyChunk(state, [{ direction: 0, ticks: 1 }]));
  }
  for (const screen of ['title', 'paused', 'countdown', 'ad', 'result'] as const) {
    rejects(() => verifyChunk({ ...initial, screen }, [{ direction: 0, ticks: 1 }]));
  }
  rejects(() => verifyChunk(createInitialState(), [{ direction: 0, ticks: 1 }]));
});
