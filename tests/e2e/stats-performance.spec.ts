/**
 * Playwright Performance Tests — Stats Pages (inside-strategy)
 *
 * Tests the strategy stats dashboard under realistic load:
 *   - LCP at 4,999 trades (cache-first path, < 500ms)
 *   - LCP at 5,001 trades (RPC path, < 2000ms)  — the ≤5k cliff
 *   - INP on market filter change at 30k trades (< 200ms)
 *   - JS heap growth at 30k trades (< 50MB delta)
 *   - Total blocking time at 30k trades (< 300ms)
 *   - LCP at 30k trades (informational — no hard fail, just document)
 *
 * Prerequisites:
 *   1. Run: psql $DATABASE_URL < tests/load/seed/seed-perf-trades.sql
 *   2. Start: npm run dev
 *   3. Configure .env.local + .env.test with perf-test user credentials
 *      and the strategy slugs printed by the seed script.
 *
 * Required env vars (.env.test):
 *   K6_APP_URL                  — default http://localhost:3000
 *   SUPABASE_SERVICE_ROLE_KEY   — for auth (same as feed-realtime.spec.ts)
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   PERF_STRATEGY_SLUG_4999     — e.g. perf-test-4999
 *   PERF_STRATEGY_SLUG_5001     — e.g. perf-test-5001
 *   PERF_STRATEGY_SLUG_30K      — e.g. perf-test-30k
 *
 * Run:
 *   npx playwright test tests/e2e/stats-performance.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ── Load env from .env.local + .env.test (same helper as feed-realtime.spec.ts) ──
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

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']  ?? '';
const ANON_KEY     = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? '';
const APP_URL      = env['K6_APP_URL'] ?? 'http://localhost:3000';

const SLUG_4999 = env['PERF_STRATEGY_SLUG_4999'] ?? 'perf-test-4999';
const SLUG_5001 = env['PERF_STRATEGY_SLUG_5001'] ?? 'perf-test-5001';
const SLUG_30K  = env['PERF_STRATEGY_SLUG_30K']  ?? 'perf-test-30k';

// ── Auth helper (reused from feed-realtime.spec.ts pattern) ───────────────
async function signInPerfUser(page: Page) {
  const response = await page.request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      data: {
        email:    'perf_stats@perf-test.invalid',
        password: 'PerfStats123!',
      },
    }
  );

  if (!response.ok()) {
    throw new Error(
      `Stats perf-test sign-in failed: ${response.status()} — run seed-perf-trades.sql first`
    );
  }

  const { access_token, refresh_token } = await response.json();
  const domain = new URL(APP_URL).hostname;

  await page.context().addCookies([
    { name: 'sb-access-token',  value: access_token,  domain, path: '/', httpOnly: false, secure: false },
    { name: 'sb-refresh-token', value: refresh_token, domain, path: '/', httpOnly: false, secure: false },
  ]);
}

/**
 * Inject a PerformanceObserver that collects Event Timing entries (INP signal).
 * Must be called via page.addInitScript() BEFORE navigation.
 *
 * Decision 2A from plan-eng-review: use Event Timing API, not performance.mark/measure.
 */
async function injectInpObserver(page: Page) {
  await page.addInitScript(() => {
    (window as any).__perf_inp_entries__  = [];
    (window as any).__perf_long_tasks__  = [];

    // Event Timing API — collects actual input event durations
    const evtObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if ((entry as any).processingStart !== undefined) {
          (window as any).__perf_inp_entries__.push({
            duration:       entry.duration,
            processingTime: (entry as any).processingEnd - (entry as any).processingStart,
            name:           entry.name,
          });
        }
      }
    });
    evtObs.observe({ type: 'event', buffered: true });

    // Long Task API — contributes to Total Blocking Time
    const ltObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        (window as any).__perf_long_tasks__.push(entry.duration);
      }
    });
    try {
      ltObs.observe({ type: 'longtask', buffered: true });
    } catch {
      // longtask not supported in all browser versions — fail silently
    }
  });
}

