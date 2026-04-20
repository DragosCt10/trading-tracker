'use client';

import Link from 'next/link';
import { ArrowRight, BarChart3, Info, Loader2, TrendingUp, Zap, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { TIER_DEFINITIONS } from '@/constants/tiers';
import { PRICING_FEATURES } from '@/constants/pricingFeatures';
import {
  EARLY_BIRD_MONTHLY_PRICE,
  EARLY_BIRD_ANNUAL_PRICE,
} from '@/constants/earlyBird';
import type { BillingPeriod, TierId } from '@/types/subscription';
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
const starterPlusDef = TIER_DEFINITIONS.starter_plus;
const PRO_MONTHLY_PRICE = proDef.pricing.monthly?.usd ?? 11.99;
const PRO_ANNUAL_PRICE = proDef.pricing.annual?.usd ?? 114.99;
const SAVINGS_PCT = proDef.pricing.annual?.savingsPct ?? 20;
const PRO_ANNUAL_MONTHLY_EQUIV = Math.floor(PRO_ANNUAL_PRICE / 12);
const EARLY_ANNUAL_MONTHLY_EQUIV = Math.floor(EARLY_BIRD_ANNUAL_PRICE / 12);
const SP_MONTHLY_PRICE = starterPlusDef.pricing.monthly?.usd ?? 7.99;
const SP_ANNUAL_PRICE = starterPlusDef.pricing.annual?.usd ?? 76.70;
const SP_ANNUAL_MONTHLY_EQUIV = Math.floor(SP_ANNUAL_PRICE / 12);

const themedGradientStyle = {
  background: 'linear-gradient(to right, var(--tc-primary), var(--tc-accent), var(--tc-accent-end))',
  boxShadow: '0 10px 15px -3px color-mix(in oklab, var(--tc-primary) 30%, transparent), 0 4px 6px -4px color-mix(in oklab, var(--tc-primary) 20%, transparent)',
} as React.CSSProperties;

/**
 * Module-level "Buy now" CTA used by both the mobile and desktop layouts in
 * PricingComparison. Declared outside the parent component so React/React
 * Compiler can memoize it properly and preserve component identity between
 * renders (see react-hooks/static-components lint rule).
 */
function BuyNowButton({
  size,
  onCheckout,
  isCheckoutPending,
}: {
  size: 'sm' | 'default';
  onCheckout: () => void;
  isCheckoutPending: boolean;
}) {
  return (
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
}

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

/** Static per-tier card config. Prices are resolved dynamically inside renderPlanCard. */
type PaidTierId = Exclude<TierId, 'starter' | 'elite'>;

interface TierCardConfig {
  name: string;
  badge: string;
  badgeClassName: string;
  description: string;
  icon: LucideIcon;
  className?: string;
  style?: React.CSSProperties;
}

const TIER_CARD_CONFIG: Record<TierId, TierCardConfig> = {
  starter: {
    name: 'Starter',
    badge: 'Free forever',
    badgeClassName: 'border-slate-300/50 dark:border-slate-600/50 text-slate-500 dark:text-slate-400',
    description: 'Start free, no credit card needed.',
    icon: Zap,
  },
  starter_plus: {
    name: 'Starter Plus',
    badge: 'Best value',
    badgeClassName: 'border-slate-300/50 dark:border-slate-600/50 text-slate-500 dark:text-slate-400',
    description: 'Everything in Starter, plus more.',
    icon: TrendingUp,
  },
  pro: {
    name: 'Pro',
    badge: 'Recommended',
    badgeClassName: 'border-[var(--tc-primary)]/30 bg-[var(--tc-primary)]/10 text-[var(--tc-primary)]',
    description: 'Everything unlimited, full analytics.',
    icon: BarChart3,
    className: 'after:pointer-events-none after:absolute after:-inset-0.5 after:rounded-[inherit] after:to-transparent after:blur-[2px]',
    style: {
      '--tw-after-bg': `linear-gradient(to bottom, color-mix(in oklch, var(--tc-primary) 15%, transparent), transparent)`,
    } as React.CSSProperties,
  },
  elite: {
    name: 'Elite',
    badge: 'Elite',
    badgeClassName: 'border-purple-500/30 bg-purple-500/10 text-purple-500',
    description: 'Full suite plus Alpha Hub.',
    icon: BarChart3,
  },
};

/**
 * Formats the daily-equivalent cost so users can anchor on a small "per day"
 * number (e.g. "~$0.21/day"). Annual divides by 365, monthly by 30.
 */
function formatDailyCost(amount: number, period: BillingPeriod): string {
  const daily = amount / (period === 'annual' ? 365 : 30);
  return `~$${daily.toFixed(2)}/day`;
}

/**
 * Resolves `{ price, compareAt?, billingNote? }` for a paid tier card, honouring
 * the Pro early-bird promo when applicable.
 */
function resolveTierPricing(
  tier: PaidTierId,
  billingPeriod: BillingPeriod,
  useEarlyBird: boolean,
): { price: string; compareAt?: string; billingNote?: string } {
  const isAnnual = billingPeriod === 'annual';
  if (tier === 'pro') {
    const price = useEarlyBird
      ? isAnnual
        ? `$${EARLY_ANNUAL_MONTHLY_EQUIV}/mo`
        : `$${EARLY_BIRD_MONTHLY_PRICE}/mo`
      : isAnnual
        ? `$${PRO_ANNUAL_MONTHLY_EQUIV}/mo`
        : `$${PRO_MONTHLY_PRICE}/mo`;
    const compareAt = useEarlyBird
      ? isAnnual
        ? `$${PRO_ANNUAL_MONTHLY_EQUIV}/mo`
        : `$${PRO_MONTHLY_PRICE}/mo`
      : isAnnual
        ? `$${PRO_MONTHLY_PRICE}/mo`
        : undefined;
    const annualAmount = useEarlyBird ? EARLY_BIRD_ANNUAL_PRICE : PRO_ANNUAL_PRICE;
    const monthlyAmount = useEarlyBird ? EARLY_BIRD_MONTHLY_PRICE : PRO_MONTHLY_PRICE;
    const dailyCost = formatDailyCost(
      isAnnual ? annualAmount : monthlyAmount,
      billingPeriod,
    );
    const billingNote = isAnnual
      ? `$${annualAmount} billed annually · ${dailyCost}`
      : dailyCost;
    return { price, compareAt, billingNote };
  }
  // starter_plus — no early-bird path
  const price = isAnnual
    ? `$${SP_ANNUAL_MONTHLY_EQUIV}/mo`
    : `$${SP_MONTHLY_PRICE}/mo`;
  const dailyCost = formatDailyCost(
    isAnnual ? SP_ANNUAL_PRICE : SP_MONTHLY_PRICE,
    billingPeriod,
  );
  const billingNote = isAnnual
    ? `$${SP_ANNUAL_PRICE} billed annually · ${dailyCost}`
    : dailyCost;
  return { price, billingNote };
}

interface PricingComparisonProps {
  billingPeriod: BillingPeriod;
  setBillingPeriod: (period: BillingPeriod) => void;
  isCheckoutPending: boolean;
  /** Called when user clicks "Buy now" on a paid tier card. */
  onCheckout: (tier: PaidTierId) => void;
  /** Currently-pending checkout tier, used to disable only that button. */
  pendingCheckoutTier?: PaidTierId | null;
  /**
   * The tier the logged-in user is currently on. When set:
   *  - The matching card shows a disabled "Current plan" button instead of its CTA.
   *  - The Starter card's "Get started" login link is suppressed (the user is
   *    already authenticated). If `currentTier` is on a paid tier, the Starter
   *    card shows a disabled "Free plan" label.
   * Leave undefined for anonymous visitors (public pricing / landing pages).
   */
  currentTier?: TierId;
  /** Hide the built-in billing toggle (caller renders it externally). */
  hideToggle?: boolean;
  /**
   * When true, render the Pro card with launch-offer pricing
   * ($9.99/mo monthly or $95.90/yr annual) and strike-through the regular
   * price as compareAt. Caller owns the "slots remaining" decision.
   */
  useEarlyBird?: boolean;
  className?: string;
}

/**
 * Shared per-card renderer used by both mobile (stacked) and desktop (header row)
 * layouts. Keeps all three tier cards in a single place and lets each layout pass
 * its own `variant` to tweak text sizing and padding.
 */
function renderPlanCard(params: {
  tier: TierId;
  variant: 'mobile' | 'desktop';
  billingPeriod: BillingPeriod;
  useEarlyBird: boolean;
  currentTier: TierId | undefined;
  onCheckout: (tier: PaidTierId) => void;
  pendingCheckoutTier: PaidTierId | null;
}) {
  const { tier, variant, billingPeriod, useEarlyBird, currentTier, onCheckout, pendingCheckoutTier } = params;
  const cfg = TIER_CARD_CONFIG[tier];
  const isMobile = variant === 'mobile';
  const noteClass = isMobile ? 'text-[10px] -mt-1 mb-2' : 'text-xs -mt-1 mb-3';
  const buttonSize: 'sm' | 'default' = isMobile ? 'sm' : 'default';
  const isCurrentTier = currentTier === tier;
  const isAuthenticated = currentTier !== undefined;

  if (tier === 'starter') {
    return (
      <PricingTablePlan
        name={cfg.name}
        badge={cfg.badge}
        badgeClassName={cfg.badgeClassName}
        price="Free"
        description={cfg.description}
        icon={cfg.icon}
      >
        <p className={cn(noteClass, 'text-muted-foreground')}>No credit card required</p>
        <div className="mt-auto">
          {isAuthenticated ? (
            <Button
              variant="outline"
              disabled
              className={cn('w-full rounded-lg', isMobile ? 'text-xs' : 'text-sm')}
              size={buttonSize}
            >
              {isCurrentTier ? 'Current plan' : 'Free plan'}
            </Button>
          ) : (
            <Link href="/login" className="block">
              <Button
                variant="outline"
                className={cn('w-full rounded-lg cursor-pointer', isMobile ? 'text-xs' : 'text-sm')}
                size={buttonSize}
              >
                Get started
              </Button>
            </Link>
          )}
        </div>
      </PricingTablePlan>
    );
  }

  if (tier === 'elite') {
    // Not currently rendered; kept for future launch.
    return null;
  }

  // Paid tier (starter_plus or pro)
  const paidTier = tier as PaidTierId;
  const { price, compareAt, billingNote } = resolveTierPricing(paidTier, billingPeriod, useEarlyBird);
  const isPendingThisTier = pendingCheckoutTier === paidTier;

  return (
    <PricingTablePlan
      name={cfg.name}
      badge={cfg.badge}
      badgeClassName={cfg.badgeClassName}
      price={price}
      compareAt={compareAt}
      description={cfg.description}
      icon={cfg.icon}
      className={cfg.className}
      style={cfg.style}
    >
      <p className={cn(noteClass, billingNote ? 'text-muted-foreground' : 'invisible')}>
        {billingNote || '\u00A0'}
      </p>
      <div className="mt-auto">
        {isCurrentTier ? (
          <Button
            variant="outline"
            disabled
            className={cn('w-full rounded-lg', isMobile ? 'text-xs' : 'text-sm')}
            size={buttonSize}
          >
            Current plan
          </Button>
        ) : (
          <BuyNowButton
            size={buttonSize}
            onCheckout={() => onCheckout(paidTier)}
            isCheckoutPending={isPendingThisTier}
          />
        )}
      </div>
    </PricingTablePlan>
  );
}

export function PricingComparison({
  billingPeriod,
  setBillingPeriod,
  isCheckoutPending,
  onCheckout,
  pendingCheckoutTier = null,
  currentTier,
  hideToggle = false,
  useEarlyBird = false,
  className,
}: PricingComparisonProps) {
  const visibleTiers: TierId[] = ['starter', 'starter_plus', 'pro'];
  // When no specific pending tier is tracked, fall back to the generic flag so
  // the legacy single-button call sites still disable during checkout.
  const effectivePendingTier = pendingCheckoutTier ?? (isCheckoutPending ? 'pro' : null);

  const cardParams = (variant: 'mobile' | 'desktop') => ({
    variant,
    billingPeriod,
    useEarlyBird,
    currentTier,
    onCheckout,
    pendingCheckoutTier: effectivePendingTier,
  });

  return (
    <div className={className}>
      {!hideToggle && (
        <div className="flex justify-center">
          <BillingToggle billingPeriod={billingPeriod} setBillingPeriod={setBillingPeriod} />
        </div>
      )}

      {/* Mobile: stacked full-width cards */}
      <div className="flex flex-col gap-3 my-5 sm:hidden">
        {visibleTiers.map((tier) => (
          <div key={tier}>{renderPlanCard({ tier, ...cardParams('mobile') })}</div>
        ))}
      </div>

      {/* Feature comparison table */}
      <PricingTable className="mx-auto my-5 w-full">
        <PricingTableHeader>
          {/* Desktop: plan cards live inside the table header so they align
              with the feature value columns below. `style={{ height: 1 }}` on
              each <th> is the classic trick that makes `h-full` on the child
              card resolve to the stretched row height, giving equal-height
              cards without yanking them out of the table layout. */}
          <PricingTableRow className="hidden sm:table-row">
            <th className="w-[25%]" />
            {visibleTiers.map((tier) => (
              <th
                key={tier}
                className="w-[25%] p-1 sticky top-20 z-20 align-top"
                style={{ height: 1 }}
              >
                {renderPlanCard({ tier, ...cardParams('desktop') })}
              </th>
            ))}
          </PricingTableRow>
          {/* Mobile: simple column labels */}
          <PricingTableRow className="sm:hidden">
            <th className="p-2 text-left text-xs font-medium text-muted-foreground">Feature</th>
            {visibleTiers.map((tier) => (
              <th key={tier} className="p-2 text-left text-xs font-medium">
                {TIER_CARD_CONFIG[tier].name}
              </th>
            ))}
          </PricingTableRow>
        </PricingTableHeader>
        <PricingTableBody>
          <TooltipProvider delayDuration={150}>
            {PRICING_FEATURES.map((feature, index) => (
              <PricingTableRow key={index}>
                <PricingTableHead>
                  <span className="inline-flex items-center gap-1.5">
                    {feature.label}
                    {feature.tooltip ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label={`What is ${feature.label}?`}
                            className="inline-flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60 rounded-full"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="max-w-[260px] rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 px-3 py-2 text-xs leading-snug"
                        >
                          {feature.tooltip}
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                  </span>
                </PricingTableHead>
                {feature.values.map((value, i) => (
                  <PricingTableCell key={i}>{value}</PricingTableCell>
                ))}
              </PricingTableRow>
            ))}
          </TooltipProvider>
        </PricingTableBody>
      </PricingTable>
    </div>
  );
}
