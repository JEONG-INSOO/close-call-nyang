import { test, expect } from '@playwright/test';

test('first-launch nickname input appears once without anonymous signup or disabling play', async ({ page }, info) => {
  // Explicit configured synthetic bundle. This is browser UX evidence, not a hosted account test.
  const writes: string[] = [];
  await page.route('https://nyang-ranking-fixture.invalid/**', async route => {
    if (!['GET', 'OPTIONS'].includes(route.request().method())) writes.push(new URL(route.request().url()).pathname);
    await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
  });
  await page.goto('http://127.0.0.1:4175/close-call-nyang/');
  await expect(page.getByTestId('nickname-panel')).toBeVisible();
  await expect(page.getByTestId('nickname-input')).toBeVisible();
  await expect(page.getByTestId('nickname-panel')).toContainText('랭킹에 기록을 등록할 수 있어요');
  await info.attach('first-nickname-input', { body: await page.screenshot(), contentType: 'image/png' });
  await page.getByTestId('nickname-panel-close').click();
  await expect(page.getByTestId('nickname-panel')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('close-call-nyang.nickname-onboarding.v2') ?? '{}').handled)).toBe(true);
  await page.reload();
  await expect(page.getByTestId('start-button')).toBeVisible();
  await expect(page.getByTestId('nickname-panel')).toHaveCount(0);
  await page.getByTestId('start-button').click();
  await expect(page.getByTestId('control-left')).toBeEnabled();
  await page.getByTestId('pause-button').click();
  await expect(page.getByTestId('pause-overlay')).toBeVisible();
  expect(writes).toEqual([]);
});
