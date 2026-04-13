import { PricingPageClient } from './PricingPageClient';
import { getEarlyBirdSlotsUsed } from '@/lib/server/earlyBird';

export const metadata = {
  title: 'Pricing | AlphaStats',
  description: 'Choose the right plan for your trading journey. From free starter to full pro analytics.',
};

export default async function PricingPage() {
  const earlyBirdSlotsUsed = await getEarlyBirdSlotsUsed();
  return <PricingPageClient earlyBirdSlotsUsed={earlyBirdSlotsUsed} />;
}
