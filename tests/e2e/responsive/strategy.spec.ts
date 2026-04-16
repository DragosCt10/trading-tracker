/**
 * Responsive visual regression — strategy pages.
 *
 * Screenshots /strategy, /strategy/[id], and /strategy/[id]/my-trades
 * at all 4 viewport sizes.
 *
 * Requires:
 *   - auth.setup.ts to have run (tests/e2e/.auth/user.json must exist)
 *   - E2E_STRATEGY_ID set in .env.test (UUID of a real strategy with trades)
 *   - Dev server running on localhost:3000
 *
 * Skip behavior:
 *   If E2E_STRATEGY_ID is missing, all tests in this file are skipped
 *   (same pattern as auth-flow.spec.ts for missing credentials).
 *
 * First run:
 *   npx playwright test tests/e2e/responsive/strategy.spec.ts --update-snapshots
 */

import { test, expect } from '@playwright/test';
import { join } from 'path';
import { loadEnv, maskDynamicContent, assertAuthenticated } from './helpers';

const ROOT = join(__dirname, '../../..');
const env = loadEnv([join(ROOT, '.env.local'), join(ROOT, '.env.test')]);
const BASE_URL = env['K6_APP_URL'] ?? 'http://localhost:3000';
const STRATEGY_ID = env['E2E_STRATEGY_ID'] ?? '';

// Skip entire file if no strategy ID configured
test.skip(!STRATEGY_ID, 'E2E_STRATEGY_ID not set in .env.test — skipping strategy responsive tests');

test.describe('/strategy (list)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/strategy`);
    await page.waitForLoadState('networkidle');
    await assertAuthenticated(page, '/strategy');
  });

  test('visual regression snapshot', async ({ page }) => {
    await expect(page).toHaveScreenshot('strategy-list.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});

test.describe('/strategy/[id] (analytics dashboard)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/strategy/${STRATEGY_ID}`);

    // Wait for Recharts to render before masking/screenshotting
    await page.waitForSelector(
      '[data-testid="chart-card"], .recharts-responsive-container',
      { timeout: 15_000 }
    );
    await assertAuthenticated(page, `/strategy/${STRATEGY_ID}`);
  });

  test('visual regression snapshot', async ({ page }) => {
    await maskDynamicContent(page);
    await expect(page).toHaveScreenshot('strategy-dashboard.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});

test.describe('/strategy/[id]/my-trades', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/strategy/${STRATEGY_ID}/my-trades`);
    await page.waitForLoadState('networkidle');
    await assertAuthenticated(page, `/strategy/${STRATEGY_ID}/my-trades`);
  });

  test('visual regression snapshot', async ({ page }) => {
    await maskDynamicContent(page);
    await expect(page).toHaveScreenshot('strategy-trades.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});
