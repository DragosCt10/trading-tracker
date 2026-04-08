'use client';

import Link from 'next/link';
import { ArrowRight, BarChart3, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TIER_DEFINITIONS } from '@/constants/tiers';
import { PRICING_FEATURES } from '@/constants/pricingFeatures';
import type { BillingPeriod } from '@/types/subscription';
import {
  PricingTable,
  PricingTableBody,
  PricingTableHeader,
  PricingTableRow,
  PricingTableHead,
  PricingTableCell,
  PricingTablePlan,
} from '@/components/pricing/PricingTable';

const proDef = TIER_DEFINITIONS.pro;
const MONTHLY_PRICE = proDef.pricing.monthly?.usd ?? 11.99;
const ANNUAL_PRICE = proDef.pricing.annual?.usd ?? 114.99;
const SAVINGS_PCT = proDef.pricing.annual?.savingsPct ?? 20;
const ANNUAL_MONTHLY_EQUIV = Math.floor(ANNUAL_PRICE / 12);

const themedGradientStyle = {
  background: 'linear-gradient(to right, var(--tc-primary), var(--tc-accent), var(--tc-accent-end))',
  boxShadow: '0 10px 15px -3px color-mix(in oklab, var(--tc-primary) 30%, transparent), 0 4px 6px -4px color-mix(in oklab, var(--tc-primary) 20%, transparent)',
} as React.CSSProperties;

