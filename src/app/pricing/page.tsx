import type { Metadata } from 'next';
import { PricingPageClient } from './PricingPageClient';
import { buildPageMetadata } from '@/constants/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbSchema, buildPricingProductSchema } from '@/constants/schemas';

export const metadata: Metadata = buildPageMetadata({
  title: 'Pricing',
  description:
    'Choose the right plan for your trading journey. Free starter, $7.99 Starter Plus, or $11.99 Pro with full analytics, AI vision, and trade ledger.',
  path: '/pricing',
});

export default function PricingPage() {
  const productSchema = buildPricingProductSchema();
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Pricing', path: '/pricing' },
  ]);
  return (
    <>
      {productSchema && <JsonLd payload={productSchema} />}
      <JsonLd payload={breadcrumbSchema} />
      <PricingPageClient />
    </>
  );
}
