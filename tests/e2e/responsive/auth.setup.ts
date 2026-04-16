/**
 * Playwright auth setup for responsive visual regression tests.
 *
 * Logs in once using E2E_USER_EMAIL / E2E_USER_PASSWORD and saves the
 * Supabase session to tests/e2e/.auth/user.json.
 *
 * All responsive projects declare `dependencies: ['setup']` and
 * `storageState: 'tests/e2e/.auth/user.json'` so this runs first.
 *
 * Prerequisites:
 *   .env.test or .env.local must contain:
 *     E2E_USER_EMAIL=...
 *     E2E_USER_PASSWORD=...
 *
 * Run standalone:
 *   npx playwright test tests/e2e/responsive/auth.setup.ts
 */

import { test as setup, expect } from '@playwright/test';
import { join } from 'path';
import { loadEnv } from './helpers';

const ROOT = join(__dirname, '../../..');
const env = loadEnv([join(ROOT, '.env.local'), join(ROOT, '.env.test')]);

const APP_URL = env['K6_APP_URL'] ?? 'http://localhost:3000';
const EMAIL = env['E2E_USER_EMAIL'] ?? '';
const PASSWORD = env['E2E_USER_PASSWORD'] ?? '';

const AUTH_FILE = join(__dirname, '../.auth/user.json');

setup('authenticate', async ({ page }) => {
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      'E2E_USER_EMAIL and E2E_USER_PASSWORD must be set in .env.test or .env.local'
    );
  }

  await page.goto(`${APP_URL}/login`);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for redirect to authenticated area
  await expect(page).toHaveURL(/\/(stats|strategy)/, { timeout: 15_000 });

  // Save session state for all responsive projects
  await page.context().storageState({ path: AUTH_FILE });
});
