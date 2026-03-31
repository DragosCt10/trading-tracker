'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Zap, BarChart3, Loader2, Lock, Info } from 'lucide-react';
import { PricingHeroBackground } from '@/components/pricing/PricingHeroBackground';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { Footer } from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import { useParallax } from '@/hooks/useParallax';
import { cn } from '@/lib/utils';
import { createPublicCheckoutUrl } from '@/lib/server/subscription';
import { TIER_DEFINITIONS } from '@/constants/tiers';
import type { BillingPeriod } from '@/types/subscription';
import { PricingFAQ } from '@/components/pricing/PricingFAQ';
import {
  type FeatureItem,
  PricingTable,
  PricingTableBody,
  PricingTableHeader,
  PricingTableHead,
  PricingTableRow,
  PricingTableCell,
  PricingTablePlan,
} from '@/components/pricing/PricingTable';

const FEATURES: FeatureItem[] = [
  { label: 'Stats Board', values: ['1', 'Unlimited'] },
  { label: 'Accounts', values: ['1', 'Unlimited'] },
  { label: 'Trades', values: ['50 / month', 'Unlimited'] },
  { label: 'Trading modes', values: ['Demo only', 'Demo, Live & Backtesting'] },
  { label: 'Core Statistics', values: ['Basic', 'Full suite'] },
  { label: 'Trade Performance Analysis', values: ['Basic', 'Full suite'] },
  { label: 'Social Trading Feed', values: ['Basic', 'Full (attach trades, edit, channels)'] },
  { label: 'Extra Trade Performance Cards', values: ['Basic', 'Full suite'] },
  { label: 'Public Stats Sharing', values: [true, true] },
  { label: 'Equity Curve Chart', values: [true, true] },
  { label: 'Trades Calendar', values: [true, true] },
  { label: 'Custom Stats Builder', values: [false, true] },
  { label: 'AI Vision', values: [false, true] },
  { label: 'Future Equity', values: [false, true] },
  { label: 'Psychological Factors', values: [false, true] },
  { label: 'Consistency & Drawdown', values: [false, true] },
  { label: 'Performance Ratios', values: [false, true] },
  { label: 'Daily Journal', values: [false, true] },
  { label: 'Export Trades', values: [false, true] },
  { label: 'Priority Support', values: [false, true] },
];

const proDef = TIER_DEFINITIONS.pro;
const MONTHLY_PRICE = proDef.pricing.monthly?.usd ?? 19;
const ANNUAL_PRICE = proDef.pricing.annual?.usd ?? 182;
const SAVINGS_PCT = proDef.pricing.annual?.savingsPct ?? 20;
const ANNUAL_MONTHLY_EQUIV = Math.floor(ANNUAL_PRICE / 12);

