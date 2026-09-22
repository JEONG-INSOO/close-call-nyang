import { test, expect, openGame, startGame, capture } from './helpers';

test('all three flat chibi portraits fit the unchanged collection preview without unlocking rewards', async ({ cleanPage: page }, info) => {
  await openGame(page);
  await page.getByTestId('title-characters').click();
  for (const id of ['rookie', 'diligent', 'veteran']) {
    const preview = page.getByTestId(`character-preview-${id}`);
    await preview.scrollIntoViewIfNeeded();
    await expect(preview.getByTestId(`face-${id}`)).toHaveCount(1);
    await expect(preview.getByTestId(`outfit-${id}`)).toHaveCount(1);
    // The rookie is drawn from generated PNG parts; reward cats keep the flat SVG skin.
    await expect(preview.getByTestId('rookie-sprite')).toHaveCount(id === 'rookie' ? 1 : 0);
    const fits = await preview.locator('svg').evaluate(element => {
      const svg = element as SVGSVGElement;
      const box = (svg.querySelector('[data-testid="nyang-root"]') as SVGGraphicsElement).getBBox();
      const view = svg.viewBox.baseVal;
      // Include an extra stroke margin; an unclipped mathematical centerline is insufficient.
      return box.x - 3 >= view.x && box.y - 3 >= view.y &&
        box.x + box.width + 3 <= view.x + view.width && box.y + box.height + 3 <= view.y + view.height;
    });
    expect(fits).toBe(true);
    const path = info.outputPath(`actual-character-preview-${id}.png`);
    await preview.screenshot({ path });
    await info.attach(`actual-character-preview-${id}`, { path, contentType: 'image/png' });
  }
  await expect(page.getByTestId('select-rookie')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('select-diligent')).toBeDisabled();
  await expect(page.getByTestId('select-veteran')).toBeDisabled();
});

test('real scenery travels three times faster while the opening score speed stays unchanged', async ({ cleanPage: page }, info) => {
  await openGame(page); await startGame(page);
  const measured = await page.evaluate(() => new Promise<{
    elapsed: number; nearRate: number; groundRate: number; depthRatio: number;
  }>(resolve => {
    const readX = (id: string) => (document.querySelector(`[data-testid="${id}"]`) as SVGGraphicsElement)
      .transform.baseVal.consolidate()!.matrix.e;
    requestAnimationFrame(start => {
      const near = readX('street-buildings');
      const far = readX('street-skyline');
      const story = readX('cafe');
      function sample(now: number) {
        if (now - start < 450) { requestAnimationFrame(sample); return; }
        const elapsed = (now - start) / 1000;
        const nearDelta = near - readX('street-buildings');
        resolve({ elapsed, nearRate: nearDelta / elapsed,
          groundRate: (story - readX('cafe')) / elapsed,
          depthRatio: (far - readX('street-skyline')) / nearDelta });
      }
      requestAnimationFrame(sample);
    });
  }));
  await expect(page.getByTestId('pause-overlay')).toHaveCount(0);
  // Initial physical speed remains 0.919355m/s; rates are SVG local units/s, not CSS px/s.
  // The old near layer travelled only 25.74 local units/s.
  expect(measured.nearRate).toBeGreaterThan(69);
  expect(measured.nearRate).toBeLessThan(86);
  expect(measured.groundRate).toBeGreaterThan(99);
  expect(measured.groundRate).toBeLessThan(123);
  expect(measured.depthRatio).toBeCloseTo(0.18 / 0.7, 5);
  await info.attach('actual-scenery-speed', { body: JSON.stringify(measured), contentType: 'application/json' });
  await page.getByTestId('pause-button').click();
  await capture(page, info, 'actual-flat-chibi-brisk-street');
});

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
