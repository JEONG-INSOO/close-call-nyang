import { test, expect, openGame, startGame, loseWithRight, capture } from './helpers';

const KEY = 'close-call-nyang.preferences.v1';
test('real browser settings and legitimate best persist across reload; collection remains locked', async ({ cleanPage: page }, info) => {
  await openGame(page);
  await page.getByTestId('title-characters').click();
  await expect(page.getByTestId('select-rookie')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('select-diligent')).toBeDisabled();
  await expect(page.getByTestId('select-veteran')).toBeDisabled();
  await page.getByTestId('character-panel-close').click();
  await page.getByTestId('title-settings').click();
  const music = page.getByRole('switch', { name: '배경 음악', exact: true });
  await music.uncheck();
  await page.getByRole('switch', { name: '화면 흔들림 줄이기', exact: true }).check();
  await capture(page, info, 'actual-settings');
  await page.getByTestId('settings-panel-close').click();
  await startGame(page); await loseWithRight(page);
  const result = await page.getByTestId('result-score').textContent();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).bestScore, KEY)).toBe(Number.parseInt(result!));
  await page.reload();
  await expect(page.getByTestId('title-best')).toHaveText(result!);
  await page.getByTestId('title-settings').click();
  await expect(music).not.toBeChecked();
  await expect(page.getByRole('switch', { name: '화면 흔들림 줄이기', exact: true })).toBeChecked();
});

test('corrupt local data recovers without a crash or fabricated unlock', async ({ cleanPage: page }) => {
  await page.addInitScript(key => localStorage.setItem(key, '{invalid json'), KEY);
  await openGame(page);
  await expect(page.getByTestId('title-best')).toHaveText('0%');
  await page.getByTestId('title-characters').click();
  await expect(page.getByTestId('select-diligent')).toBeDisabled();
  await expect(page.getByTestId('select-veteran')).toBeDisabled();
});

test('result has no share action while the score remains visible', async ({ cleanPage: page }) => {
  await openGame(page); await startGame(page); await loseWithRight(page);
  await expect(page.getByTestId('result-score')).toContainText('%');
  await expect(page.getByTestId('result-share')).toHaveCount(0);
  await expect(page.getByTestId('share-panel')).toHaveCount(0);
});
