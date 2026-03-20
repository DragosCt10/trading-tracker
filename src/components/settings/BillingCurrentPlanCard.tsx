'use client';

import { AlertCircle, Ban, CreditCard, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ResolvedSubscription } from '@/types/subscription';

interface BillingCurrentPlanCardProps {
  isPro: boolean;
  resolvedSub: ResolvedSubscription;
  monthlyPrice: number;
  annualPrice: number;
  isPortalPending: boolean;
  isCancelPending: boolean;
  isInvoicePending: boolean;
  onPortal: () => void;
  onInvoice: () => void;
  onCancelSubscription: () => void;
}

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function BillingCurrentPlanCard({
  isPro,
  resolvedSub,
  monthlyPrice,
  annualPrice,
  isPortalPending,
  isCancelPending,
  isInvoicePending,
  onPortal,
  onInvoice,
  onCancelSubscription,
}: BillingCurrentPlanCardProps) {
  const hasPriceData = resolvedSub.priceAmount != null;
  const periodLabel = resolvedSub.billingPeriod === 'annual' ? 'annually' : 'monthly';
  const currentPrice = hasPriceData
    ? `${formatPrice(resolvedSub.priceAmount!, resolvedSub.currency ?? 'usd')} /${periodLabel}`
    : resolvedSub.billingPeriod === 'annual'
      ? `$${annualPrice.toLocaleString('en-US')} /annually`
      : `$${monthlyPrice.toLocaleString('en-US')} /monthly`;
  const taxLine =
    hasPriceData && resolvedSub.taxAmount != null && resolvedSub.taxAmount > 0
      ? `incl. ${formatPrice(resolvedSub.taxAmount, resolvedSub.currency ?? 'usd')} tax`
      : null;

  return (
    <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-6 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 mb-1">
            Current plan
          </p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-50">
            {isPro ? 'PRO' : 'Starter (Free)'}
          </p>
          {isPro && resolvedSub.billingPeriod && (
            <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {currentPrice}
                {taxLine ? (
                  <span className="ml-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {taxLine}
                  </span>
                ) : hasPriceData ? null : (
                  <span className="ml-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    VAT included
                  </span>
                )}
              </p>
            </div>
          )}
          {isPro && resolvedSub.billingPeriod && (
            <div className="mt-2">
              {resolvedSub.periodEnd && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {resolvedSub.cancelAtPeriodEnd ? 'Ends' : 'Renews'} {periodLabel} on{' '}
                  {resolvedSub.periodEnd.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              )}
              {resolvedSub.cancelAtPeriodEnd && (
                <p className="mt-1 text-xs text-amber-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Your plan will not renew.
                </p>
              )}
            </div>
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
              onClick={onPortal}
              disabled={isPortalPending || isCancelPending || isInvoicePending}
              className="gap-2 h-10 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
            >
              {isPortalPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5" />
              )}
              Manage subscription
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onInvoice}
              disabled={isInvoicePending || isCancelPending || isPortalPending}
              className="gap-2 h-10 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
            >
              {isInvoicePending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
              Invoice
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={onCancelSubscription}
              disabled={isCancelPending || isPortalPending || isInvoicePending}
              className="relative cursor-pointer h-10 overflow-hidden rounded-2xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 disabled:opacity-60 transition-all duration-300 gap-2"
            >
              <span className="relative z-10 flex items-center gap-2">
                {isCancelPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Ban className="h-3.5 w-3.5" />
                )}
                Cancel now
              </span>
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
