import { useState } from 'react';
import { Platform, Pressable, ScrollView, Text } from 'react-native';
import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';
import fixtures from '../../../test-fixtures/ranked-replays.json';
import { BALANCE } from '../../game/balance';
import { createInitialState, transition } from '../../game/engine';
import { RULES_VERSION } from '../rulesVersion';

export interface ReplayDiagnostic {
  fixtureId: string; rulesVersion: string; digest: string; fallTick: number;
  runtime: 'hermes' | 'browser' | 'other'; passed: boolean;
}
export async function runReplayDiagnostics(): Promise<ReplayDiagnostic[]> {
  const runtime = 'HermesInternal' in globalThis ? 'hermes' : Platform.OS === 'web' ? 'browser' : 'other';
  const results: ReplayDiagnostic[] = [];
  for (const fixture of fixtures.cases) {
    let state = transition(createInitialState(), { type: 'START', seed: fixture.seed, runId: fixture.engineRunId }, { mockAdsEnabled: false }).state;
    for (let tick = 0; tick < 360; tick += 1) state = transition(state,
      { type: 'TICK', dt: BALANCE.fixedDt, input: { left: false, right: false } }, { mockAdsEnabled: false }).state;
    let fallTick = 0;
    for (const span of fixture.spans) {
      for (let tick = 0; tick < span.ticks; tick += 1) {
        if (state.screen !== 'playing') throw new Error('진단 입력의 종료 경계가 맞지 않습니다.');
        state = transition(state, { type: 'TICK', dt: BALANCE.fixedDt,
          input: { left: span.direction === -1, right: span.direction === 1 } }, { mockAdsEnabled: false }).state;
        fallTick += 1;
      }
    }
    const digest = await digestStringAsync(CryptoDigestAlgorithm.SHA256, JSON.stringify(state));
    results.push({ fixtureId: fixture.name, rulesVersion: RULES_VERSION, digest, fallTick, runtime,
      passed: fixtures.rulesVersion === RULES_VERSION && state.screen === 'result' &&
        fallTick === fixture.expected.ticks && digest === fixture.expected.stateDigest });
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
  return results;
}
export function RankedReplayDiagnostics(): React.JSX.Element {
  const [rows, setRows] = useState<ReplayDiagnostic[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
    <Text>개발용 합성 재현 검사 — 실제 플레이·서버 연결 증거 아님</Text>
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => {
      setBusy(true); setError(false);
      void runReplayDiagnostics().then(setRows).catch(() => setError(true)).finally(() => setBusy(false));
    }} style={{ padding: 16 }}><Text>{busy ? '검사 중…' : '현재 런타임 검사'}</Text></Pressable>
    {error && <Text>검사를 완료하지 못했습니다.</Text>}
    {rows.map(row => <Text selectable key={row.fixtureId}>{JSON.stringify(row)}</Text>)}
  </ScrollView>;
}
