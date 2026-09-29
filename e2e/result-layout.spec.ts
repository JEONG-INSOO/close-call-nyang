import { test, expect, openGame, startGame, loseWithRight, capture } from './helpers';

test('retry is first, home second, and no other result action appears without mock ads', async ({ cleanPage: page }, info) => {
  await openGame(page); await startGame(page); await loseWithRight(page);
  const result = page.getByTestId('result-screen');
  const buttons = result.getByRole('button');
  await expect(buttons).toHaveCount(2);
  await expect(buttons.nth(0)).toHaveAttribute('aria-label', '다시 도전');
  await expect(buttons.nth(1)).toHaveAttribute('aria-label', '처음으로');
  const boxes = await buttons.evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }));
  for (let i = 0; i < boxes.length; i++) {
    expect(boxes[i].x).toBeCloseTo(boxes[0].x, 0);
    expect(boxes[i].width).toBeCloseTo(boxes[0].width, 0);
    expect(boxes[i].height).toBeCloseTo(50, 0);
    if (i) expect(boxes[i].y - boxes[i - 1].y - boxes[i - 1].height).toBeGreaterThanOrEqual(9);
    await buttons.nth(i).scrollIntoViewIfNeeded();
    await expect(buttons.nth(i)).toBeInViewport();
  }
  const retryColor = await page.getByTestId('retry-button').evaluate(element => getComputedStyle(element).backgroundColor);
  expect(retryColor).toBe('rgb(191, 227, 209)');
  await capture(page, info, 'result-stack-bottom');
  await page.getByTestId('result-home').scrollIntoViewIfNeeded();
  await capture(page, info, 'result-stack-top');
  await page.getByTestId('retry-button').click();
  await expect(page.getByTestId('control-left')).toBeEnabled();
  await page.getByTestId('pause-button').click();
});
