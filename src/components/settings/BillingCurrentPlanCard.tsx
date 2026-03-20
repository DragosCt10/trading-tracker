'use client';

import { AlertCircle, Ban, CreditCard, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ResolvedSubscription } from '@/types/subscription';

interface BillingCurrentPlanCardProps {
  isPro: boolean;
  resolvedSub: ResolvedSubscription;
  isPortalPending: boolean;
  isCancelPending: boolean;
  isInvoicePending: boolean;
  onPortal: () => void;
  onInvoice: () => void;
  onCancelSubscription: () => void;
}

export function BillingCurrentPlanCard({
  isPro,
  resolvedSub,
  isPortalPending,
  isCancelPending,
  isInvoicePending,
  onPortal,
  onInvoice,
  onCancelSubscription,
}: BillingCurrentPlanCardProps) {
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
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {resolvedSub.billingPeriod === 'monthly' ? 'Monthly billing' : 'Annual billing'}
              {resolvedSub.periodEnd && (
                <>
                  {' '}
                  · {resolvedSub.cancelAtPeriodEnd ? 'Ends' : 'Renews'}{' '}
                  {resolvedSub.periodEnd.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
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
              variant="outline"
              size="sm"
              onClick={onCancelSubscription}
              disabled={isCancelPending || isPortalPending || isInvoicePending}
              className="gap-2 h-10 rounded-2xl border border-rose-300/70 dark:border-rose-700/50 bg-rose-50/70 dark:bg-rose-950/20 backdrop-blur-xl text-rose-700 dark:text-rose-300 hover:bg-rose-100/80 dark:hover:bg-rose-900/30 transition-all duration-300"
            >
              {isCancelPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Ban className="h-3.5 w-3.5" />
              )}
              Cancel now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
