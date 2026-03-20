'use client';

import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { BillingPeriod } from '@/types/subscription';

interface BillingUpgradeCardProps {
  isPro: boolean;
  billingPeriod: BillingPeriod;
  setBillingPeriod: (period: BillingPeriod) => void;
  monthlyPrice: number;
  annualPrice: number;
  savings: number;
  isCheckoutPending: boolean;
  onUpgrade: () => void;
  highlights: string[];
  themedGradientStyle: React.CSSProperties;
}

export function BillingUpgradeCard({
  isPro,
  billingPeriod,
  setBillingPeriod,
  monthlyPrice,
  annualPrice,
  savings,
  isCheckoutPending,
  onUpgrade,
  highlights,
  themedGradientStyle,
}: BillingUpgradeCardProps) {
  if (isPro) return null;

  return (
    <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-6">
      <div className="h-0.5 w-full rounded-full bg-gradient-to-r from-[var(--tc-primary)]/0 via-[var(--tc-primary)] to-[var(--tc-primary)]/0 mb-6" />

      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-1">
        Upgrade to PRO
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
        Unlock every feature with no limits.
      </p>

      <div className="flex gap-1 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-900/20 p-1 mb-5 backdrop-blur-sm">
        {(['monthly', 'annual'] as BillingPeriod[]).map((period) => (
          <button
            key={period}
            onClick={() => setBillingPeriod(period)}
            className={cn(
              'flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors capitalize !shadow-none cursor-pointer',
              billingPeriod === period
                ? 'text-slate-900 dark:text-slate-50 shadow-sm border border-slate-200/70 dark:border-slate-700/50 bg-white dark:bg-slate-800/30'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            {period === 'monthly'
              ? `Monthly — $${monthlyPrice}/mo`
              : `Annual — $${annualPrice}/yr · Save ${savings}%`}
          </button>
        ))}
      </div>

      <ul className="space-y-2 mb-5">
        {highlights.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <Check className="h-3.5 w-3.5 shrink-0 text-[var(--tc-primary)]" />
            {item}
          </li>
        ))}
      </ul>

      <Button
        onClick={onUpgrade}
        disabled={isCheckoutPending}
        className="w-full relative h-12 overflow-hidden rounded-2xl border-0 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 group disabled:opacity-60"
        style={themedGradientStyle}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {isCheckoutPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Upgrade to PRO — {billingPeriod === 'monthly' ? `$${monthlyPrice}/month` : `$${annualPrice}/year`}
        </span>
        {!isCheckoutPending && (
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
        )}
      </Button>

      <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
        No credit card needed for the free plan · Cancel anytime
      </p>
    </div>
  );
}