export function PricingPageClient() {
  const sectionRef = useParallax();
  const router = useRouter();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('annual');
  const [isCheckoutPending, startCheckoutTransition] = useTransition();

  const isAnnual = billingPeriod === 'annual';
  const proPrice = isAnnual ? `$${ANNUAL_MONTHLY_EQUIV}/mo` : `$${MONTHLY_PRICE}/mo`;
  const proCompareAt = isAnnual ? `$${MONTHLY_PRICE}/mo` : undefined;
  const proBillingNote = isAnnual ? `$${ANNUAL_PRICE} billed annually` : undefined;

  function handleCheckout() {
    startCheckoutTransition(async () => {
      try {
        const url = await createPublicCheckoutUrl(billingPeriod);
        router.push(url);
      } catch {
        router.push('/signup');
      }
    });
  }

  return (
    <div className="landing-page-override w-full">
      <LandingHeader />

      {/* Hero section with gradient dome + grid + pillars */}
      <section ref={sectionRef} className="relative overflow-clip">
        <PricingHeroBackground />

        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pt-30 sm:pt-40 pb-10 text-center">
          {/* Heading */}
          <h1
            data-parallax-speed="0.35"
            className="text-3xl leading-[1.08] font-medium tracking-[-0.04em] text-balance sm:text-5xl"
          >
            Simple pricing,{' '}
            <br className="sm:hidden" />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(to bottom, var(--foreground) 0%, var(--tc-accent) 100%)',
              }}
            >
              serious analytics.
            </span>
          </h1>

          <p data-parallax-speed="0.25" className="text-muted-foreground mt-4 max-w-2xl text-pretty">
            Start free. Upgrade when your trading demands deeper insights, <br></br> more stats board, and full control.
          </p>

          {/* Billing period toggle */}
          <div className="mt-8 flex items-center gap-1 rounded-full border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none p-1 backdrop-blur-sm">
            {(['annual', 'monthly'] as BillingPeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setBillingPeriod(period)}
                className={cn(
                  'flex items-center gap-1 sm:gap-1.5 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer',
                  billingPeriod === period
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-white/60 dark:hover:text-white/90'
                )}
              >
                {period === 'annual' ? 'Annual' : 'Monthly'}
                {period === 'annual' && (
                  <span className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold transition-colors',
                    billingPeriod === 'annual'
                      ? 'bg-emerald-500/20 text-emerald-600'
                      : 'bg-emerald-500/15 text-emerald-400'
                  )}>
                    Save {SAVINGS_PCT}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing table */}
        <div className="relative mx-auto max-w-5xl px-2 sm:px-4 pb-12 sm:pb-20">
          <PricingTable className="mx-auto my-5 w-full">
            <PricingTableHeader>
              <PricingTableRow>
                <th className="w-[30%]" />
                <th className="w-[35%] p-0.5 sm:p-1">
                  <PricingTablePlan
                    name="Starter"
                    badge="Free forever"
                    badgeClassName="border-slate-300/50 dark:border-slate-600/50 text-slate-500 dark:text-slate-400"
                    price="Free"
                    description="Get started at no cost."
                    icon={Zap}
                  >
                    <p className="text-[10px] sm:text-xs -mt-1 mb-2 sm:mb-3 text-muted-foreground">No credit card required</p>
                    <Link href="/login">
                      <Button variant="outline" className="w-full rounded-lg cursor-pointer text-xs sm:text-sm" size="sm">
                        Get started
                      </Button>
                    </Link>
                  </PricingTablePlan>
                </th>
                <th className="w-[35%] p-0.5 sm:p-1">
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
                    <p className={cn('text-[10px] sm:text-xs -mt-1 mb-2 sm:mb-3', proBillingNote ? 'text-muted-foreground' : 'invisible')}>
                      {proBillingNote || '\u00A0'}
                    </p>
                    <Button
                      onClick={handleCheckout}
                      disabled={isCheckoutPending}
                      className="relative cursor-pointer overflow-hidden w-full rounded-lg text-white text-xs sm:text-sm font-semibold disabled:opacity-60 border-0 shadow-lg hover:shadow-xl transition-all duration-300 group"
                      size="sm"
                      style={{
                        background: 'linear-gradient(to right, var(--tc-primary), var(--tc-accent), var(--tc-accent-end))',
                        boxShadow: '0 10px 15px -3px color-mix(in oklab, var(--tc-primary) 30%, transparent), 0 4px 6px -4px color-mix(in oklab, var(--tc-primary) 20%, transparent)',
                      }}
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
                  </PricingTablePlan>
                </th>
              </PricingTableRow>
            </PricingTableHeader>
            <PricingTableBody>
              {FEATURES.map((feature, index) => (
                <PricingTableRow key={index}>
                  <PricingTableHead>{feature.label}</PricingTableHead>
                  {feature.values.map((value, i) => (
                    <PricingTableCell key={i}>{value}</PricingTableCell>
                  ))}
                </PricingTableRow>
              ))}
            </PricingTableBody>
          </PricingTable>

          {/* Secured payment info */}
          <div className="mx-auto mt-2 flex max-w-xl flex-col items-center gap-5 text-center">
            <p className="flex items-center gap-1 text-sm font-medium text-foreground/80">
              <Lock className="h-3.5 w-3.5" />
              Secured Payment by <span className="underline m-0 font-semibold">Polar</span> with:
            </p>

            {/* Payment method icons */}
            <div className="flex items-center justify-center gap-3">
              <span className="flex h-8 items-center rounded-md bg-white px-2.5 shadow-sm ring-1 ring-black/10">
                <Image src="/icons/payments/visa.svg" alt="Visa" width={61} height={20} className="h-3 w-auto" />
              </span>
              <span className="flex h-8 items-center rounded-md bg-white px-2.5 shadow-sm ring-1 ring-black/10">
                <Image src="/icons/payments/mastercard.svg" alt="Mastercard" width={66} height={40} className="h-4.5 w-auto" />
              </span>
              <span className="flex h-8 items-center rounded-md bg-white px-1.5 shadow-sm ring-1 ring-black/10">
                <Image src="/icons/payments/applepay.svg" alt="Apple Pay" width={120} height={80} className="h-8 w-auto" />
              </span>
              <span className="flex h-8 items-center rounded-md bg-white px-2.5 shadow-sm ring-1 ring-black/10">
                <Image src="/icons/payments/googlepay.svg" alt="Google Pay" width={80} height={38} className="h-4.5 w-auto" />
              </span>
            </div>

            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 shrink-0" />
              If you are a Registered Company inside the European Union you will be able to add your VAT ID after you press &quot;Buy Now&quot;
            </p>
          </div>
        </div>

        <PricingFAQ className="mt-4 sm:mt-8" />

        <div className="relative [&>footer]:bg-transparent [&>footer]:border-0 [&>footer]:mt-0">
          <Footer />
        </div>
      </section>
    </div>
  );
}
