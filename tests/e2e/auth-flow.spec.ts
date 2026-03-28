/**
 * Playwright E2E: Normal Auth Flow
 *
 * Covers the standard auth journeys that must keep working after the
 * single-session enforcement changes:
 *   - Email/password login success → redirects to /stats
 *   - Email/password login failure → shows error message
 *   - Logout → clears session, redirects to /
 *   - Protected route without session → redirects to /login
 *
 * Prerequisites:
 *   npx playwright install chromium
 *   Dev server running: npm run dev
 *   .env.test present with:
 *     E2E_USER_EMAIL    — a valid test account email
 *     E2E_USER_PASSWORD — the account password
 *
 * Run:
 *   npx playwright test tests/e2e/auth-flow.spec.ts
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ── env loading ──────────────────────────────────────────────────────────

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
const EMAIL = env['E2E_USER_EMAIL'] ?? '';
const PASSWORD = env['E2E_USER_PASSWORD'] ?? '';

// ── tests ─────────────────────────────────────────────────────────────────

test.describe('Normal auth flow', () => {
  test.skip(!EMAIL || !PASSWORD, 'E2E_USER_EMAIL / E2E_USER_PASSWORD not set in .env.test');

  test('login with valid credentials redirects to /stats', async ({ page }) => {
    await page.goto(`${APP_URL}/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(`${APP_URL}/stats`, { timeout: 10_000 });
  });

  test('login with wrong password shows error message', async ({ page }) => {
    await page.goto(`${APP_URL}/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', 'definitely-wrong-password');
    await page.click('button[type="submit"]');
    // Stay on /login and show an error
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
    await expect(page.locator('[class*="destructive"]')).toBeVisible({ timeout: 5_000 });
  });

  test('protected route without session redirects to /login', async ({ page }) => {
    // Fresh context with no cookies → not authenticated
    await page.goto(`${APP_URL}/stats`);
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('logout clears session and redirects to /', async ({ page }) => {
    // Log in first
    await page.goto(`${APP_URL}/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${APP_URL}/stats`, { timeout: 10_000 });

    // Click the logout button — icon-only button with aria-label="Sign Out" in the Navbar
    const logoutBtn = page.locator('button[aria-label="Sign Out"]').first();
    await logoutBtn.click();

    // After logout we should land on / or /login
    await expect(page).toHaveURL(/\/(login)?$/, { timeout: 10_000 });

    // Navigating to a protected route should redirect back to login
    await page.goto(`${APP_URL}/stats`);
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

// ── no-credentials fallback ───────────────────────────────────────────────

test('protected route without session redirects to /login (no env required)', async ({ page }) => {
  const url = env['K6_APP_URL'] ?? 'http://localhost:3000';
  await page.goto(`${url}/stats`);
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
});
