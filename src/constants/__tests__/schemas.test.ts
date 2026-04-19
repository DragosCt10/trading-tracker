import { describe, it, expect } from 'vitest';
import {
  organizationSchema,
  softwareApplicationSchema,
  buildBreadcrumbSchema,
  buildPricingProductSchema,
} from '@/constants/schemas';
import { SITE_URL } from '@/constants/seo';

describe('organizationSchema', () => {
  it('has the required schema.org fields', () => {
    expect(organizationSchema['@context']).toBe('https://schema.org');
    expect(organizationSchema['@type']).toBe('Organization');
    expect(organizationSchema.name).toBe('AlphaStats');
    expect(organizationSchema.url).toBe(SITE_URL);
    expect(organizationSchema.logo).toContain('/alpha-stats-logo-light.png');
  });
});

describe('softwareApplicationSchema', () => {
  it('declares a non-empty featureList for AI Overview eligibility', () => {
    const features = softwareApplicationSchema.featureList as string[];
    expect(Array.isArray(features)).toBe(true);
    expect(features.length).toBeGreaterThan(3);
  });

  it('has a free Offer (the starter tier)', () => {
    expect(softwareApplicationSchema.offers).toMatchObject({
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    });
  });

  it('does NOT include aggregateRating (to avoid manual-action risk until real review data exists)', () => {
    expect(softwareApplicationSchema.aggregateRating).toBeUndefined();
  });
});

describe('buildBreadcrumbSchema', () => {
  it('builds a BreadcrumbList with 1-based positions', () => {
    const result = buildBreadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Pricing', path: '/pricing' },
    ]);
    expect(result['@type']).toBe('BreadcrumbList');
    const items = result.itemListElement as Array<{ position: number; name: string; item: string }>;
    expect(items).toHaveLength(2);
    expect(items[0].position).toBe(1);
    expect(items[0].name).toBe('Home');
    expect(items[0].item).toBe(`${SITE_URL}/`);
    expect(items[1].position).toBe(2);
    expect(items[1].item).toBe(`${SITE_URL}/pricing`);
  });
});

describe('buildPricingProductSchema', () => {
  it('emits a Product with monthly + annual Pro offers sourced from tiers.ts regular prices', () => {
    const result = buildPricingProductSchema();
    expect(result).not.toBeNull();
    expect(result!['@type']).toBe('Product');
    const offers = result!.offers as Array<{ price: string; priceCurrency: string }>;
    expect(offers).toHaveLength(2);
    // Regular Pro prices from src/constants/tiers.ts: $11.99 and $114.99.
    const prices = offers.map((o) => o.price);
    expect(prices).toContain('11.99');
    expect(prices).toContain('114.99');
    for (const offer of offers) {
      expect(offer.priceCurrency).toBe('USD');
    }
  });

  it('includes an absolute `image` URL (required by Google for Product rich results)', () => {
    const result = buildPricingProductSchema();
    const images = result!.image as string[];
    expect(Array.isArray(images)).toBe(true);
    expect(images.length).toBeGreaterThan(0);
    for (const img of images) {
      expect(img).toMatch(/^https:\/\//);
    }
  });
});
