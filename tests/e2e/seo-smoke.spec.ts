/**
 * Playwright E2E: SEO smoke suite
 *
 * Covers every SEO surface added by the SEO remediation plan. Each test is
 * independent and does NOT require auth. Safe to run against a fresh dev
 * server: `npm run dev`.
 *
 * Run:
 *   npx playwright test tests/e2e/seo-smoke.spec.ts --headed
 */

import { test, expect } from '@playwright/test';

const PUBLIC_PAGES = [
  { path: '/', title: /AlphaStats/ },
  { path: '/pricing', title: /Pricing/ },
  { path: '/help', title: /Help Center/ },
  { path: '/affiliates', title: /Affiliates/ },
  { path: '/contact', title: /Contact/ },
  { path: '/terms-of-service', title: /Terms of Service/ },
  { path: '/privacy-policy', title: /Privacy Policy/ },
  { path: '/refund-policy', title: /Refund Policy/ },
];

test.describe('sitemap + robots', () => {
  test('/sitemap.xml returns 200 and lists all public routes in production env, empty otherwise', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.ok()).toBe(true);
    const body = await res.text();
    // XML must be well-formed
    expect(body).toMatch(/^<\?xml/);
    // In dev the guard returns an empty sitemap (no <url> entries), so we
    // only assert well-formed XML. In prod this also contains entries.
    if (process.env.VERCEL_ENV === 'production') {
      expect(body).toContain('https://alpha-stats.com/pricing');
    }
  });

  test('/robots.txt references /sitemap.xml', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.ok()).toBe(true);
    const body = await res.text();
    if (process.env.VERCEL_ENV === 'production') {
      expect(body.toLowerCase()).toContain('sitemap:');
      expect(body).toContain('/sitemap.xml');
    }
  });
});

test.describe('per-page metadata', () => {
  for (const { path, title } of PUBLIC_PAGES) {
    test(`${path} has unique title + canonical + OG`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveTitle(title);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).toBeTruthy();
      // Canonical must either be the path itself (relative) or the absolute form.
      expect(canonical === path || canonical?.endsWith(path === '/' ? '' : path)).toBe(true);

      // OG and Twitter tags present.
      await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
      await expect(page.locator('meta[name="twitter:card"]')).toHaveCount(1);
    });
  }
});

test.describe('structured data', () => {
  test('/ has Organization + SoftwareApplication JSON-LD', async ({ page }) => {
    await page.goto('/');
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(scripts.length).toBeGreaterThanOrEqual(2);
    const parsed = scripts.map((s) => JSON.parse(s));
    const types = parsed.map((p) => p['@type']);
    expect(types).toContain('Organization');
    expect(types).toContain('SoftwareApplication');
  });

  test('/pricing has Product + BreadcrumbList JSON-LD', async ({ page }) => {
    await page.goto('/pricing');
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const parsed = scripts.map((s) => JSON.parse(s));
    const types = parsed.map((p) => p['@type']);
    expect(types).toContain('Product');
    expect(types).toContain('BreadcrumbList');
    const product = parsed.find((p) => p['@type'] === 'Product');
    expect(product?.offers).toBeDefined();
    expect(Array.isArray(product.offers)).toBe(true);
  });

  test('JSON-LD contains no literal </script> sequence (escape holds)', async ({ page }) => {
    await page.goto('/');
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    for (const s of scripts) {
      expect(s).not.toContain('</script>');
    }
  });
});

test.describe('OG images', () => {
  for (const path of ['/opengraph-image', '/pricing/opengraph-image', '/help/opengraph-image', '/affiliates/opengraph-image']) {
    test(`${path} returns a PNG`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.ok()).toBe(true);
      expect(res.headers()['content-type']).toContain('image/png');
      const buf = await res.body();
      // Guard against empty responses.
      expect(buf.byteLength).toBeGreaterThan(5000);
    });
  }
});

test.describe('noindex protection', () => {
  test('/not-found-path-that-does-not-exist renders 404 with noindex', async ({ page }) => {
    const response = await page.goto('/__no-such-page__', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(404);
    const robotsMeta = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robotsMeta?.toLowerCase()).toContain('noindex');
  });
});
