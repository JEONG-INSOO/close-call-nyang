import { test, expect, openGame, capture } from './helpers';
import { PUBLIC_LINKS } from '../src/config/publicLinks';

test('guest settings scroll to public links and ranking uses the same support URL', async ({ cleanPage: page, context }, info) => {
  // Verify the real tap/browser boundary without contacting an external service.
  const opened: string[] = [];
  await context.route('https://jeong-insoo.github.io/close-call-nyang/**', async route => {
    opened.push(route.request().url());
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Public link test target</title>' });
  });
  await openGame(page);
  expect(opened).toEqual([]);
  await page.getByTestId('title-settings').click();
  const scroll = page.getByTestId('settings-panel-scroll');
  expect(await scroll.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(info.project.name !== 'desktop');
  for (const name of ['privacy', 'support'] as const) {
    const button = page.getByTestId(`settings-${name}`);
    await button.scrollIntoViewIfNeeded();
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute('role', 'link');
    const box = await button.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    if (name === 'support') await capture(page, info, 'settings-public-links');
    const [popup] = await Promise.all([context.waitForEvent('page'), button.click()]);
    await expect(popup).toHaveURL(PUBLIC_LINKS[name]);
    await expect.poll(() => opened.includes(PUBLIC_LINKS[name])).toBe(true);
    await popup.close();
  }
  await expect(page.getByTestId('setting-musicEnabled')).toHaveCount(1);
  await page.getByTestId('settings-panel-close').click();
  await page.getByTestId('title-leaderboard').click();
  const support = page.getByTestId('ranking-support');
  await support.scrollIntoViewIfNeeded();
  const [popup] = await Promise.all([context.waitForEvent('page'), support.click()]);
  await expect(popup).toHaveURL(PUBLIC_LINKS.support);
  await popup.close();
  expect(opened).toEqual([PUBLIC_LINKS.privacy, PUBLIC_LINKS.support, PUBLIC_LINKS.support]);
});
