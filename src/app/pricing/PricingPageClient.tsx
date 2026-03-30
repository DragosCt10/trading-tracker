'use client';

import Link from 'next/link';
import { ArrowRight, Zap, BarChart3 } from 'lucide-react';
import { PricingHeroBackground } from '@/components/landing/PricingHeroBackground';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { Footer } from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import {
  type FeatureItem,
  PricingTable,
  PricingTableBody,
  PricingTableHeader,
  PricingTableHead,
  PricingTableRow,
  PricingTableCell,
  PricingTablePlan,
} from '@/components/ui/pricing-table';

const FEATURES: FeatureItem[] = [
  { label: 'Strategies', values: ['1', 'Unlimited'] },
  { label: 'Accounts', values: ['1', 'Unlimited'] },
  { label: 'Trading modes', values: ['Demo only', 'Demo, Live & Backtesting'] },
  { label: 'CSV import', values: [true, true] },
  { label: 'Core statistics', values: ['Basic', 'Full suite'] },
  { label: 'Daily journal', values: [false, true] },
  { label: 'Equity curve chart', values: [false, true] },
  { label: 'Sharpe ratio & drawdown', values: [false, true] },
  { label: 'Consistency analysis', values: [false, true] },
  { label: 'Performance ratios', values: [false, true] },
  { label: 'Psychological factors', values: [false, true] },
  { label: 'Trade performance analysis', values: [false, true] },
  { label: 'Extra analytics cards', values: ['3', 'All'] },
  { label: 'Public strategy sharing', values: [false, true] },
  { label: 'Social feed', values: ['Basic', 'Full (attach trades, edit, channels)'] },
  { label: 'Priority support', values: [false, true] },
];

export function PricingPageClient() {
  return (
    <div className="landing-page-override w-full pt-16 sm:pt-[68px]">
      <LandingHeader />

      {/* Hero section with gradient dome + grid + pillars */}
      <section className="relative overflow-clip">
        <PricingHeroBackground />

        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pt-16 sm:pt-24 pb-10 text-center">
          {/* Heading */}
          <h1 className="text-3xl leading-[1.08] font-medium tracking-[-0.04em] text-balance sm:text-5xl">
            Simple pricing,{' '}
            <br className="sm:hidden" />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(to bottom, var(--foreground) 54%, var(--tc-accent))',
              }}
            >
              serious analytics.
            </span>
          </h1>

          <p className="text-muted-foreground mt-4 max-w-2xl text-pretty">
            Start free. Upgrade when your trading demands deeper insights, more strategies, and full control.
          </p>
        </div>

        {/* Pricing table */}
        <div className="relative mx-auto max-w-5xl px-4 pb-20">
          <PricingTable className="mx-auto my-5 w-full">
            <PricingTableHeader>
              <PricingTableRow>
                <th />
                <th className="p-1">
                  <PricingTablePlan
                    name="Starter"
                    badge="Free forever"
                    price="$0"
                    icon={Zap}
                  >
                    <Link href="/signup">
                      <Button variant="outline" className="w-full rounded-lg" size="lg">
                        Get started
                      </Button>
                    </Link>
                  </PricingTablePlan>
                </th>
                <th className="p-1">
                  <PricingTablePlan
                    name="Pro"
                    badge="Most popular"
                    price="$19"
                    compareAt="$24"
                    icon={BarChart3}
                    className="after:pointer-events-none after:absolute after:-inset-0.5 after:rounded-[inherit] after:to-transparent after:blur-[2px]"
                    style={{
                      '--tw-after-bg': `linear-gradient(to bottom, color-mix(in oklch, var(--tc-primary) 15%, transparent), transparent)`,
                    } as React.CSSProperties}
                  >
                    <Link href="/signup">
                      <Button
                        className="w-full rounded-lg text-white"
                        size="lg"
                        style={{
                          background: 'linear-gradient(to right, var(--tc-primary), var(--tc-accent))',
                          borderColor: 'color-mix(in oklch, var(--tc-primary) 60%, transparent)',
                        }}
                      >
                        Start free trial
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Link>
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
        </div>

      </section>
      <Footer />
    </div>
  );
}
