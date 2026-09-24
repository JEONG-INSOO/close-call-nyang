import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./sql/ranking-backup-preflight.sql', import.meta.url), 'utf8');
const sql = source.replace(/--[^\n]*/g, '');
test('backup preflight enforces read-only and never changes data or permissions', () => {
  assert.match(sql, /begin transaction read only;/);
  assert.doesNotMatch(sql, /\b(?:insert|update|delete|truncate|drop|alter|create|grant|revoke|copy)\b/i);
  assert.match(sql, /'backupOrRestoreExecuted', false/);
});
test('auth and game records are counted without returning token or identity contents', () => {
  for (const table of ['auth.users', 'auth.identities', 'auth.sessions', 'auth.refresh_tokens',
    'private.players', 'private.best_scores', 'private.runs']) {
    assert.ok(sql.includes(`select count(*) from ${table}`));
  }
  assert.doesNotMatch(sql, /select\s+\*|\b(?:access_token|encrypted_password|raw_user_meta_data)\b/i);
  assert.match(sql, /confrelid='auth\.users'::regclass/);
});
