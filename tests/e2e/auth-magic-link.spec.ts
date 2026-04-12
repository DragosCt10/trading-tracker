/**
 * Playwright E2E: Magic-link hash consumption
 *
 * Covers the critical defense-in-depth fix from the (auth-app) audit:
 * when a magic-link redirect lands on /login#access_token=...&refresh_token=...,
 * the login page must call window.history.replaceState to CLEAR the tokens
 * from location.hash immediately after supabase.auth.setSession resolves
 * (for both success and error branches).
 *
 * We simulate the arrival by navigating directly to /login with fake tokens.
 * The fake session exchange will fail — that's fine. We only care that the
 * hash is cleared regardless of outcome.
 *
 * Run:
 *   npx playwright test tests/e2e/auth-magic-link.spec.ts
 */

import { test, expect } from '@playwright/test';

const APP_URL = process.env.K6_APP_URL ?? 'http://localhost:3000';

test.describe('Magic-link hash cleanup', () => {
  test('tokens are removed from window.location.hash after consumption', async ({ page }) => {
    const fakeHash =
      '#access_token=fake.jwt.token&refresh_token=fake-refresh&expires_in=3600&token_type=bearer&type=magiclink';
    await page.goto(`${APP_URL}/login${fakeHash}`);

    // After setSession resolves (succeeds or fails), replaceState clears the hash.
    // This is the security-critical assertion — tokens must not linger in the URL.
    await expect
      .poll(async () => await page.evaluate(() => window.location.hash), {
        timeout: 10_000,
        message: 'expected location.hash to be cleared after magic-link consumption',
      })
      .toBe('');
  });

  test('malformed magic-link token results in an error banner (role="alert")', async ({ page }) => {
    const fakeHash = '#access_token=definitely.invalid.token&refresh_token=also-invalid&type=magiclink';
    await page.goto(`${APP_URL}/login${fakeHash}`);

    // An invalid token causes setSession to fail; the error banner renders
    // with role="alert" so screen readers announce it.
    const errorBanner = page.getByRole('alert').first();
    await expect(errorBanner).toBeVisible({ timeout: 10_000 });
  });
});
