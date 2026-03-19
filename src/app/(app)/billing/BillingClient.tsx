'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, CreditCard, ExternalLink, Loader2, Lock, AlertCircle, Ban, FileText } from 'lucide-react';
import { createCheckoutUrl, createPortalUrl, cancelCurrentSubscription, getLatestInvoiceUrl, verifyAndActivateSubscription } from '@/lib/server/subscription';
import { useSubscription } from '@/hooks/useSubscription';
import { useUserDetails } from '@/hooks/useUserDetails';
import { TIER_DEFINITIONS } from '@/constants/tiers';
import type { ResolvedSubscription, BillingPeriod } from '@/types/subscription';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

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
  const queryClient = useQueryClient();
  const { data: userDetails } = useUserDetails();
  const userId = userDetails?.user?.id;
  const { tier, subscription, refetchSubscription, isFetching: isSubscriptionFetching } = useSubscription({ userId });
  const [hasHydrated, setHasHydrated] = useState(false);
  const effectiveSubscription = hasHydrated && userId ? (subscription ?? initialSubscription) : initialSubscription;
  const effectiveTier = effectiveSubscription.tier;
  const isPro = effectiveTier !== 'starter';

  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('annual');
  const [isCheckoutPending, startCheckoutTransition] = useTransition();
  const [isPortalPending, startPortalTransition] = useTransition();
  const [isCancelPending, startCancelTransition] = useTransition();
  const [isInvoicePending, startInvoiceTransition] = useTransition();
  const [showProcessingBanner, setShowProcessingBanner] = useState(
    justPaid && initialSubscription.tier === 'starter'
  );

  // Clean checkout return params so server action POSTs don't keep using success URL forever.
  useEffect(() => {
    if (!justPaid || typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    const hadSuccess = url.searchParams.has('success');
    const hadCustomerSessionToken = url.searchParams.has('customer_session_token');
    if (!hadSuccess && !hadCustomerSessionToken) return;

    url.searchParams.delete('success');
    url.searchParams.delete('customer_session_token');
    const query = url.searchParams.toString();
    const nextUrl = `${url.pathname}${query ? `?${query}` : ''}${url.hash}`;
    window.history.replaceState(null, '', nextUrl);
  }, [justPaid]);

  // Ensure the first client render matches SSR output exactly to avoid hydration
  // mismatch when React Query cache still holds stale pre-payment subscription data.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setHasHydrated(true);
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  // Poll for upgrade after payment. Uses direct Polar API verification to bypass webhook latency.
  // Stops automatically once tier is no longer starter. Max 40 attempts (~80s).
  useEffect(() => {
    if (!justPaid || !userId) return;
    if (tier !== 'starter') return;

    let attempts = 0;
    const MAX_ATTEMPTS = 40;

    const interval = setInterval(async () => {
      if (isSubscriptionFetching) return;
      attempts += 1;
      if (attempts > MAX_ATTEMPTS) {
        clearInterval(interval);
        return;
      }

      try {
        // verifyAndActivateSubscription checks Polar API directly, bypassing webhook lag.
        const updated = await verifyAndActivateSubscription(userId);
        if (updated.tier !== 'starter') {
          queryClient.setQueryData(queryKeys.subscription(userId), updated);
          setShowProcessingBanner(false);
          clearInterval(interval);
        }
      } catch {
        // Silently retry on error
      }
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [justPaid, userId, tier, isSubscriptionFetching, queryClient]);

  const resolvedSub = effectiveSubscription;
  const proDef = TIER_DEFINITIONS.pro;
  const monthlyPrice = proDef.pricing.monthly?.usd ?? 0;
  const annualPrice = proDef.pricing.annual?.usd ?? 0;
  const savings = proDef.pricing.annual?.savingsPct ?? 20;

  const themedGradientStyle = {
    background: 'linear-gradient(to right, var(--tc-primary), var(--tc-accent), var(--tc-accent-end))',
    boxShadow:
      '0 10px 15px -3px color-mix(in oklab, var(--tc-primary) 30%, transparent), 0 4px 6px -4px color-mix(in oklab, var(--tc-primary) 20%, transparent)',
  } as const;

  function handleUpgrade() {
    startCheckoutTransition(async () => {
      const url = await createCheckoutUrl(billingPeriod);
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

  function handleCancelSubscription() {
    const shouldCancelNow = window.confirm(
      'Cancel subscription immediately? Access is revoked right away and this cannot be undone.'
    );
    if (!shouldCancelNow) return;

    startCancelTransition(async () => {
      const result = await cancelCurrentSubscription();
      if (!result.ok) {
        alert(result.message ?? 'Unable to cancel subscription right now.');
        return;
      }

      if (result.userId && result.subscription) {
        // Synchronously update cache with server-calculated post-cancel state before navigating.
        queryClient.setQueryData(queryKeys.subscription(result.userId), result.subscription);
      }

      router.push('/stats');
    });
  }

  function handleInvoice() {
    startInvoiceTransition(async () => {
      const invoice = await getLatestInvoiceUrl();
      if (invoice.status === 'ready' && invoice.invoiceUrl) {
        window.open(invoice.invoiceUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      if (invoice.status === 'scheduled') {
        alert('Invoice generation is queued. Please click again in a few seconds.');
        return;
      }
      alert('No recent order found for invoice generation.');
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-0">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/70 dark:bg-slate-800/30 shadow-sm">
              <CreditCard className="h-4.5 w-4.5 text-[var(--tc-primary)]" />
            </span>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
              Billing
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Manage your subscription and plan.
          </p>
        </div>
      </div>

      {/* Processing banner (post-checkout race condition) */}
      {showProcessingBanner && effectiveTier === 'starter' && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-300 backdrop-blur-sm">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>
            Payment processing… your plan will update in a few seconds.
            {/* Fallback message after 30s handled by timeout clearing interval */}
          </span>
        </div>
      )}

      {/* Upgrade context banner (came from a feature gate) */}
      {featureContext && !isPro && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-600 dark:text-blue-300 backdrop-blur-sm">
          <Lock className="h-4 w-4 shrink-0" />
          <span>Upgrade to PRO to unlock <strong>{featureContext.replace(/-/g, ' ')}</strong>.</span>
        </div>
      )}

      {/* Current plan card */}
      <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 mb-1">Current plan</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-50">
              {isPro ? 'PRO' : 'Starter (Free)'}
            </p>
            {isPro && resolvedSub.billingPeriod && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
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
          <CreditCard className="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500 mt-1" />
        </div>

        {isPro && (
          <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePortal}
                disabled={isPortalPending || isCancelPending || isInvoicePending}
                className="gap-2 h-10 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
              >
                {isPortalPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                Manage subscription
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleInvoice}
                disabled={isInvoicePending || isCancelPending || isPortalPending}
                className="gap-2 h-10 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
              >
                {isInvoicePending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                Invoice
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelSubscription}
                disabled={isCancelPending || isPortalPending || isInvoicePending}
                className="gap-2 h-10 rounded-2xl border border-rose-300/70 dark:border-rose-700/50 bg-rose-50/70 dark:bg-rose-950/20 backdrop-blur-xl text-rose-700 dark:text-rose-300 hover:bg-rose-100/80 dark:hover:bg-rose-900/30 transition-all duration-300"
              >
                {isCancelPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                Cancel now
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Upgrade card — only for non-PRO */}
      {!isPro && (
        <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-6">
          <div className="h-0.5 w-full rounded-full bg-gradient-to-r from-[var(--tc-primary)]/0 via-[var(--tc-primary)] to-[var(--tc-primary)]/0 mb-6" />

          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-1">Upgrade to PRO</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Unlock every feature with no limits.</p>

          {/* Billing toggle */}
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
                {period === 'monthly' ? `Monthly — $${monthlyPrice}/mo` : `Annual — $${annualPrice}/yr · Save ${savings}%`}
              </button>
            ))}
          </div>

          {/* Feature list */}
          <ul className="space-y-2 mb-5">
            {PRO_HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Check className="h-3.5 w-3.5 shrink-0 text-[var(--tc-primary)]" />
                {item}
              </li>
            ))}
          </ul>

          <Button
            onClick={handleUpgrade}
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
      )}
    </div>
  );
}
