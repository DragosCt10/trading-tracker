/**
 * Responsive visual regression — authenticated app pages.
 *
 * Screenshots /stats and /settings at all 4 viewport sizes.
 * Dynamic content (P&L values, charts, dates) is masked before screenshotting
 * so baselines stay stable regardless of live trading data.
 *
 * Requires:
 *   - auth.setup.ts to have run (tests/e2e/.auth/user.json must exist)
 *   - Dev server running on localhost:3000
 *
 * First run:
 *   npx playwright test tests/e2e/responsive/app.spec.ts --update-snapshots
 */

import { test, expect } from '@playwright/test';
import { join } from 'path';
import { loadEnv, maskDynamicContent, assertAuthenticated } from './helpers';

const ROOT = join(__dirname, '../../..');
const env = loadEnv([join(ROOT, '.env.local'), join(ROOT, '.env.test')]);
const BASE_URL = env['K6_APP_URL'] ?? 'http://localhost:3000';

test.describe('/stats', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/stats`);
    await page.waitForLoadState('networkidle');
    await assertAuthenticated(page, '/stats');
  });

  test('visual regression snapshot', async ({ page }) => {
    await maskDynamicContent(page);
    await expect(page).toHaveScreenshot('stats.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});

test.describe('/settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');
    await assertAuthenticated(page, '/settings');
  });

  test('visual regression snapshot', async ({ page }) => {
    // /settings is mostly static — no masking needed
    await expect(page).toHaveScreenshot('settings.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});
