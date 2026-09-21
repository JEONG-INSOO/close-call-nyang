import { test, expect, openGame, startGame } from './helpers';

test('subpath assets have real content and landscape controls keep their target sizes', async ({ cleanPage: page }) => {
  const resources: { url: string; type: string; status: number }[] = [];
  page.on('response', response => resources.push({ url: response.url(), type: response.headers()['content-type'] ?? '', status: response.status() }));
  await openGame(page); await startGame(page);
  await page.getByTestId('pause-button').click();
  for (const id of ['control-left', 'control-right', 'pause-button']) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(id.startsWith('control') ? 72 : 44);
    expect(box!.height).toBeGreaterThanOrEqual(id.startsWith('control') ? 72 : 44);
    expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  }
  const canvas = (await page.getByTestId('scene-canvas').boundingBox())!;
  expect(canvas.width / canvas.height).toBeCloseTo(16 / 9, 2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const js = resources.filter(item => /\.js($|\?)/.test(item.url));
  expect(js.length).toBeGreaterThan(0);
  expect(js.every(item => item.status === 200 && /javascript/.test(item.type) && item.url.includes('/close-call-nyang/'))).toBe(true);
  await expect.poll(() => resources.filter(item => /\.wav($|\?)/.test(item.url)).length).toBeGreaterThanOrEqual(5);
  expect(resources.filter(item => /\.wav($|\?)/.test(item.url)).every(item => item.status === 200 && /audio/.test(item.type))).toBe(true);
});
