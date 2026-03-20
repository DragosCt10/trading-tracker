'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Loader2, Lock } from 'lucide-react';
import {
  cancelCurrentSubscription,
  createCheckoutUrl,
  createPortalUrl,
  getLatestInvoiceUrl,
  verifyAndActivateSubscription,
} from '@/lib/server/subscription';
import { useSubscription } from '@/hooks/useSubscription';
import { useUserDetails } from '@/hooks/useUserDetails';
import { TIER_DEFINITIONS } from '@/constants/tiers';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { BillingPeriod, ResolvedSubscription } from '@/types/subscription';
import { BillingCurrentPlanCard } from '@/components/settings/BillingCurrentPlanCard';
import { BillingUpgradeCard } from '@/components/settings/BillingUpgradeCard';

const PRO_HIGHLIGHTS = [
  'Unlimited strategies',
  'Daily Journal & trade notes',
  'Equity Curve chart',
  'Live & Backtesting account modes',
  'Full analytics dashboard (Sharpe, drawdown, consistency)',
  'Public strategy sharing',
  'Priority support',
];

interface BillingSettingsPanelProps {
  initialSubscription: ResolvedSubscription;
  justPaid: boolean;
  featureContext?: string;
  showHeader?: boolean;
}

export function BillingSettingsPanel({
  initialSubscription,
  justPaid,
  featureContext,
  showHeader = false,
}: BillingSettingsPanelProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: userDetails } = useUserDetails();
  const userId = userDetails?.user?.id;
  const { tier, subscription, isFetching: isSubscriptionFetching } = useSubscription({ userId });
  const [hasHydrated, setHasHydrated] = useState(false);
  const effectiveSubscription =
    hasHydrated && userId ? (subscription ?? initialSubscription) : initialSubscription;
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

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setHasHydrated(true);
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!justPaid || !userId) return;
    if (tier !== 'starter') return;

    let attempts = 0;
    const maxAttempts = 40;

    const interval = setInterval(async () => {
      if (isSubscriptionFetching) return;
      attempts += 1;
      if (attempts > maxAttempts) {
        clearInterval(interval);
        return;
      }

      try {
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
        alert('You have an admin-granted plan - contact support to make billing changes.');
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
    <div className="w-full">
      {showHeader && (
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/70 dark:bg-slate-800/30 shadow-sm">
                <CreditCard className="h-4.5 w-4.5 text-[var(--tc-primary)]" />
              </span>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Billing</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Manage your subscription and plan.
            </p>
          </div>
        </div>
      )}

      {showProcessingBanner && effectiveTier === 'starter' && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-300 backdrop-blur-sm">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>Payment processing... your plan will update in a few seconds.</span>
        </div>
      )}

      {featureContext && !isPro && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-600 dark:text-blue-300 backdrop-blur-sm">
          <Lock className="h-4 w-4 shrink-0" />
          <span>
            Upgrade to PRO to unlock <strong>{featureContext.replace(/-/g, ' ')}</strong>.
          </span>
        </div>
      )}

      <BillingCurrentPlanCard
        isPro={isPro}
        resolvedSub={resolvedSub}
        isPortalPending={isPortalPending}
        isCancelPending={isCancelPending}
        isInvoicePending={isInvoicePending}
        onPortal={handlePortal}
        onInvoice={handleInvoice}
        onCancelSubscription={handleCancelSubscription}
      />

      <BillingUpgradeCard
        isPro={isPro}
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