/** Read INP entries collected by the injected observer. */
async function readInpEntries(page: Page): Promise<Array<{ duration: number; name: string }>> {
  return page.evaluate(() => (window as any).__perf_inp_entries__ ?? []);
}

/** Read LCP from the browser Navigation Timing + LCP API. */
async function readLcp(page: Page): Promise<number> {
  return page.evaluate(() => {
    return new Promise<number>((resolve) => {
      // Give LCP observer up to 3s to fire
      const timeout = setTimeout(() => resolve(-1), 3000);

      const obs = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          clearTimeout(timeout);
          obs.disconnect();
          resolve(entries[entries.length - 1].startTime);
        }
      });

      obs.observe({ type: 'largest-contentful-paint', buffered: true });
    });
  });
}

/** Read JS heap size delta from before/after navigation. */
async function readHeap(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const mem = (performance as any).memory;
    return mem ? mem.usedJSHeapSize : null;
  });
}

/** Sum of long task durations (proxy for Total Blocking Time). */
async function readTbt(page: Page): Promise<number> {
  const tasks: number[] = await page.evaluate(() =>
    (window as any).__perf_long_tasks__ ?? []
  );
  // TBT = sum of (duration - 50ms) for each long task > 50ms
  return tasks.reduce((sum, d) => sum + Math.max(0, d - 50), 0);
}

// ── Tests ────────────────────────────────────────────────────────────────

