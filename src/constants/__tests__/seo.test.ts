import { describe, it, expect } from 'vitest';
import { SITE_URL, canonicalUrl, buildPageMetadata } from '@/constants/seo';

describe('canonicalUrl', () => {
  it('returns the apex with trailing slash for root path (matches sitemap.ts convention)', () => {
    expect(canonicalUrl('/')).toBe(`${SITE_URL}/`);
  });

  it('joins apex with relative path', () => {
    expect(canonicalUrl('/pricing')).toBe(`${SITE_URL}/pricing`);
  });

  it('adds leading slash when missing', () => {
    expect(canonicalUrl('pricing')).toBe(`${SITE_URL}/pricing`);
  });

  it('strips a trailing slash on non-root paths', () => {
    expect(canonicalUrl('/pricing/')).toBe(`${SITE_URL}/pricing`);
  });

  it('passes absolute URLs through unchanged', () => {
    expect(canonicalUrl('https://example.com/foo')).toBe('https://example.com/foo');
    expect(canonicalUrl('http://example.com/bar')).toBe('http://example.com/bar');
  });
});

describe('buildPageMetadata', () => {
  it('returns consistent canonical/OG/Twitter for a non-root page', () => {
    const meta = buildPageMetadata({
      title: 'Pricing',
      description: 'Pricing desc',
      path: '/pricing',
    });
    expect(meta.title).toBe('Pricing');
    expect(meta.description).toBe('Pricing desc');
    expect(meta.alternates?.canonical).toBe('/pricing');
    expect(meta.openGraph).toMatchObject({
      title: 'Pricing',
      description: 'Pricing desc',
      url: `${SITE_URL}/pricing`,
      siteName: 'AlphaStats',
      type: 'website',
      locale: 'en_US',
    });
    expect(meta.twitter).toMatchObject({
      card: 'summary_large_image',
      title: 'Pricing',
      description: 'Pricing desc',
    });
  });

  it('uses `absolute` title for the root path so the `%s | AlphaStats` template is bypassed', () => {
    const meta = buildPageMetadata({
      title: 'AlphaStats — home',
      description: 'Home desc',
      path: '/',
    });
    expect(meta.title).toEqual({ absolute: 'AlphaStats — home' });
    expect(meta.alternates?.canonical).toBe('/');
    expect(meta.openGraph?.url).toBe(`${SITE_URL}/`);
  });

  it('emits an en_US locale in openGraph', () => {
    const meta = buildPageMetadata({
      title: 'Help',
      description: 'desc',
      path: '/help',
    });
    expect(meta.openGraph?.locale).toBe('en_US');
  });
});
