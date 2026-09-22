import { test, expect, openGame, startGame, loseWithRight, leanDegrees, capture } from './helpers';

test('real held keyboard input leans, falls, retries, and never exposes production ads', async ({ cleanPage: page }, info) => {
  await openGame(page);
  await capture(page, info, 'actual-title');
  await startGame(page);
  await capture(page, info, 'actual-initial-street');
  const before = await leanDegrees(page);
  await page.keyboard.down('ArrowRight');
  await expect.poll(() => leanDegrees(page)).toBeGreaterThan(before + 8);
  await capture(page, info, 'actual-lean');
  const visiblePlayingAngles = await page.evaluate(() => new Promise<number[]>(resolve => {
    const angles: number[] = [];
    const deadline = performance.now() + 5000;
    const sample = () => {
      if (document.querySelector('[data-testid="result-screen"]') || performance.now() >= deadline) {
        resolve(angles); return;
      }
      const root = document.querySelector('[data-testid="nyang-root"]') as SVGGraphicsElement | null;
      const matrix = root?.getCTM();
      if (matrix) angles.push(Math.atan2(matrix.b, matrix.a) * 180 / Math.PI);
      requestAnimationFrame(sample);
    };
    sample();
  }));
  // The old ~40-degree boundary must no longer end visible play prematurely.
  expect(Math.max(...visiblePlayingAngles)).toBeGreaterThan(50);
  await info.attach('actual-playing-angles', {
    body: JSON.stringify({ maxDegrees: Math.max(...visiblePlayingAngles), samples: visiblePlayingAngles }),
    contentType: 'application/json',
  });
  await expect(page.getByTestId('result-screen')).toBeVisible();
  await page.keyboard.up('ArrowRight');
  await capture(page, info, 'actual-result');
  await expect(page.getByTestId('revive-button')).toHaveCount(0);
  await expect(page.getByText('개발용 가상 광고', { exact: true })).toHaveCount(0);
  await startGame(page, true);
  await expect(page.getByTestId('game-score')).toHaveText('0%');
  await page.getByTestId('pause-button').click();
});

test('pause, focus loss and portrait freeze the game until explicit resume', async ({ cleanPage: page }) => {
  await openGame(page); await startGame(page);
  await page.getByTestId('pause-button').click();
  const paused = await leanDegrees(page);
  const score = await page.getByTestId('game-score').textContent();
  await page.waitForTimeout(300);
  expect(await leanDegrees(page)).toBeCloseTo(paused, 7);
  await expect(page.getByTestId('game-score')).toHaveText(score!);
  await page.getByRole('button', { name: '이어하기', exact: true }).click();
  // Actual DOM lifecycle event, not a controller/debug command.
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByTestId('pause-overlay')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByTestId('pause-overlay')).toBeVisible();
  await page.getByRole('button', { name: '이어하기', exact: true }).click();
  const landscape = page.viewportSize()!;
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('landscape-gate')).toBeVisible();
  await expect(page.getByTestId('landscape-content')).toBeHidden();
  await page.setViewportSize(landscape);
  await expect(page.getByTestId('pause-overlay')).toBeVisible();
});

test('A and ArrowLeft stay independent when only A is released', async ({ cleanPage: page }) => {
  await openGame(page); await startGame(page);
  await page.keyboard.down('a'); await page.keyboard.down('ArrowLeft');
  await page.keyboard.up('a');
  await expect.poll(() => leanDegrees(page)).toBeLessThan(-8);
  await expect(page.getByTestId('result-screen')).toBeVisible();
  await page.keyboard.up('ArrowLeft');
});

test('two genuine browser touch pointers hold independently and cancel their directions', async ({ cleanPage: page, context }, info) => {
  test.skip(!info.project.use.hasTouch, 'Multi-touch is checked in the two touch-enabled browser contexts.');
  await openGame(page); await startGame(page);
  const left = (await page.getByTestId('control-left').boundingBox())!;
  const right = (await page.getByTestId('control-right').boundingBox())!;
  const a = { x: left.x + left.width / 2, y: left.y + left.height / 2, id: 1 };
  const b = { x: right.x + right.width / 2, y: right.y + right.height / 2, id: 2 };
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [a, b] });
  await expect(page.getByTestId('control-left')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('control-right')).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(180);
  expect(Math.abs(await leanDegrees(page))).toBeLessThan(15);
  // Chromium 153 releases the listed changed IDs; [] would release all touches.
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [a] });
  await expect(page.getByTestId('control-left')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('control-right')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => leanDegrees(page)).toBeGreaterThan(8);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(page.getByTestId('control-right')).toHaveAttribute('aria-pressed', 'false');
  await cdp.detach();
  await page.getByTestId('pause-button').click();
});
