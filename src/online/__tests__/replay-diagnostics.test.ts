import { createHash } from 'node:crypto';
import { runReplayDiagnostics } from '../__dev__/RankedReplayDiagnostics';
import { RULES_VERSION } from '../rulesVersion';
import fixtures from '../../../test-fixtures/ranked-replays.json';

jest.mock('expo-crypto', () => ({ CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn(async (_algorithm: string, input: string) =>
    require('node:crypto').createHash('sha256').update(input).digest('hex')) }));

test('development diagnostic reports matching hashes without session or proof payloads', async () => {
  const rows = await runReplayDiagnostics();
  expect(rows).toHaveLength(3);
  expect(rows.every(row => row.passed && row.rulesVersion === RULES_VERSION)).toBe(true);
  expect(rows.map(row => row.fixtureId)).toEqual(fixtures.cases.map(fixture => fixture.name));
  expect(rows.map(row => row.fallTick)).toEqual(fixtures.cases.map(fixture => fixture.expected.ticks));
  expect(rows.map(row => row.digest)).toEqual(fixtures.cases.map(fixture => fixture.expected.stateDigest));
  expect(Object.keys(rows[0]).sort()).toEqual(['digest', 'fallTick', 'fixtureId', 'passed', 'rulesVersion', 'runtime']);
  expect(rows[0].digest).not.toBe(createHash('sha256').update('').digest('hex'));
});
