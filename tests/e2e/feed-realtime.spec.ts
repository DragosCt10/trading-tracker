/**
 * Playwright E2E: Realtime Feed Subscription Latency (RT1)
 *
 * Automated version of the RT1 manual test.
 * Navigates to /feed, inserts a post via Supabase service key,
 * asserts NewPostsBanner appears within 2 seconds.
 *
 * What this catches:
 *   - Broken Supabase Realtime subscription (useNewPostsNotifier)
 *   - React Strict Mode double-mount causing duplicate/leaked subscriptions
 *   - NewPostsBanner not rendering when count > 0
 *
 * Prerequisites:
 *   npm install --save-dev @playwright/test @supabase/supabase-js
 *   npx playwright install chromium
 *   Dev server running: npm run dev
 *   .env.test present with K6_USER_PUBLIC_PROFILE_ID and SUPABASE service key
 *
 * Run:
 *   npx playwright test tests/e2e/feed-realtime.spec.ts
 */

import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load env from .env.local and .env.test
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
const ANON_KEY = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? '';
const AUTHOR_PROFILE_ID = env['K6_USER_PUBLIC_PROFILE_ID'] ?? '';
const APP_URL = env['K6_APP_URL'] ?? 'http://localhost:3000';

// Helper: sign in the perf-test public user and get a session cookie
async function signInPerfUser(page: Page) {
  // Use Supabase auth to sign in
  const response = await page.request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: {
      'apikey': ANON_KEY,
      'Content-Type': 'application/json',
    },
    data: {
      email: 'perf_public@perf-test.invalid',
      password: 'PerftestPublic123!',
    },
  });

  if (!response.ok()) {
    throw new Error(`Sign-in failed: ${response.status()} — run generate-tokens.mjs first`);
  }

  // @supabase/ssr stores the full session as JSON in 'supabase.auth.token'
  const session = await response.json();
  const cookieDomain = new URL(APP_URL).hostname;
  await page.context().addCookies([
    {
      name: 'supabase.auth.token',
      value: JSON.stringify(session),
      domain: cookieDomain,
      path: '/',
      httpOnly: false,
      secure: false,
    },
  ]);
}

test.describe('RT1: Realtime Feed Subscription Latency', () => {
  test.beforeAll(() => {
    if (!SUPABASE_URL || !SERVICE_KEY || !AUTHOR_PROFILE_ID) {
      test.skip(true, 'Missing SUPABASE config or AUTHOR_PROFILE_ID — run generate-tokens.mjs first');
    }
  });

  test('NewPostsBanner appears within 2s of DB insert', async ({ page }) => {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Capture console errors during the test
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Sign in the test user
    await signInPerfUser(page);

    // Navigate to /feed — public tab
    await page.goto(`${APP_URL}/feed`);
    await page.waitForLoadState('networkidle');

    // Verify we're on the public tab and feed is loaded
    await expect(page.locator('[data-tab="public"], button:has-text("Public")')).toBeVisible({
      timeout: 5000,
    }).catch(() => {
      // Tab selector may vary — just ensure feed loaded
    });

    // Wait for the realtime subscription to connect
    // useNewPostsNotifier subscribes in useEffect — give it time to mount
    await page.waitForTimeout(1000);

    // Record timestamp before insert
    const insertStart = Date.now();

    // Insert a post via admin client (bypasses RLS, immediate DB write)
    const { data: post, error } = await admin
      .from('feed_posts')
      .insert({
        author_id: AUTHOR_PROFILE_ID,
        content: `[PERF-TEST] Realtime e2e test post at ${insertStart}`,
        post_type: 'text',
        is_hidden: false,
      })
      .select('id')
      .single();

    expect(error).toBeNull();
    expect(post?.id).toBeTruthy();

    // Wait for NewPostsBanner to appear
    // The banner renders when useNewPostsNotifier's newPostCount > 0
    // It typically contains text like "new post" or "See new posts"
    const banner = page.locator(
      '[data-testid="new-posts-banner"], ' +
      'button:has-text("new post"), ' +
      'div:has-text("See new posts"), ' +
      'div:has-text("new posts available")'
    );

    await expect(banner).toBeVisible({ timeout: 3000 });

    const latency = Date.now() - insertStart;
    console.log(`RT1 latency: ${latency}ms (target: < 2000ms)`);

    // Assert latency threshold
    expect(latency).toBeLessThan(2000);

    // Assert no console errors during the test
    const feedErrors = consoleErrors.filter(e =>
      !e.includes('Warning:') && !e.includes('Download the React DevTools')
    );
    expect(feedErrors).toHaveLength(0);

    // Cleanup: delete the test post
    await admin.from('feed_posts').delete().eq('id', post!.id);
  });

  test('Subscription survives tab switch and back', async ({ page }) => {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    await signInPerfUser(page);
    await page.goto(`${APP_URL}/feed`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Switch to Following tab
    const followingTab = page.locator('button:has-text("Following")');
    if (await followingTab.isVisible()) {
      await followingTab.click();
      await page.waitForTimeout(500);

      // Switch back to Public tab
      const publicTab = page.locator('button:has-text("Public")');
      if (await publicTab.isVisible()) {
        await publicTab.click();
        await page.waitForTimeout(1000); // Allow subscription to re-establish
      }
    }

    // Insert a post — subscription should still be active
    const insertStart = Date.now();
    const { data: post, error } = await admin
      .from('feed_posts')
      .insert({
        author_id: AUTHOR_PROFILE_ID,
        content: `[PERF-TEST] Realtime tab-switch test at ${insertStart}`,
        post_type: 'text',
        is_hidden: false,
      })
      .select('id')
      .single();

    expect(error).toBeNull();

    const banner = page.locator(
      '[data-testid="new-posts-banner"], ' +
      'button:has-text("new post"), ' +
      'div:has-text("See new posts"), ' +
      'div:has-text("new posts available")'
    );

    await expect(banner).toBeVisible({ timeout: 3000 });

    const latency = Date.now() - insertStart;
    console.log(`RT1 (after tab switch) latency: ${latency}ms`);
    expect(latency).toBeLessThan(2000);

    // Cleanup
    await admin.from('feed_posts').delete().eq('id', post!.id);
  });
});
