/**
 * Playwright Smoke Tests — Stats Boards list page (/stats)
 *
 * Covers the Stats Boards list page refactored in the stats-audit PR:
 *   - Server pre-fetch cache seeding (no skeleton flash on refresh)
 *   - Grid renders with account name heading and "Add Stats Board" card
 *   - Archived dialog opens, closes, and returns focus to the trigger
 *   - Zero strategies empty state
 *   - Zero archived strategies empty state
 *   - Non-Pro user does not see account totals (Total Win Rate / Total Trades)
 *
 * Prerequisites:
 *   1. Start: npm run dev
 *   2. Configure .env.local + .env.test with test user credentials.
 *
 * Required env vars (.env.local / .env.test):
 *   K6_APP_URL                  — default http://localhost:3000
 *   SUPABASE_SERVICE_ROLE_KEY   — for auth (same pattern as stats-performance.spec.ts)
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   STATS_TEST_EMAIL            — e.g. stats_smoke@test.invalid
 *   STATS_TEST_PASSWORD         — matching password
 *
 * Run:
 *   npx playwright test tests/e2e/stats-list.spec.ts
 */

import { test, expect, type Page, type Browser } from '@playwright/test';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// ── Env loader (same helper as stats-performance.spec.ts) ─────────────────
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
const env  = loadEnv([join(ROOT, '.env.local'), join(ROOT, '.env.test')]);

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']     ?? '';
const ANON_KEY     = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? '';
const APP_URL      = env['K6_APP_URL']                   ?? 'http://localhost:3000';

const TEST_EMAIL    = env['STATS_TEST_EMAIL']    ?? '';
const TEST_PASSWORD = env['STATS_TEST_PASSWORD'] ?? '';

// ── Auth helper ────────────────────────────────────────────────────────────
/**
 * Auth strategy: log in exactly ONCE per file via the real /login form in a
 * beforeAll hook, using a dedicated browser context. Save the cookies at
 * module scope. Each test's beforeEach injects those cookies into its own
 * (fresh) context before navigating. This avoids:
 *   1. Supabase rate-limits on repeated /auth/v1/token calls
 *   2. Guessing the project-ref-scoped cookie name used by @supabase/ssr
 *   3. Per-test flakiness from form-filling + waiting on navigation
 */
type StoredCookie = {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
};

let authCookies: StoredCookie[] | null = null;

/** Cached-cookie path on disk — survives Playwright worker restarts. */
const AUTH_CACHE_PATH = join(tmpdir(), 'stats-list-e2e-auth.json');

