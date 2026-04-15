'use client';

import type { BillingPeriod, TierId } from '@/types/subscription';
import { PricingComparison, BillingToggle } from '@/components/pricing/PricingComparison';
import { PaymentSecuredInfo } from '@/components/pricing/PaymentSecuredInfo';

type PaidTierId = Extract<TierId, 'starter_plus' | 'pro'>;

interface BillingUpgradeCardProps {
  isPro: boolean;
  billingPeriod: BillingPeriod;
  setBillingPeriod: (period: BillingPeriod) => void;
  isCheckoutPending: boolean;
  pendingCheckoutTier?: PaidTierId | null;
  onUpgrade: (tier: PaidTierId) => void;
}

export function BillingUpgradeCard({
  isPro,
  billingPeriod,
  setBillingPeriod,
  isCheckoutPending,
  pendingCheckoutTier = null,
  onUpgrade,
}: BillingUpgradeCardProps) {
  if (isPro) return null;

  return (
    <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-6">
      <div className="h-0.5 w-full rounded-full bg-gradient-to-r from-[var(--tc-primary)]/0 via-[var(--tc-primary)] to-[var(--tc-primary)]/0 mb-6" />

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-1">
            Upgrade to PRO
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Unlock every feature with no limits.
          </p>
        </div>
        <BillingToggle
          billingPeriod={billingPeriod}
          setBillingPeriod={setBillingPeriod}
          className="w-full sm:w-auto"
        />
      </div>

      <PricingComparison
        billingPeriod={billingPeriod}
        setBillingPeriod={setBillingPeriod}
        isCheckoutPending={isCheckoutPending}
        pendingCheckoutTier={pendingCheckoutTier}
        onCheckout={onUpgrade}
        hideStarterCTA
        hideToggle
      />

      <PaymentSecuredInfo className="mt-5" />

      <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
        No credit card needed for the free plan · Cancel anytime
      </p>
    </div>
  );
}
