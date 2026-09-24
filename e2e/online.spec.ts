import { test, expect, type Page } from '@playwright/test';
import { RULES_VERSION } from '../src/online/rulesVersion';

const ORIGIN = 'https://nyang-ranking-fixture.invalid';
const APP = 'http://127.0.0.1:4175/close-call-nyang/';
const USER = 'a0000000-0000-4000-8000-000000000001';
const ME = 'b0000000-0000-4000-8000-000000000001';
const OTHER = 'b0000000-0000-4000-8000-000000000002';
const SECOND = 'b0000000-0000-4000-8000-000000000003';
const RUN = 'c0000000-0000-4000-8000-000000000001';
async function simulatedApi(page: Page) {
  let nickname: string | null = null; let signupCount = 0; let reported: unknown = null;
  let failDelete = false; let failStart = false; let deleted = false; let ticks = 0;
  const errors: string[] = []; const writes: string[] = [];
  const timestamp = () => new Date().toISOString();
  const profile = () => nickname ? { publicId: ME, nickname, updatedAt: timestamp() } : null;
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (request.url().startsWith(ORIGIN) && request.method() !== 'GET') writes.push(new URL(request.url()).pathname);
  });
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const label = document.createElement('div'); label.textContent = 'SIMULATED API — 실제 서버/iPhone 증거 아님';
      label.style.cssText = 'position:fixed;top:0;left:0;z-index:2147483647;font:10px sans-serif;color:#222;background:#ffeeb7;pointer-events:none';
      document.body.append(label);
    });
  });
  await page.route(`${ORIGIN}/**`, async route => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    const body = request.postDataJSON();
    const reply = (value: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }, body: JSON.stringify(value) });
    if (request.method() === 'OPTIONS') { await reply({}); return; }
    if (path === '/auth/v1/signup') {
      signupCount += 1;
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: USER, exp, role: 'authenticated', aud: 'authenticated' })).toString('base64url')}.simulated_signature`;
      await reply({ access_token: token, token_type: 'bearer', expires_in: 3600, expires_at: exp,
        refresh_token: 'simulated_refresh_not_a_credential', user: { id: USER, aud: 'authenticated', role: 'authenticated',
          is_anonymous: true, app_metadata: {}, user_metadata: {}, created_at: timestamp() } }); return;
    }
    if (path.endsWith('/profile') && request.method() === 'GET') { await reply(profile()); return; }
    if (path.endsWith('/profile') && request.method() === 'POST') { nickname = body.nickname; await reply(profile()); return; }
    if (path.endsWith('/profile') && request.method() === 'DELETE') {
      if (failDelete) { await reply({ code: 'UNAVAILABLE', message: 'simulated failure' }, 503); return; }
      nickname = null; deleted = true; await reply({ deleted: true }); return;
    }
    if (path.endsWith('/leaderboard')) {
      const entries = [
        { publicId: OTHER, nickname: '동료냥', score: 123, rank: 1, achievedAt: timestamp(), isMe: false },
        { publicId: SECOND, nickname: '동료냥', score: 123, rank: 1, achievedAt: timestamp(), isMe: false },
      ];
      await reply({ entries, me: nickname ? { publicId: ME, nickname, score: 12, rank: 101, achievedAt: timestamp(), isMe: true } : null,
        rulesVersion: RULES_VERSION, fetchedAt: timestamp() }); return;
    }
    if (path.endsWith('/reports')) { reported = body; await reply({ reported: true }); return; }
    if (path.endsWith('/runs')) {
      if (failStart) { await reply({ code: 'UNAVAILABLE', message: 'simulated failure' }, 503); return; }
      ticks = 0;
      await reply({ runId: RUN, engineRunId: 701, seed: 42, rulesVersion: RULES_VERSION,
        issuedAt: timestamp(), expiresAt: new Date(Date.now() + 86400000).toISOString() }); return;
    }
    if (path.endsWith('/runs/chunks')) {
      ticks += body.spans.reduce((sum: number, span: { ticks: number }) => sum + span.ticks, 0);
      await reply({ acceptedSeq: body.seq, totalTicks: ticks, terminal: true,
        expiresAt: new Date(Date.now() + 86400000).toISOString() }); return;
    }
    if (path.endsWith('/runs/finalize')) { await reply({ runId: RUN, score: 0, bestScore: 12, rank: 101, improved: false }); return; }
    errors.push(`Unexpected simulated request ${path}`); await reply({}, 500);
  });
  return { errors, writes, signupCount: () => signupCount, reported: () => reported, deleted: () => deleted,
    setFailDelete: (value: boolean) => { failDelete = value; }, setFailStart: (value: boolean) => { failStart = value; } };
}
async function close(page: Page, panel: string) { await page.getByTestId(panel).getByRole('button', { name: '닫기', exact: true }).click(); }
async function join(page: Page) {
  await page.getByTestId('title-nickname').click();
  await page.getByTestId('nickname-input').fill('동료냥');
  await page.getByTestId('nickname-save').click();
  await expect(page.getByTestId('nickname-panel')).toHaveCount(0);
}

test('simulated API: guest read, duplicate nickname, shared ranks, report/hide and deletion retry', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone-landscape', 'Simulated online flow on one landscape device; offline layout has separate coverage.');
  const api = await simulatedApi(page);
  await page.goto(APP);
  await expect(page.getByTestId('start-button')).toBeVisible();
  await page.getByTestId('title-leaderboard').click();
  await expect(page.getByTestId(`rank-row-${OTHER}`)).toContainText('123%');
  expect(api.signupCount()).toBe(0);
  await close(page, 'leaderboard-panel');
  await join(page); expect(api.signupCount()).toBe(1);
  await page.getByTestId('title-leaderboard').click();
  await expect(page.getByTestId(`my-rank-${ME}`)).toContainText('101');
  await expect(page.getByTestId(`my-rank-${ME}`)).toContainText('나');
  await page.getByTestId(`rank-menu-${OTHER}`).click();
  await page.getByTestId('nickname-report').click();
  await page.getByTestId('report-reason-inappropriate').click();
  await expect.poll(api.reported).toEqual({ targetPublicId: OTHER, reason: 'inappropriate' });
  await page.getByTestId(`rank-menu-${OTHER}`).click(); await page.getByTestId('hide-player').click();
  await expect(page.getByTestId(`rank-row-${OTHER}`)).toHaveCount(0);
  await expect(page.getByTestId(`rank-row-${SECOND}`)).toContainText('123%');
  await page.screenshot({ path: info.outputPath('simulated-ranking.png'), fullPage: true });
  await close(page, 'leaderboard-panel');
  await page.getByTestId('title-settings').click();
  await page.getByTestId('setting-musicEnabled').click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('close-call-nyang.preferences.v1') ?? 'null')?.settings.musicEnabled)).toBe(false);
  const retainedPreferences = await page.evaluate(() => localStorage.getItem('close-call-nyang.preferences.v1'));
  api.setFailDelete(true);
  await page.getByTestId('settings-delete-online').click(); await page.getByTestId('confirm-delete-online').click();
  await expect(page.getByTestId('settings-panel').getByText('삭제 완료를 확인하지 못했어요. 같은 참여 정보로 삭제를 다시 시도해 주세요.', { exact: true })).toBeVisible();
  await expect(page.getByTestId('confirm-delete-online')).toBeEnabled();
  api.setFailDelete(false); await page.getByTestId('confirm-delete-online').click();
  await expect.poll(api.deleted).toBe(true);
  await expect(page.getByTestId('delete-online-confirmation')).toHaveCount(0);
  await expect(page.getByTestId('settings-delete-online')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('close-call-nyang.online.session.v1'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('close-call-nyang.preferences.v1'))).toBe(retainedPreferences);
  expect(api.signupCount()).toBe(1);
  expect(api.errors).toEqual([]);
  await info.attach('simulated-api-scope', { body: JSON.stringify({ hostedEvidence: false, errors: api.errors, signupCount: api.signupCount() }), contentType: 'application/json' });
});

test('simulated API: genuine short run submits inputs, then start outage falls back to local', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone-landscape', 'One simulated online flow; not hosted verification.');
  const api = await simulatedApi(page); await page.goto(APP); await join(page);
  await page.getByTestId('start-button').click();
  await expect(page.getByTestId('control-right')).toBeEnabled();
  await page.keyboard.down('ArrowRight'); await expect(page.getByTestId('result-screen')).toBeVisible(); await page.keyboard.up('ArrowRight');
  await expect(page.getByText('랭킹등록완료!', { exact: true })).toBeVisible();
  await expect(page.getByTestId('ranking-receipt')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('simulated-submission.png'), fullPage: true });
  expect(api.writes.some(path => path.endsWith('/runs/chunks'))).toBe(true);
  await expect(page.getByTestId('revive-button')).toHaveCount(0);
  await expect(page.getByTestId('replay-diagnostics-open')).toHaveCount(0);
  api.setFailStart(true); await page.getByTestId('retry-button').click();
  await expect(page.getByTestId('control-right')).toBeEnabled();
  await page.keyboard.down('ArrowRight'); await expect(page.getByTestId('result-screen')).toBeVisible(); await page.keyboard.up('ArrowRight');
  await expect(page.getByText('이번 기록은 기기에만 저장돼요', { exact: false })).toBeVisible();
  expect(api.errors).toEqual([]);
  await info.attach('simulated-api-scope', { body: JSON.stringify({ hostedEvidence: false, receivedRoutes: api.writes }), contentType: 'application/json' });
});
