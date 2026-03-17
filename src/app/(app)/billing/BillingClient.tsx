'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, CreditCard, ExternalLink, Loader2, Lock, AlertCircle } from 'lucide-react';
import { createCheckoutUrl, createPortalUrl } from '@/lib/server/subscription';
import { useSubscription } from '@/hooks/useSubscription';
import { useUserDetails } from '@/hooks/useUserDetails';
import { TIER_DEFINITIONS } from '@/constants/tiers';
import type { ResolvedSubscription, BillingPeriod } from '@/types/subscription';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PRO_HIGHLIGHTS = [
  'Unlimited strategies',
  'Daily Journal & trade notes',
  'Equity Curve chart',
  'Live & Backtesting account modes',
  'Full analytics dashboard (Sharpe, drawdown, consistency)',
  'Public strategy sharing',
  'Priority support',
];

interface BillingClientProps {
  subscription: ResolvedSubscription;
  justPaid: boolean;
  featureContext?: string;
}

export default function BillingClient({ subscription: initialSubscription, justPaid, featureContext }: BillingClientProps) {
  const router = useRouter();
  const { data: userDetails } = useUserDetails();
  const userId = userDetails?.user?.id;
  const { tier, subscription, refetchSubscription } = useSubscription({ userId });

  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('annual');
  const [isCheckoutPending, startCheckoutTransition] = useTransition();
  const [isPortalPending, startPortalTransition] = useTransition();
  const [processingBanner, setProcessingBanner] = useState(justPaid && (subscription?.tier ?? initialSubscription.tier) === 'starter');

  // Poll for PRO upgrade after payment (up to 30s)
  useEffect(() => {
    if (!justPaid || tier !== 'starter') return;
    setProcessingBanner(true);

    const interval = setInterval(() => {
      refetchSubscription();
    }, 3000);

    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 30_000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justPaid]);

  // Dismiss banner once tier upgrades
  useEffect(() => {
    if (tier !== 'starter') setProcessingBanner(false);
  }, [tier]);

  const resolvedSub = subscription ?? initialSubscription;
  const isPro = resolvedSub.tier !== 'starter';
  const proDef = TIER_DEFINITIONS.pro;
  const monthlyPrice = proDef.pricing.monthly?.usd ?? 0;
  const annualPrice = proDef.pricing.annual?.usd ?? 0;
  const savings = proDef.pricing.annual?.savingsPct ?? 20;

  function handleUpgrade() {
    const priceId =
      billingPeriod === 'monthly'
        ? (proDef.pricing.monthly?.polarPriceId ?? '')
        : (proDef.pricing.annual?.polarPriceId ?? '');

    startCheckoutTransition(async () => {
      const url = await createCheckoutUrl(priceId, billingPeriod);
      router.push(url);
    });
  }

  function handlePortal() {
    startPortalTransition(async () => {
      const url = await createPortalUrl();
      if (url) {
        router.push(url);
      } else {
        alert('You have an admin-granted plan — contact support to make billing changes.');
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-0">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-1">Billing</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Manage your subscription and plan.</p>

      {/* Processing banner (post-checkout race condition) */}
      {processingBanner && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>
            Payment processing… your plan will update in a few seconds.
            {/* Fallback message after 30s handled by timeout clearing interval */}
          </span>
        </div>
      )}

      {/* Upgrade context banner (came from a feature gate) */}
      {featureContext && !isPro && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-400">
          <Lock className="h-4 w-4 shrink-0" />
          <span>Upgrade to PRO to unlock <strong>{featureContext.replace(/-/g, ' ')}</strong>.</span>
        </div>
      )}

      {/* Current plan card */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1">Current plan</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-50">
              {isPro ? 'PRO' : 'Starter (Free)'}
            </p>
            {isPro && resolvedSub.billingPeriod && (
              <p className="text-sm text-zinc-500 mt-0.5">
                {resolvedSub.billingPeriod === 'monthly' ? 'Monthly billing' : 'Annual billing'}
                {resolvedSub.periodEnd && (
                  <> · {resolvedSub.cancelAtPeriodEnd ? 'Ends' : 'Renews'}{' '}
                    {resolvedSub.periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </>
                )}
              </p>
            )}
            {isPro && resolvedSub.cancelAtPeriodEnd && (
              <p className="mt-1 text-xs text-amber-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Your plan will not renew.
              </p>
            )}
          </div>
          <CreditCard className="h-5 w-5 shrink-0 text-zinc-400 mt-1" />
        </div>

        {isPro && (
          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePortal}
              disabled={isPortalPending}
              className="gap-1.5"
            >
              {isPortalPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
              Manage subscription
            </Button>
          </div>
        )}
      </div>

      {/* Upgrade card — only for non-PRO */}
      {!isPro && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          {/* Amber accent line */}
          <div className="h-0.5 w-full rounded-full bg-gradient-to-r from-amber-500/0 via-amber-500 to-amber-500/0 mb-6" />

          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-1">Upgrade to PRO</h2>
          <p className="text-sm text-zinc-500 mb-5">Unlock every feature with no limits.</p>

          {/* Billing toggle */}
          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 p-1 mb-5">
            {(['monthly', 'annual'] as BillingPeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setBillingPeriod(period)}
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  billingPeriod === period
                    ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                )}
              >
                {period === 'monthly' ? `Monthly — $${monthlyPrice}/mo` : `Annual — $${annualPrice}/yr · Save ${savings}%`}
              </button>
            ))}
          </div>

          {/* Feature list */}
          <ul className="space-y-2 mb-5">
            {PRO_HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <Check className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                {item}
              </li>
            ))}
          </ul>

          <Button
            onClick={handleUpgrade}
            disabled={isCheckoutPending}
            className="w-full bg-amber-500 text-zinc-950 hover:bg-amber-400 disabled:opacity-60 font-semibold"
          >
            {isCheckoutPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Upgrade to PRO — {billingPeriod === 'monthly' ? `$${monthlyPrice}/month` : `$${annualPrice}/year`}
          </Button>

          <p className="mt-3 text-center text-xs text-zinc-500">
            No credit card needed for the free plan · Cancel anytime
          </p>
        </div>
      )}
    </div>
  );
}
