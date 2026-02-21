import { defineConfig } from '@playwright/test';

const WATCHER_PORT = process.env.WATCHER_PORT || '7365';

export default defineConfig({
  testDir: './e2e-web',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: `http://localhost:${WATCHER_PORT}`,
    headless: process.env.WEB_HEADLESS !== 'false', // default headless for Playwright tests
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  outputDir: '.agent/playwright-results',
  retries: 0,
  reporter: [['list']],
});
