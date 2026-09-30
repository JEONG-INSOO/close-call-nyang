import { test, expect } from '@playwright/test';

// This may target the exact deployed site without creating accounts or submitting scores.
const publicBase = process.env.PUBLIC_PAGES_BASE_URL;
if (publicBase && publicBase !== 'https://jeong-insoo.github.io/close-call-nyang/') {
  throw new Error('PUBLIC_PAGES_BASE_URL must be the approved official site');
}

for (const name of ['support', 'privacy']) {
  test(`${name} is a real bilingual, readable static page`, async ({ page, request, baseURL }, info) => {
    if (info.project.name === 'phone-landscape') await page.setViewportSize({ width: 390, height: 844 });
    const base = publicBase ?? baseURL!;
    const response = await page.goto(new URL(`${name}/`, base).href);
    expect(response?.status()).toBe(200);
    expect(response?.headers()['content-type']).toContain('text/html');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
    await expect(page.locator('section[lang="ko"]')).toContainText('온라인 프로필과 기록 삭제');
    await expect(page.locator('section[lang="en"]')).toContainText('Delete online profile and records');
    await expect(page.locator('header')).toContainText('Insoo Jeong');
    await expect(page.locator('header a')).toHaveAttribute('href', 'mailto:mocca3232@naver.com');
    await expect(page.locator('script, iframe, img, form')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const size of await page.locator('nav a').evaluateAll(elements => elements.map(el => el.getBoundingClientRect().height))) {
      expect(size).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({ path: info.outputPath(`${name}-ko.png`) });
    await page.locator('nav a[href="#en"]').click();
    await expect(page.locator('#en-title')).toBeInViewport();
    await page.screenshot({ path: info.outputPath(`${name}-en.png`) });
    for (const target of ['', 'support/', 'privacy/']) {
      expect((await request.get(new URL(target, base).href)).status()).toBe(200);
    }
  });
}
