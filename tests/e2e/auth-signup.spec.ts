/**
 * Playwright E2E: Signup flow
 *
 * Covers:
 *   - Visiting /signup renders the form
 *   - Submitting a fresh email shows the "Check your email" confirmation screen
 *   - Submitting with an already-registered email shows a sanitized error
 *
 * Prerequisites:
 *   npx playwright install chromium
 *   Dev server running: npm run dev
 *   .env.test present with:
 *     E2E_USER_EMAIL    — an already-registered test account (for the collision case)
 *
 * Run:
 *   npx playwright test tests/e2e/auth-signup.spec.ts
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
const EXISTING_EMAIL = env['E2E_USER_EMAIL'] ?? '';

test.describe('Signup flow', () => {
  test('renders the signup form with required fields', async ({ page }) => {
    await page.goto(`${APP_URL}/signup`);
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('submitting a fresh email shows "Check your email" screen', async ({ page }) => {
    const uniqueEmail = `test+${Date.now()}@e2e.invalid`;

    await page.goto(`${APP_URL}/signup`);
    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[type="password"]', 'StrongP@ssw0rd!');
    // Wait for strength meter to enable the submit button
    await page.waitForTimeout(200);
    await page.click('button[type="submit"]');

    // Either the confirmation screen or a validation error from the server
    // (e.g. rate limit). The happy path is: "Check your email" heading.
    await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible({ timeout: 10_000 });
  });

  test('submitting an already-registered email shows a sanitized error', async ({ page }) => {
    test.skip(!EXISTING_EMAIL, 'E2E_USER_EMAIL not set in .env.test');
    await page.goto(`${APP_URL}/signup`);
    await page.fill('input[type="email"]', EXISTING_EMAIL);
    await page.fill('input[type="password"]', 'StrongP@ssw0rd!');
    await page.waitForTimeout(200);
    await page.click('button[type="submit"]');

    // Error banner should announce via role="alert" — assert the role, not a class
    const errorBanner = page.getByRole('alert').first();
    await expect(errorBanner).toBeVisible({ timeout: 5_000 });
    // Sanitized message (not the raw Supabase error)
    await expect(errorBanner).not.toContainText(/already been registered/i);
  });
});
