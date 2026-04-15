'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BillingUpgradeCard } from '@/components/settings/BillingUpgradeCard';
import type { BillingPeriod, TierId } from '@/types/subscription';
import { createPublicCheckoutUrl } from '@/lib/server/subscription';

type PaidTierId = Extract<TierId, 'starter_plus' | 'pro'>;

export function LandingPricing() {
  const router = useRouter();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('annual');
  const [isCheckoutPending, setIsCheckoutPending] = useState(false);
  const [pendingCheckoutTier, setPendingCheckoutTier] = useState<PaidTierId | null>(null);

  async function handleUpgrade(tier: PaidTierId) {
    setIsCheckoutPending(true);
    setPendingCheckoutTier(tier);
    try {
      const url = await createPublicCheckoutUrl(tier, billingPeriod);
      router.push(url);
    } catch {
      setIsCheckoutPending(false);
      setPendingCheckoutTier(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <BillingUpgradeCard
        isPro={false}
        billingPeriod={billingPeriod}
        setBillingPeriod={setBillingPeriod}
        isCheckoutPending={isCheckoutPending}
        pendingCheckoutTier={pendingCheckoutTier}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
}