export function BillingToggle({
  billingPeriod,
  setBillingPeriod,
  className,
}: {
  billingPeriod: BillingPeriod;
  setBillingPeriod: (period: BillingPeriod) => void;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-full border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none p-1 backdrop-blur-sm', className)}>
      {(['annual', 'monthly'] as BillingPeriod[]).map((period) => (
        <button
          key={period}
          onClick={() => setBillingPeriod(period)}
          className={cn(
            'flex flex-1 sm:flex-none justify-center items-center gap-1 sm:gap-1.5 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer',
            billingPeriod === period
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:text-white/60 dark:hover:text-white/90',
          )}
        >
          {period === 'annual' ? 'Annual' : 'Monthly'}
          {period === 'annual' && (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold transition-colors',
                billingPeriod === 'annual'
                  ? 'bg-emerald-500/20 text-emerald-600'
                  : 'bg-emerald-500/15 text-emerald-400',
              )}
            >
              Save {SAVINGS_PCT}%
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

interface PricingComparisonProps {
  billingPeriod: BillingPeriod;
  setBillingPeriod: (period: BillingPeriod) => void;
  isCheckoutPending: boolean;
  onCheckout: () => void;
  /**
   * When true, replaces the Starter "Get started" CTA with "Your current plan"
   * label (for authenticated settings context where user is already logged in).
   */
  hideStarterCTA?: boolean;
  /** Hide the built-in billing toggle (caller renders it externally). */
  hideToggle?: boolean;
  className?: string;
}

export function PricingComparison({
  billingPeriod,
  setBillingPeriod,
  isCheckoutPending,
  onCheckout,
  hideStarterCTA = false,
  hideToggle = false,
  className,
}: PricingComparisonProps) {
  const isAnnual = billingPeriod === 'annual';
  const proPrice = isAnnual ? `$${ANNUAL_MONTHLY_EQUIV}/mo` : `$${MONTHLY_PRICE}/mo`;
  const proCompareAt = isAnnual ? `$${MONTHLY_PRICE}/mo` : undefined;
  const proBillingNote = isAnnual ? `$${ANNUAL_PRICE} billed annually` : undefined;

  const BuyNowButton = ({ size }: { size: 'sm' | 'default' }) => (
    <Button
      onClick={onCheckout}
      disabled={isCheckoutPending}
      className={cn(
        'relative cursor-pointer overflow-hidden w-full rounded-lg text-white font-semibold disabled:opacity-60 border-0 shadow-lg hover:shadow-xl transition-all duration-300 group',
        size === 'sm' ? 'text-xs' : 'text-sm',
      )}
      size={size}
      style={themedGradientStyle}
    >
      <span className="relative z-10 flex items-center justify-center gap-1">
        {isCheckoutPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Buy now
            <ArrowRight className="ml-1 h-4 w-4" />
          </>
        )}
      </span>
      {!isCheckoutPending && (
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
      )}
    </Button>
  );

  return (
    <div className={className}>
      {!hideToggle && (
        <div className="flex justify-center">
          <BillingToggle billingPeriod={billingPeriod} setBillingPeriod={setBillingPeriod} />
        </div>
      )}

      {/* Mobile: stacked full-width cards */}
      <div className="flex flex-col gap-3 my-5 sm:hidden">
        <PricingTablePlan
          name="Starter"
          badge="Free forever"
          badgeClassName="border-slate-300/50 dark:border-slate-600/50 text-slate-500 dark:text-slate-400"
          price="Free"
          description="Get started at no cost."
          icon={Zap}
        >
          {hideStarterCTA ? (
            <>
              <p className="text-[10px] -mt-1 mb-2 text-muted-foreground">No credit card required</p>
              <Button variant="outline" disabled className="w-full rounded-lg text-xs" size="sm">
                Current plan
              </Button>
            </>
          ) : (
            <>
              <p className="text-[10px] -mt-1 mb-2 text-muted-foreground">No credit card required</p>
              <Link href="/login">
                <Button variant="outline" className="w-full rounded-lg cursor-pointer text-xs" size="sm">
                  Get started
                </Button>
              </Link>
            </>
          )}
        </PricingTablePlan>

        <PricingTablePlan
          name="Pro"
          badge="Recommended"
          badgeClassName="border-[var(--tc-primary)]/30 bg-[var(--tc-primary)]/10 text-[var(--tc-primary)]"
          price={proPrice}
          compareAt={proCompareAt}
          description="Everything unlimited, full analytics."
          icon={BarChart3}
          className="after:pointer-events-none after:absolute after:-inset-0.5 after:rounded-[inherit] after:to-transparent after:blur-[2px]"
          style={{
            '--tw-after-bg': `linear-gradient(to bottom, color-mix(in oklch, var(--tc-primary) 15%, transparent), transparent)`,
          } as React.CSSProperties}
        >
          <p className={cn('text-[10px] -mt-1 mb-2', proBillingNote ? 'text-muted-foreground' : 'invisible')}>
            {proBillingNote || '\u00A0'}
          </p>
          <BuyNowButton size="sm" />
        </PricingTablePlan>
      </div>

      {/* Feature comparison table */}
      <PricingTable className="mx-auto my-5 w-full">
        <PricingTableHeader>
          {/* Desktop: full plan cards in header */}
          <PricingTableRow className="hidden sm:table-row">
            <th className="w-[30%]" />
            <th className="w-[35%] p-1 h-1">
              <PricingTablePlan
                name="Starter"
                badge="Free forever"
                badgeClassName="border-slate-300/50 dark:border-slate-600/50 text-slate-500 dark:text-slate-400"
                price="Free"
                description="Get started at no cost."
                icon={Zap}
              >
                {hideStarterCTA ? (
                  <>
                    <p className="text-xs -mt-1 mb-3 text-muted-foreground">No credit card required</p>
                    <Button variant="outline" disabled className="w-full rounded-lg text-sm" size="sm">
                      Current plan
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-xs -mt-1 mb-3 text-muted-foreground">No credit card required</p>
                    <Link href="/login">
                      <Button variant="outline" className="w-full rounded-lg cursor-pointer text-sm" size="sm">
                        Get started
                      </Button>
                    </Link>
                  </>
                )}
              </PricingTablePlan>
            </th>
            <th className="w-[35%] p-1 h-1">
              <PricingTablePlan
                name="Pro"
                badge="Recommended"
                badgeClassName="border-[var(--tc-primary)]/30 bg-[var(--tc-primary)]/10 text-[var(--tc-primary)]"
                price={proPrice}
                compareAt={proCompareAt}
                description="Everything unlimited, full analytics."
                icon={BarChart3}
                className="after:pointer-events-none after:absolute after:-inset-0.5 after:rounded-[inherit] after:to-transparent after:blur-[2px]"
                style={{
                  '--tw-after-bg': `linear-gradient(to bottom, color-mix(in oklch, var(--tc-primary) 15%, transparent), transparent)`,
                } as React.CSSProperties}
              >
                <p className={cn('text-xs -mt-1 mb-3', proBillingNote ? 'text-muted-foreground' : 'invisible')}>
                  {proBillingNote || '\u00A0'}
                </p>
                <BuyNowButton size="default" />
              </PricingTablePlan>
            </th>
          </PricingTableRow>
          {/* Mobile: simple column labels */}
          <PricingTableRow className="sm:hidden">
            <th className="p-2 text-left text-xs font-medium text-muted-foreground">Feature</th>
            <th className="p-2 text-left text-xs font-medium">Starter</th>
            <th className="p-2 text-left text-xs font-medium">Pro</th>
          </PricingTableRow>
        </PricingTableHeader>
        <PricingTableBody>
          {PRICING_FEATURES.map((feature, index) => (
            <PricingTableRow key={index}>
              <PricingTableHead>{feature.label}</PricingTableHead>
              {feature.values.map((value, i) => (
                <PricingTableCell key={i}>{value}</PricingTableCell>
              ))}
            </PricingTableRow>
          ))}
        </PricingTableBody>
      </PricingTable>
    </div>
  );
}