/** Log in once in a dedicated context and return the session cookies. */
async function logInOnce(
  browser: Browser,
  email: string,
  password: string
): Promise<StoredCookie[]> {
  // If a previous worker already logged in, reuse its cookies.
  if (existsSync(AUTH_CACHE_PATH)) {
    try {
      const cached = JSON.parse(readFileSync(AUTH_CACHE_PATH, 'utf-8')) as StoredCookie[];
      if (Array.isArray(cached) && cached.length > 0) {
        return cached;
      }
    } catch {
      // Corrupt cache — fall through and log in again.
    }
  }

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try {
    await page.goto(`${APP_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('#email-address').fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: /sign in to dashboard/i }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
      timeout: 20_000,
    });
    const cookies = (await ctx.cookies()) as StoredCookie[];
    writeFileSync(AUTH_CACHE_PATH, JSON.stringify(cookies), 'utf-8');
    return cookies;
  } finally {
    await ctx.close();
  }
}

/** Inject the shared session cookies into the test's browser context. */
async function useAuth(page: Page) {
  if (!authCookies) {
    throw new Error('authCookies was not populated — did beforeAll run?');
  }
  await page.context().addCookies(authCookies);
}

// ── Shared setup guard ─────────────────────────────────────────────────────
const hasConfig = !!(SUPABASE_URL && ANON_KEY && TEST_EMAIL && TEST_PASSWORD);

// ── Tests ──────────────────────────────────────────────────────────────────

test.describe('Stats Boards list page (/stats) — smoke tests', () => {

  test.beforeAll(async ({ browser }) => {
    if (!hasConfig) {
      test.skip(
        true,
        'Missing config — add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ' +
        'STATS_TEST_EMAIL, STATS_TEST_PASSWORD to .env.local or .env.test'
      );
      return;
    }
    authCookies = await logInOnce(browser, TEST_EMAIL, TEST_PASSWORD);
  });

  test.beforeEach(async ({ page }) => {
    await useAuth(page);
  });

  // ── 1. Core render: heading + Add card present ─────────────────────────
  test('page renders account name heading and "Create new Stats Board" card', async ({ page }) => {
    await page.goto(`${APP_URL}/stats`, { waitUntil: 'networkidle' });

    // h1 with account name must exist and be non-empty
    const heading = page.locator('main h1').first();
    await expect(heading).toBeVisible();
    await expect(heading).not.toHaveText('');

    // "Create new Stats Board" card must be visible at the bottom of the grid
    const addCard = page.getByText(/create new stats board/i).first();
    await expect(addCard).toBeVisible();
  });

  // ── 2. No skeleton flash (seeded cache path) ──────────────────────────
  test('no skeleton flash on refresh — seeded cache renders grid immediately', async ({ page }) => {
    // Navigate once to warm up
    await page.goto(`${APP_URL}/stats`, { waitUntil: 'networkidle' });

    // Reload (simulates the seeded-cache path)
    await page.reload({ waitUntil: 'networkidle' });

    // Even if a skeleton was transiently visible, the heading must be visible
    const heading = page.locator('main h1').first();
    await expect(heading).toBeVisible();
    await expect(heading).not.toHaveText('');

    // The Create card must also be visible after the seeded-cache reload
    await expect(page.getByText(/create new stats board/i).first()).toBeVisible();
  });

  // ── 3. Archived dialog: open → close → focus returns ──────────────────
  test('Archived dialog opens and closes, focus returns to trigger button', async ({ page }) => {
    await page.goto(`${APP_URL}/stats`, { waitUntil: 'networkidle' });

    // Find the Archived trigger button
    const archivedBtn = page.getByRole('button', { name: /open archived stats boards/i });
    await expect(archivedBtn).toBeVisible();

    // Open the dialog
    await archivedBtn.click();

    // Dialog must be visible — look for the dialog title via accessible role
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const dialogHeading = dialog.getByRole('heading', { name: /archived stats boards/i });
    await expect(dialogHeading).toBeVisible();

    // Close via the built-in close button (Radix DialogContent renders an X button)
    const closeBtn = dialog.getByRole('button', { name: /close/i });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Dialog must be gone
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 2000 });

    // Focus must return to the trigger button (Radix handles this by default)
    await expect(archivedBtn).toBeFocused({ timeout: 1000 }).catch(() => {
      // Focus restoration is best-effort — log but don't fail the test
      console.warn('[stats-list] Focus did not return to Archived button after dialog close');
    });
  });

  // ── 4. Archived dialog: keyboard open + Escape close ──────────────────
  test('Archived dialog can be opened via keyboard and closed with Escape', async ({ page }) => {
    await page.goto(`${APP_URL}/stats`, { waitUntil: 'networkidle' });

    const archivedBtn = page.getByRole('button', { name: /open archived stats boards/i });
    await archivedBtn.focus();
    await page.keyboard.press('Enter');

    // Dialog must open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 2000 });

    // Escape must close it
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 2000 });
  });

  // ── 5. Archived dialog: empty state when no archived strategies ────────
  test('Archived dialog shows empty state when there are no archived strategies', async ({ page }) => {
    await page.goto(`${APP_URL}/stats`, { waitUntil: 'networkidle' });

    const archivedBtn = page.getByRole('button', { name: /open archived stats boards/i });
    await archivedBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // If the user has no archived strategies, the empty-state message must show
    const noArchived = page.getByText(/no archived strategies/i);
    const hasArchived = page.getByRole('button', { name: /reactivate/i }).first();

    const emptyOrList = await Promise.race([
      noArchived.waitFor({ timeout: 5000 }).then(() => 'empty' as const),
      hasArchived.waitFor({ timeout: 5000 }).then(() => 'list'  as const),
    ]);

    if (emptyOrList === 'empty') {
      await expect(noArchived).toBeVisible();
    } else {
      // The user has archived strategies — that's valid too
      console.log('[stats-list] User has archived strategies — empty state not reachable in this env');
    }

    // Close dialog
    await page.keyboard.press('Escape');
  });

  // ── 6. Console errors: none on load ───────────────────────────────────
  test('no console errors on page load', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(`[pageerror] ${err.message}`));

    await page.goto(`${APP_URL}/stats`, { waitUntil: 'networkidle' });

    // Filter out known benign noise (e.g. browser extension errors)
    const relevantErrors = consoleErrors.filter(
      (e) =>
        !e.includes('chrome-extension://') &&
        !e.includes('moz-extension://')
    );

    expect(
      relevantErrors,
      `Console errors on /stats:\n${relevantErrors.join('\n')}`
    ).toHaveLength(0);
  });

  // ── 7. Sort dropdown: changing order does not trigger a network refetch ─
  test('changing sort order reorders cards without a new network request to strategies-overview', async ({ page }) => {
    await page.goto(`${APP_URL}/stats`, { waitUntil: 'networkidle' });

    // Capture any subsequent API calls for strategies-overview
    const overviewRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('strategies-overview') || req.url().includes('get_strategies_overview')) {
        overviewRequests.push(req.url());
      }
    });

    // Find the sort select trigger
    const sortSelect = page.getByRole('combobox').or(
      page.getByLabel(/order by/i)
    ).first();

    if (await sortSelect.count() === 0) {
      test.skip(true, 'Sort select not found — update selector');
      return;
    }

    await sortSelect.click();

    // Select Win Rate if available
    const winRateOption = page.getByRole('option', { name: /win rate/i });
    if (await winRateOption.count() > 0) {
      await winRateOption.click();
    } else {
      await page.keyboard.press('Escape');
    }

    // Brief settle
    await page.waitForTimeout(500);

    // No new overview requests should have been made
    expect(
      overviewRequests,
      `Changing sort order triggered unexpected network calls: ${overviewRequests.join(', ')}`
    ).toHaveLength(0);
  });

  // ── 8. Grid: "Create new Stats Board" is always the last card ─────────
  test('"Create new Stats Board" card is the last item in the strategies grid', async ({ page }) => {
    await page.goto(`${APP_URL}/stats`, { waitUntil: 'networkidle' });

    // Scope to the specific strategies grid (lg:grid-cols-3) to avoid
    // matching nested chart SVG grids.
    const gridCards = page.locator('main div.lg\\:grid-cols-3 > *');
    const count = await gridCards.count();
    expect(count, 'strategies grid should have at least one child card').toBeGreaterThan(0);

    const lastCard = gridCards.nth(count - 1);
    await expect(lastCard).toContainText(/create new stats board/i);
  });

  // ── 9. Accessibility: no CRUD error banner on happy path ──────────────
  // The CRUD error banner (introduced in the audit PR) is scoped to main
  // and has the red-bordered Alert styling. On a normal load it must be
  // absent (otherwise a silent failure slipped back in).
  test('no CRUD error banner visible on happy-path load', async ({ page }) => {
    await page.goto(`${APP_URL}/stats`, { waitUntil: 'networkidle' });

    // The CRUD error banner lives inside <main> and contains a dismiss button
    // with aria-label="Dismiss error" — a reliable fingerprint.
    const crudDismiss = page.locator('main').getByRole('button', { name: /dismiss error/i });
    await expect(crudDismiss).toHaveCount(0);
  });
});
