import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for feed performance e2e tests.
 * Only covers RT1 (realtime latency) and C2 (optimistic like accuracy).
 * Other categories are manual tests or k6 load tests.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0, // No retries — flaky tests should be fixed, not masked
  workers: 1, // Sequential — tests share Supabase state

  use: {
    baseURL: process.env.K6_APP_URL ?? 'http://localhost:3000',
    // All tests use Chromium for CDP access (network throttling)
    ...devices['Desktop Chrome'],
    // Headed mode needed for CDP network throttle to work correctly
    headless: false,
    // Capture traces and screenshots on failure
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'feed-e2e',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start dev server if not already running
  // Comment this out if you run `npm run dev` separately
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true, // Don't restart if already running
    timeout: 60_000,
  },

  reporter: [
    ['html', { outputFolder: 'tests/e2e/reports', open: 'never' }],
    ['list'],
  ],

  outputDir: 'tests/e2e/test-results',
});
