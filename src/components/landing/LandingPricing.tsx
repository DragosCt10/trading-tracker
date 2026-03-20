'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BillingUpgradeCard } from '@/components/settings/BillingUpgradeCard';
import { TIER_DEFINITIONS } from '@/constants/tiers';
import type { BillingPeriod } from '@/types/subscription';
import { createPublicCheckoutUrl } from '@/lib/server/subscription';

const PRO_HIGHLIGHTS = [
  'Unlimited strategies',
  'Daily Journal & trade notes',
  'Equity Curve chart',
  'Live & Backtesting account modes',
  'Full analytics dashboard (Sharpe, drawdown, consistency)',
  'Public strategy sharing',
  'Priority support',
];

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

  const proDef = TIER_DEFINITIONS.pro;
  const monthlyPrice = proDef.pricing.monthly?.usd ?? 0;
  const annualPrice = proDef.pricing.annual?.usd ?? 0;
  const savings = proDef.pricing.annual?.savingsPct ?? 20;

  const themedGradientStyle = {
    background: 'linear-gradient(to right, var(--tc-primary), var(--tc-accent), var(--tc-accent-end))',
    boxShadow:
      '0 10px 15px -3px color-mix(in oklab, var(--tc-primary) 30%, transparent), 0 4px 6px -4px color-mix(in oklab, var(--tc-primary) 20%, transparent)',
  } as const;

  return (
    <div className="mx-auto max-w-3xl">
      <BillingUpgradeCard
        isPro={false}
        billingPeriod={billingPeriod}
        setBillingPeriod={setBillingPeriod}
        monthlyPrice={monthlyPrice}
        annualPrice={annualPrice}
        savings={savings}
        isCheckoutPending={isCheckoutPending}
        onUpgrade={handleUpgrade}
        highlights={PRO_HIGHLIGHTS}
        themedGradientStyle={themedGradientStyle}
      />
    </div>
  );
}
