'use client';

import { ArrowRight, Infinity as InfinityIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ADDON_DEFINITIONS } from '@/constants/addons';

/**
 * Callout card for the "Starter Plus" $3.99/mo add-on.
 *
 * Placement: sits between the tier cards grid and the feature-comparison table
 * on /pricing. It's a sibling to the tier cards, not inside the PricingTable.
 *
 * AUD-4: min-height reserves layout space (prevents CLS on /pricing load) and
 * the icon uses aria-hidden since the text label carries meaning. The CTA is a
 * real <Button> so it inherits Radix keyboard + focus-visible ring.
 *
 * ER-1: the parent component is responsible for NOT rendering this card when
 * the add-on variant ID is missing from env. Hiding here would be too late —
 * the card still carries a height allocation otherwise.
 */

const themedGradientStyle = {
  background:
    'linear-gradient(to right, var(--tc-primary), var(--tc-accent), var(--tc-accent-end))',
  boxShadow:
    '0 10px 15px -3px color-mix(in oklab, var(--tc-primary) 30%, transparent), 0 4px 6px -4px color-mix(in oklab, var(--tc-primary) 20%, transparent)',
} as React.CSSProperties;

interface AddonCardProps {
  onCheckout: () => void;
  isCheckoutPending: boolean;
  className?: string;
}

export function AddonCard({ onCheckout, isCheckoutPending, className }: AddonCardProps) {
  const def = ADDON_DEFINITIONS.starter_plus;
  const priceLabel = `$${def.priceUsd}/mo`;

  return (
    <section
      aria-labelledby="addon-card-title"
      className={cn(
        'relative overflow-hidden rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm',
        // CLS reservation — the card must not shift the feature table when it paints.
        'min-h-[200px] sm:min-h-[128px]',
        'p-4 sm:p-5',
        className,
      )}
    >
      {/* Decorative gradient halo — aria-hidden so screen readers ignore it */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-20 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, var(--tc-primary) 0%, transparent 70%)',
        }}
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center sm:gap-4">
          <div
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--tc-primary)]/30 bg-[var(--tc-primary)]/10 text-[var(--tc-primary)]"
          >
            <InfinityIcon className="h-5 w-5" strokeWidth={2.25} />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[var(--tc-primary)]/30 bg-[var(--tc-primary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--tc-primary)]">
                Optional add-on
              </span>
            </div>
            <h3
              id="addon-card-title"
              className="text-base font-semibold text-slate-900 dark:text-white sm:text-lg"
            >
              {def.label}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
              Already love Starter? Unlock unlimited trades without the full Pro upgrade.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-col sm:items-end">
            <span className="text-2xl font-bold leading-tight text-slate-900 dark:text-white sm:text-3xl">
              {priceLabel}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              billed monthly · cancel anytime
            </span>
          </div>

          <Button
            onClick={onCheckout}
            disabled={isCheckoutPending}
            className={cn(
              'relative w-full cursor-pointer overflow-hidden rounded-lg border-0 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl disabled:opacity-60 sm:w-auto',
              'focus-visible:ring-2 focus-visible:ring-[var(--tc-primary)] focus-visible:ring-offset-2',
              'group',
            )}
            style={themedGradientStyle}
          >
            <span className="relative z-10 flex items-center justify-center gap-1">
              {isCheckoutPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <>
                  Buy now
                  <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </>
              )}
            </span>
            {!isCheckoutPending && (
              <div
                aria-hidden="true"
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-0"
              />
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
