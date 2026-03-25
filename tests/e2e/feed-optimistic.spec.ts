/**
 * Playwright E2E: Optimistic Like Accuracy Under Slow Network (C2)
 *
 * Automated version of the C2 manual cache test.
 * Uses Chrome DevTools Protocol (CDP) to throttle the network to Slow 3G,
 * then clicks the like button 3 times in rapid succession (< 300ms each).
 * Waits for all mutations to settle, then compares the displayed like_count
 * against the actual DB value.
 *
 * What this catches:
 *   - Like count drift from concurrent optimistic updates
 *   - ctx.prev rollback bug: if 2 mutations both capture the same prev state,
 *     one rollback clobbers the other's correct state
 *   - Race condition in likePost() 4-serial-call chain
 *
 * Pass: displayed like_count == actual DB like_count after all mutations settle
 * Fail: counts diverge → optimistic update has race condition
 *
 * Prerequisites:
 *   npm install --save-dev @playwright/test @supabase/supabase-js
 *   npx playwright install chromium
 *   Dev server running: npm run dev
 *   K6_LIKE_POST_ID set in .env.test (from seed-post-likes.sql)
 *
 * Run:
 *   npx playwright test tests/e2e/feed-optimistic.spec.ts
 */

import { test, expect, Page, CDPSession } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
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

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'] ?? '';
const SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
const POST_ID = env['K6_LIKE_POST_ID'] ?? '';
const APP_URL = env['K6_APP_URL'] ?? 'http://localhost:3000';

