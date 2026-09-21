import { test as base, expect, type Page, type TestInfo } from '@playwright/test';

export const test = base.extend<{ cleanPage: Page }>({
  cleanPage: async ({ page }, use, testInfo) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(`console: ${message.text()}`);
      else if (message.type() === 'warning') warnings.push(message.text());
    });
    page.on('response', response => {
      if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`);
    });
    page.on('requestfailed', request => {
      // Navigation/unmount can cancel media; exempt ERR_ABORTED without classifying its cause.
      if (request.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(`request: ${request.url()} ${request.failure()?.errorText}`);
    });
    await use(page);
    await testInfo.attach('browser-log', { body: JSON.stringify({ errors, warnings }, null, 2), contentType: 'application/json' });
    expect(errors, 'No unhandled app errors, missing assets or failed requests').toEqual([]);
  },
});
export { expect };

export async function openGame(page: Page) {
  await page.goto('./');
  await expect(page.getByTestId('start-button')).toBeVisible();
  await expect(page.getByTestId('scene-canvas')).toBeVisible();
  await expect(page.getByTestId('face-rookie')).toHaveCount(1);
}
export async function startGame(page: Page, retry = false) {
  await page.getByTestId(retry ? 'retry-button' : 'start-button').click();
  await expect(page.getByTestId('control-left')).toBeEnabled();
  await expect(page.getByTestId('pause-overlay')).toHaveCount(0);
}
export async function loseWithRight(page: Page) {
  await page.keyboard.down('ArrowRight');
  await expect(page.getByTestId('result-screen')).toBeVisible({ timeout: 12000 });
  await page.keyboard.up('ArrowRight');
}
export async function leanDegrees(page: Page): Promise<number> {
  return page.getByTestId('nyang-root').evaluate(element => {
    const matrix = (element as unknown as SVGGraphicsElement).getCTM();
    return matrix ? Math.atan2(matrix.b, matrix.a) * 180 / Math.PI : 0;
  });
}
export async function capture(page: Page, info: TestInfo, name: string) {
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true });
  await info.attach(name, { path, contentType: 'image/png' });
}
