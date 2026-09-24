import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

const schedule = readFileSync(new URL('./sql/ranking-production-retention.sql', import.meta.url), 'utf8');
const sql = schedule.replace(/--[^\n]*/g, '');
const migration = readFileSync(new URL('../supabase/migrations/202609210001_leaderboard.sql', import.meta.url), 'utf8');
test('production schedule fails closed if reviewed cleanup body changes', () => {
  const body = /create function private\.rank_cleanup\([^]*?as \$\$([^]*?)\$\$;/.exec(migration)[1];
  const digest = createHash('md5').update(body.replace(/\s+/g, ' ').trim()).digest('hex');
  assert.ok(sql.includes(`is distinct from '${digest}'`));
  assert.match(sql, /RETENTION_FUNCTION_REVIEW_REQUIRED/);
});
test('daily UTC schedule targets only the expected production job', () => {
  assert.match(sql, /begin;[\s\S]*commit;/);
  assert.match(sql, /RETENTION_REQUIRES_OWNER/);
  assert.match(sql, /RETENTION_REQUIRES_UTC_CRON/);
  assert.match(sql, /RETENTION_JOB_CONFLICT/);
  assert.match(sql, /cron\.schedule\('nyang-production-rank-cleanup', '15 3 \* \* \*',\s*'select private\.rank_cleanup\(3600\)'\)/);
  assert.doesNotMatch(sql, /\b(?:delete|truncate|drop|grant)\b/i);
  assert.equal((sql.match(/cron\.schedule\(/g) ?? []).length, 1);
});
