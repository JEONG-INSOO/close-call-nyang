import assert from 'node:assert/strict';
import { revivedCheckpoint } from '../reviveCheckpoint.ts';
import { verifyChunk } from '../verifyProof.ts';
import { createInitialState, transition } from '../game/engine.ts';
import { BALANCE } from '../game/balance.ts';

Deno.test('server revival preserves verified distance, resets tick origin, and permits only linked replay', () => {
  const flags = { mockAdsEnabled: false };
  let parent = transition(createInitialState(), { type: 'START', runId: 7, seed: 42 }, flags).state;
  for (let i = 0; i < 360; i++) parent = transition(parent, { type: 'TICK', dt: BALANCE.fixedDt, input: { left: false, right: false } }, flags).state;
  while (parent.screen === 'playing') parent = transition(parent, { type: 'TICK', dt: BALANCE.fixedDt, input: { left: false, right: true } }, flags).state;
  const initial = revivedCheckpoint(parent);
  assert.equal(initial.screen, 'playing');
  assert.equal(initial.run!.distanceM, parent.run!.distanceM);
  assert.equal(initial.run!.elapsedSeconds, parent.run!.elapsedSeconds);
  assert.equal(initial.run!.stepIndex, 0);
  assert.equal(initial.run!.protectionSeconds, 1.5);
  assert.equal(initial.run!.reviveUsed, true);
  assert.throws(() => verifyChunk(initial, [{ direction: 0, ticks: 1 }]));
  const verified = verifyChunk(initial, [{ direction: 0, ticks: 120 }], { allowRevival: true });
  assert.equal(verified.ticks, 120);
  assert.ok(verified.state.run!.distanceM > parent.run!.distanceM);
  assert.throws(() => revivedCheckpoint({ ...verified.state, screen: 'result' }));
});