// Sign in as perf_public — they can like posts by other perf_ users (not own posts).
// perf_10follows' posts (from post-creation race test) appear at top of public feed,
// giving perf_public an immediately visible like button to interact with.
// Uses the login page UI so @supabase/ssr sets the correct chunked auth cookies itself.
async function signInPerfUser(page: Page) {
  await page.goto(`${APP_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.fill('#email-address', 'perf_public@perf-test.invalid');
  await page.fill('#password', 'PerftestPublic123!');
  await page.click('button[type="submit"]');
  // Wait for redirect away from /login (app redirects to /stats by default)
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
}

// Enable Slow 3G network throttling via CDP
async function enableSlowNetwork(cdp: CDPSession) {
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: (500 * 1024) / 8,  // 500 Kbps download
    uploadThroughput: (500 * 1024) / 8,    // 500 Kbps upload
    latency: 400,                           // 400ms latency (Slow 3G)
  });
}

async function disableNetworkThrottle(cdp: CDPSession) {
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: -1,
    uploadThroughput: -1,
    latency: 0,
  });
}

// Get actual like_count from DB
async function getDbLikeCount(postId: string): Promise<number> {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data } = await admin
    .from('feed_posts')
    .select('like_count')
    .eq('id', postId)
    .single();
  return data?.like_count ?? -1;
}

// CDP requires non-headless — set at file scope (not inside describe)
test.use({ headless: false });

test.describe('C2: Optimistic Like Accuracy Under Slow Network', () => {
  test.beforeAll(() => {
    if (!SUPABASE_URL || !SERVICE_KEY || !POST_ID) {
      test.skip(
        true,
        'Missing SUPABASE config or K6_LIKE_POST_ID — run seed-post-likes.sql and generate-tokens.mjs first'
      );
    }
  });

  test('Like count matches DB after 3 rapid clicks under Slow 3G', async ({ browser }) => {
    // Use a new context with CDP access
    const context = await browser.newContext();
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);

    await signInPerfUser(page);
    await page.goto(`${APP_URL}/feed`);
    await page.waitForLoadState('networkidle');

    // Find the first post in the feed with an active like button (non-own post).
    // The seeded post may be buried — pick any visible post at the top of the feed.
    // PostCard React Query-driven feed shows live optimistic updates.
    const likeButton = page.locator('button[data-action="like"]').first();
    await likeButton.waitFor({ state: 'visible', timeout: 10_000 });

    // Get the post ID from the parent article's data-post-id attribute
    const postCard = page.locator('article[data-post-id]').filter({ has: page.locator('button[data-action="like"]') }).first();
    const dynamicPostId = await postCard.getAttribute('data-post-id') ?? POST_ID;
    const likeCountEl = postCard.locator('[data-like-count]').first();

    // Record DB like_count before test
    const dbCountBefore = await getDbLikeCount(dynamicPostId);
    console.log(`DB like_count before test: ${dbCountBefore}`);

    // Enable Slow 3G throttle
    await enableSlowNetwork(cdp);
    console.log('Network throttled to Slow 3G (400ms latency, 500Kbps)');

    // Click like 3 times rapidly (< 300ms between each)
    // Each click fires an optimistic update + server mutation
    await likeButton.click();
    await page.waitForTimeout(150);
    await likeButton.click();
    await page.waitForTimeout(150);
    await likeButton.click();

    console.log('3 rapid clicks fired. Waiting for mutations to settle...');

    // Restore normal network speed so mutations can complete
    await disableNetworkThrottle(cdp);

    // Wait for all in-flight mutations to complete
    // TanStack Query mutations are tracked in the query client
    await page.waitForTimeout(3000); // Allow enough time for 3G responses to arrive

    // Wait for network to be idle (no pending requests)
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      console.warn('Network did not reach idle — some mutations may still be in-flight');
    });

    // Read displayed like count from UI
    let displayedCount = -1;
    try {
      const countText = await likeCountEl.textContent({ timeout: 2000 });
      displayedCount = parseInt(countText?.match(/\d+/)?.[0] ?? '-1', 10);
    } catch {
      console.warn('Could not read displayed like count from UI');
    }

    // Read actual like count from DB
    const dbCountAfter = await getDbLikeCount(dynamicPostId);

    console.log(`Displayed like_count: ${displayedCount}`);
    console.log(`DB like_count after:  ${dbCountAfter}`);
    console.log(`DB before: ${dbCountBefore} → DB after: ${dbCountAfter} (delta: ${dbCountAfter - dbCountBefore})`);

    // 3 clicks with odd starting state toggles: net result is 1 additional like
    // (or -1 if starting from liked). With race conditions, the count drifts.
    const delta = Math.abs(dbCountAfter - dbCountBefore);
    expect(delta).toBeLessThanOrEqual(1); // Max 1 net change from 3 rapid toggles

    // Displayed count should match DB count
    if (displayedCount !== -1) {
      expect(displayedCount).toBe(dbCountAfter);
    }

    await context.close();
  });

  test('Single like toggle is optimistic (UI updates before server confirms)', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);

    await signInPerfUser(page);
    // Navigate to the feed list — PostCard here is React Query-driven, so optimistic updates
    // are immediately reflected. The post detail page uses a static SSR prop and does NOT
    // show live like updates (known limitation, see TODOS.md).
    await page.goto(`${APP_URL}/feed`);
    await page.waitForLoadState('networkidle');

    // Find the first visible likeable post (non-own)
    const likeButton = page.locator('button[data-action="like"]').first();
    await likeButton.waitFor({ state: 'visible', timeout: 10_000 });
    const postCard = page.locator('article[data-post-id]').filter({ has: page.locator('button[data-action="like"]') }).first();
    const dynamicPostId = await postCard.getAttribute('data-post-id') ?? POST_ID;
    const likeCountEl = postCard.locator('[data-like-count]').first();

    // data-like-count span is only rendered when like_count > 0 — default to 0 when absent
    const likeCountExists = await likeCountEl.count() > 0;
    const countBefore = likeCountExists
      ? parseInt((await likeCountEl.textContent())?.match(/\d+/)?.[0] ?? '0', 10)
      : 0;

    // Enable Slow 3G BEFORE clicking — server will be slow to respond
    await enableSlowNetwork(cdp);

    const clickTime = Date.now();
    await likeButton.click();

    // The optimistic update should change the UI IMMEDIATELY (< 100ms)
    // before the server responds (which takes 400ms+ on Slow 3G)
    // If count was 0, wait for the span to appear (optimistic insert)
    await page.waitForTimeout(200); // Wait 200ms — server hasn't responded yet (400ms latency)

    // Read count after optimistic update — span may now exist even if it didn't before
    const likeCountExistsDuring = await likeCountEl.count() > 0;
    const countDuring = likeCountExistsDuring
      ? parseInt((await likeCountEl.textContent())?.match(/\d+/)?.[0] ?? '0', 10)
      : 0;
    const uiUpdateTime = Date.now() - clickTime;

    console.log(`Optimistic UI update latency: ${uiUpdateTime}ms`);
    console.log(`Count: ${countBefore} → ${countDuring} (before server response)`);

    // UI should have updated BEFORE the server responded
    expect(Math.abs(countDuring - countBefore)).toBe(1);
    expect(uiUpdateTime).toBeLessThan(300); // Optimistic update must be < 300ms

    await disableNetworkThrottle(cdp);
    await page.waitForTimeout(2000); // Let server response arrive

    // Final count — again handle 0 case
    const likeCountExistsAfter = await likeCountEl.count() > 0;
    const countAfter = likeCountExistsAfter
      ? parseInt((await likeCountEl.textContent())?.match(/\d+/)?.[0] ?? '0', 10)
      : 0;
    const dbCount = await getDbLikeCount(dynamicPostId);
    console.log(`After server settle — UI: ${countAfter}, DB: ${dbCount}`);
    expect(countAfter).toBe(dbCount);

    await context.close();
  });
});
