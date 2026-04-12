import type { Metadata } from 'next';
import { PublicPageShell } from '@/components/shared/PublicPageShell';
import { AffiliatesPageClient } from './AffiliatesPageClient';

export const metadata: Metadata = {
  title: 'Affiliates | AlphaStats',
  description:
    'Partner with AlphaStats. Earn a recurring commission on every trader you refer to the best trading journal for serious traders.',
  openGraph: {
    title: 'Affiliates | AlphaStats',
    description:
      'Partner with AlphaStats. Earn a recurring commission on every trader you refer to the best trading journal for serious traders.',
    url: '/affiliates',
    siteName: 'AlphaStats',
    images: [{ url: '/thumbnail.jpg', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Affiliates | AlphaStats',
    description:
      'Partner with AlphaStats. Earn a recurring commission on every trader you refer to the best trading journal for serious traders.',
    images: ['/thumbnail.jpg'],
  },
};

export default function AffiliatesPage() {
  return (
    <PublicPageShell>
      <AffiliatesPageClient />
    </PublicPageShell>
  );
}
