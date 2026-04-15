import { PricingPageClient } from './PricingPageClient';
import { getEarlyBirdSlotsUsed } from '@/lib/server/earlyBird';
import { isAddonAvailable } from '@/constants/addons';

export const metadata = {
  title: 'Pricing | AlphaStats',
  description: 'Choose the right plan for your trading journey. From free starter to full pro analytics.',
};

export default async function PricingPage() {
  const earlyBirdSlotsUsed = await getEarlyBirdSlotsUsed();
  // ER-1: compute add-on availability on the server so the variant ID never
  // reaches the client bundle. The AddonCard only renders when this is true.
  const starterPlusAvailable = isAddonAvailable('starter_plus');
  return (
    <PricingPageClient
      earlyBirdSlotsUsed={earlyBirdSlotsUsed}
      starterPlusAvailable={starterPlusAvailable}
    />
  );
}
