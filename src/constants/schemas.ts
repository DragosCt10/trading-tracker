import { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION, canonicalUrl } from '@/constants/seo';
import { TIER_DEFINITIONS } from '@/constants/tiers';

/**
 * Schema.org payloads emitted as JSON-LD via <JsonLd /> server component.
 *
 * All prices sourced from src/constants/tiers.ts (regular prices — NOT
 * promo.ts, which is a temporary campaign). Variant IDs are not prices.
 */

export const organizationSchema: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/alpha-stats-logo-light.png`,
  description: DEFAULT_DESCRIPTION,
};

const APP_FEATURES = [
  'Trade journaling for forex, stocks, crypto, and futures',
  'Risk analytics and Sharpe ratio tracking',
  'Strategy backtesting with equity curves',
  'AI Vision trade analysis',
  'Daily journal with mood and discipline metrics',
  'Custom stats builder',
  'Multi-account tracking (live, demo, backtesting)',
  'CSV trade import',
  'Public trade and strategy sharing',
];

export const softwareApplicationSchema: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  url: SITE_URL,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  description: DEFAULT_DESCRIPTION,
  featureList: APP_FEATURES,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
};

export function buildPricingProductSchema(): Record<string, unknown> | null {
  const pro = TIER_DEFINITIONS.pro;
  const monthly = pro.pricing.monthly;
  const annual = pro.pricing.annual;
  if (!monthly?.usd || !annual?.usd) {
    // Fail closed: no partial schema.
    return null;
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${SITE_NAME} Pro`,
    description:
      'Full analytics, AI Vision, daily journal, unlimited trades, public sharing, and priority support.',
    brand: { '@type': 'Brand', name: SITE_NAME },
    url: canonicalUrl('/pricing'),
    // Required by Google for Product rich-result eligibility.
    // thumbnail.jpg is the 1200x630 branded marketing asset in /public.
    image: [`${SITE_URL}/thumbnail.jpg`],
    offers: [
      {
        '@type': 'Offer',
        name: `${SITE_NAME} Pro — Monthly`,
        price: monthly.usd.toFixed(2),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: canonicalUrl('/pricing'),
      },
      {
        '@type': 'Offer',
        name: `${SITE_NAME} Pro — Annual`,
        price: annual.usd.toFixed(2),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: canonicalUrl('/pricing'),
      },
    ],
  };
}

export function buildBreadcrumbSchema(
  items: Array<{ name: string; path: string }>,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  };
}