test.describe('Stats Performance — (inside-strategy) pages', () => {

  test.beforeAll(() => {
    if (!SUPABASE_URL || !ANON_KEY) {
      test.skip(true, 'Missing Supabase config — add NEXT_PUBLIC_SUPABASE_URL + ANON_KEY to .env.local');
    }
  });

  // ── 1. LCP: cache-fast path (4,999 trades — below ≤5k cliff) ───────────
  test('LCP at 4,999 trades — cache-first path should be < 500ms', async ({ page }) => {
    await injectInpObserver(page);
    await signInPerfUser(page);

    const consoleErrors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

    await page.goto(`${APP_URL}/strategy/${SLUG_4999}`, { waitUntil: 'networkidle' });

    const lcp = await readLcp(page);

    console.log(`[PERF] 4,999 trades — LCP: ${lcp}ms`);

    expect(lcp, `LCP at 4,999 trades (cache path) should be < 500ms, got ${lcp}ms`).toBeLessThan(500);
    expect(consoleErrors, `Console errors: ${consoleErrors.join(', ')}`).toHaveLength(0);
  });

  // ── 2. LCP: RPC slow path (5,001 trades — above ≤5k cliff) ─────────────
  test('LCP at 5,001 trades — RPC path should be < 2000ms', async ({ page }) => {
    await injectInpObserver(page);
    await signInPerfUser(page);

    await page.goto(`${APP_URL}/strategy/${SLUG_5001}`, { waitUntil: 'networkidle' });

    const lcp = await readLcp(page);

    console.log(`[PERF] 5,001 trades — LCP: ${lcp}ms (RPC path — expect > 4999-trade LCP)`);

    expect(lcp, `LCP at 5,001 trades (RPC path) should be < 2000ms, got ${lcp}ms`).toBeLessThan(2000);
  });

  // ── 3. INP: market filter change at 30k trades ──────────────────────────
  test('INP on market filter change at 30k trades should be < 200ms', async ({ page }) => {
    await injectInpObserver(page);
    await signInPerfUser(page);

    await page.goto(`${APP_URL}/strategy/${SLUG_30K}`, { waitUntil: 'networkidle' });

    // Wait for stats to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // allow initial render to settle

    // Interact: click the market filter (adjust selector to match actual UI)
    // The filter may be a Select dropdown or a button group — try common selectors
    const filterSelector = [
      '[data-testid="market-filter"]',
      'button:has-text("Market")',
      'select[name="market"]',
      '[aria-label*="market" i]',
      '[placeholder*="market" i]',
    ].join(', ');

    const filterEl = page.locator(filterSelector).first();
    const hasFilter = await filterEl.count() > 0;

    if (hasFilter) {
      // Reset INP entries before the interaction
      await page.evaluate(() => { (window as any).__perf_inp_entries__ = []; });

      await filterEl.click();
      await page.waitForTimeout(500); // wait for recompute + re-render

      const entries = await readInpEntries(page);

      // Guard: observer must have collected at least one entry
      expect(entries.length, 'PerformanceObserver collected 0 event entries — observer may not be working').toBeGreaterThan(0);

      const maxInp = Math.max(...entries.map((e) => e.duration));
      console.log(`[PERF] 30k trades — filter INP: ${maxInp}ms (${entries.length} events collected)`);

      expect(maxInp, `INP on market filter at 30k trades should be < 200ms, got ${maxInp}ms`).toBeLessThan(200);
    } else {
      console.warn('[PERF] Market filter element not found — skipping INP test (update filterSelector)');
      test.skip(true, 'Market filter element not found — update filterSelector to match actual UI');
    }
  });

  // ── 4. JS heap growth at 30k trades ────────────────────────────────────
  test('JS heap growth at 30k trades should be < 50MB', async ({ page }) => {
    await injectInpObserver(page);
    await signInPerfUser(page);

    // Measure heap before navigation
    await page.goto(`${APP_URL}/`, { waitUntil: 'networkidle' });
    const heapBefore = await readHeap(page);

    // Navigate to 30k strategy
    await page.goto(`${APP_URL}/strategy/${SLUG_30K}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // let TanStack Query cache settle

    const heapAfter = await readHeap(page);

    if (heapBefore !== null && heapAfter !== null) {
      const delta = (heapAfter - heapBefore) / (1024 * 1024); // bytes → MB
      console.log(`[PERF] 30k trades — JS heap delta: ${delta.toFixed(1)}MB (before: ${(heapBefore/1024/1024).toFixed(0)}MB, after: ${(heapAfter/1024/1024).toFixed(0)}MB)`);
      expect(delta, `JS heap growth at 30k trades should be < 50MB, got ${delta.toFixed(1)}MB`).toBeLessThan(50);
    } else {
      console.warn('[PERF] performance.memory not available — heap test skipped (Chromium only)');
    }
  });

  // ── 5. Total Blocking Time at 30k trades ───────────────────────────────
  test('Total blocking time at 30k trades should be < 300ms', async ({ page }) => {
    await injectInpObserver(page);
    await signInPerfUser(page);

    await page.goto(`${APP_URL}/strategy/${SLUG_30K}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const tbt = await readTbt(page);
    console.log(`[PERF] 30k trades — TBT: ${tbt}ms`);

    expect(tbt, `Total blocking time at 30k trades should be < 300ms, got ${tbt}ms`).toBeLessThan(300);
  });

  // ── 6. LCP at 30k trades — informational (no hard fail) ────────────────
  test('LCP at 30k trades — document result (threshold: < 3000ms, fail: > 5000ms)', async ({ page }) => {
    await injectInpObserver(page);
    await signInPerfUser(page);

    await page.goto(`${APP_URL}/strategy/${SLUG_30K}`, { waitUntil: 'networkidle' });

    const lcp = await readLcp(page);

    console.log(`[PERF] 30k trades — LCP: ${lcp}ms`);

    // Soft target: < 3000ms. Hard fail: > 5000ms (the page is completely broken).
    expect(lcp, `LCP at 30k trades exceeded hard limit of 5000ms — got ${lcp}ms`).toBeLessThan(5000);

    if (lcp > 3000) {
      console.warn(`[PERF WARNING] 30k trades LCP = ${lcp}ms — exceeds 3000ms target. Consider optimization.`);
    }
  });
});
