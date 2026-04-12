import type { Metadata } from 'next';
import { PublicPageShell } from '@/components/shared/PublicPageShell';
import { getCachedUserSession } from '@/lib/server/session';
import { lookupAffiliateByEmail } from '@/lib/server/affiliatesLookup';
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

export default async function AffiliatesPage() {
  const { user } = await getCachedUserSession();

  const prefillEmail = user?.email ?? null;
  const prefillName =
    typeof user?.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : typeof user?.user_metadata?.name === 'string'
        ? user.user_metadata.name
        : '';

  // If the user is logged in, check Lemon Squeezy for their affiliate state.
  // Safe fallback: on any error we default to 'none' and render the application form.
  const affiliateLookup = prefillEmail
    ? await lookupAffiliateByEmail(prefillEmail)
    : { status: 'none' as const };

  const isAffiliate = affiliateLookup.status === 'active';
  const hubUrl = affiliateLookup.status === 'active' ? affiliateLookup.hubUrl : null;

  return (
    <PublicPageShell>
      <AffiliatesPageClient
        prefillEmail={prefillEmail}
        prefillName={prefillName}
        isAffiliate={isAffiliate}
        hubUrl={hubUrl}
      />
    </PublicPageShell>
  );
}
