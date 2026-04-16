/**
 * Responsive visual regression — public pages (no auth required).
 *
 * Screenshots / (landing), /login, /signup at all 4 viewport sizes.
 * Baselines are stored in tests/e2e/responsive/snapshots/.
 *
 * First run (generate baselines):
 *   npx playwright test tests/e2e/responsive/public.spec.ts --update-snapshots
 *
 * Subsequent runs (compare):
 *   npx playwright test tests/e2e/responsive/public.spec.ts
 */

import { test, expect } from '@playwright/test';
import { join } from 'path';
import { loadEnv } from './helpers';

const ROOT = join(__dirname, '../../..');
const env = loadEnv([join(ROOT, '.env.local'), join(ROOT, '.env.test')]);
const BASE_URL = env['K6_APP_URL'] ?? 'http://localhost:3000';

const PAGES = [
  { name: 'landing', path: '/' },
  { name: 'login', path: '/login' },
  { name: 'signup', path: '/signup' },
] as const;

for (const { name, path } of PAGES) {
  test(`${name} page — no horizontal overflow`, async ({ page }) => {
    await page.goto(`${BASE_URL}${path}`);
    await page.waitForLoadState('networkidle');

    // Visual regression snapshot
    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });

    // No horizontal scrollbar at any viewport
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasOverflow, 'horizontal overflow detected').toBe(false);
  });
}
