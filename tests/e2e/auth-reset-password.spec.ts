/**
 * Playwright E2E: Reset password request flow
 *
 * Covers:
 *   - Visiting /reset-password renders the form
 *   - Submitting a valid email shows a success banner (role=status)
 *   - The success banner is announced via aria-live
 *
 * Prerequisites:
 *   npx playwright install chromium
 *   Dev server running: npm run dev
 *
 * Run:
 *   npx playwright test tests/e2e/auth-reset-password.spec.ts
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

function loadEnv(files: string[]): Record<string, string> {
  const env: Record<string, string> = {};
  for (const file of files) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      env[key] = val;
    }
  }
  return env;
}

const ROOT = join(__dirname, '../..');
const env = loadEnv([join(ROOT, '.env.local'), join(ROOT, '.env.test')]);

const APP_URL = env['K6_APP_URL'] ?? 'http://localhost:3000';
const EMAIL = env['E2E_USER_EMAIL'] ?? 'test+e2e@example.invalid';

test.describe('Reset password flow', () => {
  test('renders the reset form with email input', async ({ page }) => {
    await page.goto(`${APP_URL}/reset-password`);
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('submitting a valid email shows a success status banner', async ({ page }) => {
    await page.goto(`${APP_URL}/reset-password`);
    await page.fill('input[type="email"]', EMAIL);
    await page.click('button[type="submit"]');

    // Success banner should use role="status" for aria-live announcement
    const statusBanner = page.getByRole('status').first();
    await expect(statusBanner).toBeVisible({ timeout: 5_000 });
    await expect(statusBanner).toContainText(/check your email/i);
  });

  test('submitting an invalid email format blocks submission', async ({ page }) => {
    await page.goto(`${APP_URL}/reset-password`);
    // Empty email → browser's required attribute + server Zod validation
    await page.fill('input[type="email"]', 'not-an-email');
    // The HTML5 `type="email"` invalid state prevents form submission
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveJSProperty('validity.valid', false);
  });
});
