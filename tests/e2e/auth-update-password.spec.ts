/**
 * Playwright E2E: Update password (post reset-link) flow
 *
 * Covers:
 *   - Visiting /update-password without a session shows the expired banner
 *     (role="alert") with a "Request a new reset link" recovery action
 *   - The recovery link navigates to /reset-password
 *
 * NOTE: The happy path (authenticated reset-link session → new password →
 * /stats) requires a real Supabase reset-link fixture which is out of scope
 * for this spec. Those paths are exercised manually per the verification plan.
 *
 * Prerequisites:
 *   npx playwright install chromium
 *   Dev server running: npm run dev
 *
 * Run:
 *   npx playwright test tests/e2e/auth-update-password.spec.ts
 */

import { test, expect } from '@playwright/test';

const APP_URL = process.env.K6_APP_URL ?? 'http://localhost:3000';

test.describe('Update password flow', () => {
  test('without a session, shows expired banner with recovery link', async ({ page }) => {
    await page.goto(`${APP_URL}/update-password`);

    // Destructive error banner should expose role="alert"
    const errorBanner = page.getByRole('alert').first();
    await expect(errorBanner).toBeVisible({ timeout: 5_000 });
    await expect(errorBanner).toContainText(/expired|already been used/i);
  });

  test('the recovery link navigates to /reset-password', async ({ page }) => {
    await page.goto(`${APP_URL}/update-password`);
    await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 5_000 });

    await page.getByRole('link', { name: /request a new reset link/i }).click();
    await expect(page).toHaveURL(/\/reset-password/);
  });
});
