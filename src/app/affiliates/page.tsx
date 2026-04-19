import type { Metadata } from 'next';
import { PublicPageShell } from '@/components/shared/PublicPageShell';
import { AffiliatesPageClient } from './AffiliatesPageClient';
import { buildPageMetadata } from '@/constants/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Affiliates',
  description:
    'Partner with AlphaStats. Earn a recurring commission on every trader you refer to the best trading journal for serious traders.',
  path: '/affiliates',
});

export default function AffiliatesPage() {
  return (
    <PublicPageShell>
      <AffiliatesPageClient />
    </PublicPageShell>
  );
}
