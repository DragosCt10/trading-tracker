'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, Infinity as InfinityIcon, Loader2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ADDON_DEFINITIONS } from '@/constants/addons';
import { cancelAddon, createAddonCheckoutUrl, verifyAndActivateAddon } from '@/lib/server/addons';
import type { ResolvedAddon } from '@/types/addon';

interface BillingStarterPlusCardProps {
  /** ER-1: false hides the entire card. */
  available: boolean;
  /** Server-rendered initial state so the card doesn't flicker on hydration. */
  initialAddon: ResolvedAddon | null;
  /**
   * When true, the user's tier is already Pro/Elite — the add-on is pointless
   * for them. We still show an informational state so they can see it was
   * considered but mark it disabled.
   */
  isPro: boolean;
  /**
   * Signals a post-checkout return from LS (?success=1 on the billing tab,
   * server-verified against a recent subscription update). When true and the
   * addon isn't yet written to the DB, the card polls `verifyAndActivateAddon`
   * until LS confirms the purchase. Mirrors the Pro verification loop in
   * BillingSettingsPanel.
   */
  justPaid: boolean;
}

function formatDate(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function BillingStarterPlusCard({
  available,
  initialAddon,
  isPro,
  justPaid,
}: BillingStarterPlusCardProps) {
  const router = useRouter();
  const [addon, setAddon] = useState<ResolvedAddon | null>(initialAddon);
  const [isSubscribePending, startSubscribeTransition] = useTransition();
  const [isCancelPending, startCancelTransition] = useTransition();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(
    justPaid && !(initialAddon?.isActive ?? false),
  );

  // Post-checkout fast-path (parity with Pro's `verifyAndActivateSubscription`
  // polling loop in BillingSettingsPanel). Polls LS directly to bridge webhook
  // latency when the user returns from checkout before the webhook fires.
  useEffect(() => {
    if (!justPaid || !available) return;
    if (addon?.isActive) return;

    let attempts = 0;
    const maxAttempts = 40; // ~80 seconds at 2s intervals
    let canceled = false;

    const interval = setInterval(async () => {
      if (canceled) return;
      attempts += 1;
      if (attempts > maxAttempts) {
        clearInterval(interval);
        setIsVerifying(false);
        return;
      }

      try {
        const verified = await verifyAndActivateAddon('starter_plus');
        if (verified?.isActive) {
          setAddon(verified);
          setIsVerifying(false);
          clearInterval(interval);
        }
      } catch {
        // Transient errors (rate limit, LS hiccup) — keep polling until maxAttempts.
      }
    }, 2000);

    return () => {
      canceled = true;
      clearInterval(interval);
    };
  }, [justPaid, available, addon?.isActive]);

  // ER-1: hide entirely when the add-on variant is not configured.
  if (!available) return null;

  const def = ADDON_DEFINITIONS.starter_plus;

  function handleSubscribe() {
    setErrorMessage(null);
    startSubscribeTransition(async () => {
      try {
        const result = await createAddonCheckoutUrl('starter_plus');
        if (result.alreadyActive) {
          // ER-6: user already has it — the server returned the portal URL
          // and we surface a friendly note before redirecting.
          setErrorMessage(
            'You already have Starter Plus. Redirecting to your customer portal...',
          );
          setTimeout(() => router.push(result.url), 800);
          return;
        }
        router.push(result.url);
      } catch (err) {
        setErrorMessage(
          err instanceof Error && err.message.includes('Too many')
            ? err.message
            : 'Could not open checkout. Please try again in a moment.',
        );
      }
    });
  }

  function handleCancel() {
    setShowCancelConfirm(true);
  }

  function confirmCancel() {
    setErrorMessage(null);
    startCancelTransition(async () => {
      const result = await cancelAddon('starter_plus');
      if (!result.ok) {
        setErrorMessage(result.message ?? 'Could not cancel right now.');
        setShowCancelConfirm(false);
        return;
      }
      // Optimistic UI: reflect the cancel flag locally; the webhook finalizes
      // status=canceled when the billing period expires.
      setAddon((prev) => (prev ? { ...prev, cancelAtPeriodEnd: true } : prev));
      setShowCancelConfirm(false);
    });
  }

  const hasActive = addon?.isActive === true;
  const isCanceling = addon?.cancelAtPeriodEnd === true;

  return (
    <section
      aria-labelledby="starter-plus-card-title"
      className="my-6 rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-5"
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--tc-primary)]/30 bg-[var(--tc-primary)]/10 text-[var(--tc-primary)]"
        >
          {hasActive ? (
            <InfinityIcon className="h-5 w-5" strokeWidth={2.25} />
          ) : (
            <TrendingUp className="h-5 w-5" strokeWidth={2.25} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              id="starter-plus-card-title"
              className="text-sm font-semibold text-slate-900 dark:text-slate-50"
            >
              {def.label}
            </h3>
            <span className="inline-flex items-center rounded-full border border-[var(--tc-primary)]/30 bg-[var(--tc-primary)]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--tc-primary)]">
              Add-on
            </span>
            {hasActive && !isCanceling && (
              <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                Active
              </span>
            )}
            {hasActive && isCanceling && (
              <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                Cancels at period end
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {hasActive
              ? 'Unlimited trades on the Starter plan.'
              : def.description}
          </p>
          {hasActive && addon?.periodEnd && (
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
              {isCanceling
                ? `Access until ${formatDate(addon.periodEnd)}.`
                : `Next renewal ${formatDate(addon.periodEnd)}.`}
            </p>
          )}
          {!hasActive && isPro && (
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
              Your Pro plan already includes unlimited trades — this add-on is unnecessary.
            </p>
          )}
          {isVerifying && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              Payment processing... your Starter Plus will activate in a few seconds.
            </p>
          )}
          {errorMessage && (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{errorMessage}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-base font-bold text-slate-900 dark:text-slate-50">
            ${def.priceUsd}/mo
          </span>
          {hasActive ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isCancelPending || isCanceling}
              className="cursor-pointer rounded-lg border-rose-500/40 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 text-xs"
            >
              {isCanceling ? (
                <>Canceled</>
              ) : isCancelPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Ban className="h-3 w-3 mr-1" aria-hidden="true" />
                  Cancel
                </>
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSubscribe}
              disabled={isSubscribePending}
              className="cursor-pointer rounded-lg bg-[var(--tc-primary)] text-white hover:bg-[var(--tc-primary)]/90 text-xs disabled:opacity-60"
            >
              {isSubscribePending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                'Subscribe'
              )}
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent className="max-w-md fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient !rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              <span className="text-red-500 dark:text-red-400 font-semibold text-lg">
                Cancel Starter Plus?
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="text-slate-600 dark:text-slate-400">
                Are you sure you want to cancel? Your unlimited-trades access will continue until the
                end of your current billing period, then the 50 trades/month cap returns on the
                Starter plan.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3">
            <AlertDialogCancel asChild>
              <Button
                variant="outline"
                disabled={isCancelPending}
                className="rounded-xl cursor-pointer border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300"
              >
                Keep Starter Plus
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={confirmCancel}
                disabled={isCancelPending}
                className="relative cursor-pointer px-4 py-2 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 flex items-center gap-2"
              >
                {isCancelPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isCancelPending ? 'Cancelling...' : 'Yes, cancel Starter Plus'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
