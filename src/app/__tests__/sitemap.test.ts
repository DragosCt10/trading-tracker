import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SITE_URL } from '@/constants/seo';

const ORIGINAL_ENV = { ...process.env };

async function loadSitemap() {
  // Re-import for each test to pick up env changes at module-eval time.
  const mod = await import('@/app/sitemap');
  return mod.default;
}

describe('sitemap', () => {
  beforeEach(() => {
    // Clear module cache so `isProduction` re-evaluates per test.
    // vitest resets modules between files; within a file we force reload.
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('returns an empty array in non-production (no leak of URLs in previews)', async () => {
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'development';
    // Re-import fresh so the module-level isProduction uses the new env.
    const { default: sitemap } = await import(`@/app/sitemap?nonprod=${Date.now()}`);
    const result = sitemap();
    expect(result).toEqual([]);
  });

  it('emits all 8 public routes in production with absolute URLs', async () => {
    process.env.VERCEL_ENV = 'production';
    const { default: sitemap } = await import(`@/app/sitemap?prod=${Date.now()}`);
    const result = sitemap();

    expect(result).toHaveLength(8);
    const urls = result.map((entry: { url: string }) => entry.url);
    expect(urls).toContain(`${SITE_URL}/`);
    expect(urls).toContain(`${SITE_URL}/pricing`);
    expect(urls).toContain(`${SITE_URL}/help`);
    expect(urls).toContain(`${SITE_URL}/affiliates`);
    expect(urls).toContain(`${SITE_URL}/contact`);
    expect(urls).toContain(`${SITE_URL}/terms-of-service`);
    expect(urls).toContain(`${SITE_URL}/privacy-policy`);
    expect(urls).toContain(`${SITE_URL}/refund-policy`);

    // Every URL must be absolute (start with https://).
    for (const u of urls) {
      expect(u).toMatch(/^https:\/\//);
    }
  });

  it('assigns priority 1.0 to the root route', async () => {
    process.env.VERCEL_ENV = 'production';
    const { default: sitemap } = await import(`@/app/sitemap?priority=${Date.now()}`);
    const result = sitemap();
    const root = result.find((e: { url: string }) => e.url === `${SITE_URL}/`);
    expect(root?.priority).toBe(1.0);
  });

  it('includes lastModified + changeFrequency for every entry', async () => {
    process.env.VERCEL_ENV = 'production';
    const { default: sitemap } = await import(`@/app/sitemap?modify=${Date.now()}`);
    const result = sitemap();
    for (const entry of result) {
      expect(entry.lastModified).toBeInstanceOf(Date);
      expect(entry.changeFrequency).toBeDefined();
    }
  });
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});
