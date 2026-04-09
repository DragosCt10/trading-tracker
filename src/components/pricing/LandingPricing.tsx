'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BillingUpgradeCard } from '@/components/settings/BillingUpgradeCard';
import type { BillingPeriod } from '@/types/subscription';
import { createPublicCheckoutUrl } from '@/lib/server/subscription';

export function LandingPricing() {
  const router = useRouter();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('annual');
  const [isCheckoutPending, setIsCheckoutPending] = useState(false);

  async function handleUpgrade() {
    setIsCheckoutPending(true);
    try {
      const url = await createPublicCheckoutUrl(billingPeriod);
      router.push(url);
    } catch {
      setIsCheckoutPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <BillingUpgradeCard
        isPro={false}
        billingPeriod={billingPeriod}
        setBillingPeriod={setBillingPeriod}
        isCheckoutPending={isCheckoutPending}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
}
