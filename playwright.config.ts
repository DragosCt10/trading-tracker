import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config.
 *
 * Projects:
 *   feed-e2e          — original feed/auth performance tests (headed, sequential)
 *   setup             — auth setup for responsive tests (saves .auth/user.json)
 *   responsive-mobile  — visual regression at 375×812  (iPhone 12)
 *   responsive-tablet  — visual regression at 768×1024
 *   responsive-desktop — visual regression at 1024×768 (lg breakpoint)
 *   responsive-wide    — visual regression at 1440×900
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0, // No retries — flaky tests should be fixed, not masked
  workers: 1, // Sequential default — tests share Supabase state
              // Override with --workers=4 for responsive tests (stateless, safe)

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
    // ── Original feed/auth tests (unaffected) ──────────────────────────────
    {
      name: 'feed-e2e',
      use: { ...devices['Desktop Chrome'] },
      testDir: './tests/e2e',
      testIgnore: ['**/responsive/**'],
    },

    // ── Auth setup for responsive tests ───────────────────────────────────
    {
      name: 'setup',
      testDir: './tests/e2e/responsive',
      testMatch: ['auth.setup.ts'],
    },

    // ── Responsive visual regression projects ─────────────────────────────
    // All use Chromium (headless: true) for consistent font rendering.
    // devices['iPhone 12'] uses WebKit — replaced with Chromium + iPhone 12 dimensions.
    {
      name: 'responsive-mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
        headless: true,
        storageState: 'tests/e2e/.auth/user.json',
      },
      testDir: './tests/e2e/responsive',
      testIgnore: ['auth.setup.ts'],
      dependencies: ['setup'],
      snapshotDir: 'tests/e2e/responsive/snapshots',
    },
    {
      name: 'responsive-tablet',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
        headless: true,
        storageState: 'tests/e2e/.auth/user.json',
      },
      testDir: './tests/e2e/responsive',
      testIgnore: ['auth.setup.ts'],
      dependencies: ['setup'],
      snapshotDir: 'tests/e2e/responsive/snapshots',
    },
    {
      name: 'responsive-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 768 },
        headless: true,
        storageState: 'tests/e2e/.auth/user.json',
      },
      testDir: './tests/e2e/responsive',
      testIgnore: ['auth.setup.ts'],
      dependencies: ['setup'],
      snapshotDir: 'tests/e2e/responsive/snapshots',
    },
    {
      name: 'responsive-wide',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        headless: true,
        storageState: 'tests/e2e/.auth/user.json',
      },
      testDir: './tests/e2e/responsive',
      testIgnore: ['auth.setup.ts'],
      dependencies: ['setup'],
      snapshotDir: 'tests/e2e/responsive/snapshots',
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
