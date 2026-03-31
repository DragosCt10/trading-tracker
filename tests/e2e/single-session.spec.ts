/**
 * Playwright E2E: Single-Session Enforcement
 *
 * Verifies that when a user logs in from a new device (context B),
 * the existing session on device A is revoked and the user sees the
 * "session ended" banner on their next navigation.
 *
 * Prerequisites:
 *   npx playwright install chromium
 *   Dev server running: npm run dev
 *   .env.test present with:
 *     E2E_USER_EMAIL    — a valid test account email
 *     E2E_USER_PASSWORD — the account password
 *
 * Run:
 *   npx playwright test tests/e2e/single-session.spec.ts
 */

import { test, expect, Browser } from '@playwright/test';
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

// ── helpers ───────────────────────────────────────────────────────────────

async function loginWithPassword(browser: Browser, email: string, password: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${APP_URL}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for redirect to stats after successful login
  await page.waitForURL(`${APP_URL}/stats`, { timeout: 10_000 });
  return { context, page };
}

// ── tests ─────────────────────────────────────────────────────────────────

test.describe('Single-session enforcement', () => {
  test.skip(!EMAIL || !PASSWORD, 'E2E_USER_EMAIL / E2E_USER_PASSWORD not set in .env.test');

  test('Device A is kicked when Device B logs in with same credentials', async ({ browser }) => {
    // 1. Device A logs in first
    const { context: ctxA, page: pageA } = await loginWithPassword(browser, EMAIL, PASSWORD);

    // 2. Device B logs in — triggers revokeOtherSessions
    const { context: ctxB, page: pageB } = await loginWithPassword(browser, EMAIL, PASSWORD);

    // 3. Device A navigates to a protected page
    await pageA.goto(`${APP_URL}/stats`);

    // 4. Middleware detects revoked session → redirects to /login with reason param
    await expect(pageA).toHaveURL(/\/login\?.*reason=session_replaced/, { timeout: 10_000 });

    // 5. Session-ended banner is visible
    await expect(pageA.getByText('Session ended')).toBeVisible();
    await expect(pageA.getByText('Your session has ended. Please sign in again.')).toBeVisible();

    // Cleanup
    await ctxA.close();
    await ctxB.close();
  });
});
