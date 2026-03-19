'use client';

import { useState, useTransition } from 'react';
import { Lock, Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createCheckoutUrl } from '@/lib/server/subscription';
import { TIER_DEFINITIONS } from '@/constants/tiers';
import type { BillingPeriod } from '@/types/subscription';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

const PRO_HIGHLIGHTS = [
  'Unlimited strategies',
  'Daily Journal & trade notes',
  'Future Equity Chart',
  'Live & Backtesting account modes',
  'Full analytics dashboard',
  'Public strategy sharing',
];

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export function PaywallModal({
  open,
  onClose,
  title = 'Upgrade to PRO',
  description = 'Get full access to all features and no limits.',
}: PaywallModalProps) {
  const router = useRouter();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [isPending, startTransition] = useTransition();

  const proDef = TIER_DEFINITIONS.pro;
  const monthlyPrice = proDef.pricing.monthly?.usd ?? 0;
  const annualPrice = proDef.pricing.annual?.usd ?? 0;
  const savings = proDef.pricing.annual?.savingsPct ?? 20;

  const priceLabel =
    billingPeriod === 'monthly'
      ? `$${monthlyPrice}/month`
      : `$${annualPrice}/year`;

  function handleUpgrade() {
    startTransition(async () => {
      try {
        const url = await createCheckoutUrl(billingPeriod);
        router.push(url);
      } catch (err) {
        console.error('Checkout error:', err);
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent className="max-w-md border-zinc-800 bg-zinc-950 p-0">
        {/* Amber accent line */}
        <div className="h-0.5 w-full rounded-t-lg bg-gradient-to-r from-amber-500/0 via-amber-500 to-amber-500/0" />

        <div className="space-y-5 px-6 pb-6 pt-5">
          {/* Header */}
          <AlertDialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-500/30">
                <Lock className="h-4 w-4 text-amber-400" />
              </div>
              <AlertDialogTitle className="text-base font-semibold text-white">
                {title}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-zinc-400">
              {description}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Billing toggle */}
          <div className="flex rounded-lg border border-zinc-800 bg-zinc-900 p-1">
            {(['monthly', 'annual'] as BillingPeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setBillingPeriod(period)}
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  billingPeriod === period
                    ? 'bg-zinc-700 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                {period === 'monthly' ? 'Monthly' : `Annual · Save ${savings}%`}
              </button>
            ))}
          </div>

          {/* Feature list */}
          <ul className="space-y-2">
            {PRO_HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-zinc-300">
                <Check className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                {item}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Button
            onClick={handleUpgrade}
            disabled={isPending}
            className="w-full bg-amber-500 text-zinc-950 hover:bg-amber-400 disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Upgrade to PRO — {priceLabel}
          </Button>

          {/* Footer note */}
          <p className="text-center text-xs text-zinc-500">
            No credit card to use the free plan · Cancel anytime
          </p>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

