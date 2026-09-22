import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', testMatch: '*.spec.ts', fullyParallel: false, workers: 1,
  forbidOnly: !!process.env.CI, retries: 0, timeout: 45000,
  expect: { timeout: 8000 },
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    browserName: 'chromium', baseURL: 'http://127.0.0.1:4173/close-call-nyang/',
    headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 720 } } },
    { name: 'phone-landscape', use: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true } },
    { name: 'small-landscape', use: { viewport: { width: 667, height: 375 }, hasTouch: true, isMobile: true } },
  ],
  webServer: [
    { command: 'node scripts/serve-web.mjs --port 4173 --base /close-call-nyang',
      url: 'http://127.0.0.1:4173/close-call-nyang/', reuseExistingServer: false, timeout: 15000 },
    { command: 'node scripts/serve-web.mjs --port 4174 --base /fixtures --dir output/qa-fixtures',
      url: 'http://127.0.0.1:4174/fixtures/', reuseExistingServer: false, timeout: 15000 },
    { command: 'node scripts/serve-web.mjs --port 4175 --base /close-call-nyang --dir output/online-web',
      url: 'http://127.0.0.1:4175/close-call-nyang/', reuseExistingServer: false, timeout: 15000 },
  ],
});
