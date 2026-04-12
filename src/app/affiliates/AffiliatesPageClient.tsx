'use client';

import { useState } from 'react';
import {
  ArrowRight,
  ExternalLink,
  Handshake,
  Percent,
  Timer,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TIER_DEFINITIONS } from '@/constants/tiers';

// Source of truth for the public numbers displayed on the page.
// These MUST match what is configured inside the Lemon Squeezy affiliate program
// dashboard — they are the public promise to applicants. Update both in lockstep.
const AFFILIATE_PROGRAM = {
  commissionPercent: 15,
  cookieWindowDays: 60,
  // Lemon Squeezy bi-monthly schedule:
  //   Payouts created: 1st and 15th of each month
  //   Payouts paid:    14th and 28th of each month
  //   Holding period:  30 days before commissions become available
  payoutCadence: 'Bi-monthly',
} as const;

// Shared submit-button style, matching the gradient used by /contact and /pricing CTAs.
const CTA_GRADIENT_BG =
  'linear-gradient(to right, var(--tc-primary), var(--tc-accent), var(--tc-accent-end))';
const CTA_GRADIENT_SHADOW =
  '0 10px 15px -3px color-mix(in oklab, var(--tc-primary) 30%, transparent), 0 4px 6px -4px color-mix(in oklab, var(--tc-primary) 20%, transparent)';

const LS_AFFILIATES_URL = 'https://alpha-stats.lemonsqueezy.com/affiliates';

export function AffiliatesPageClient() {
  return (
    <section>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pt-30 sm:pt-40 pb-10 text-center">
        <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none px-4 py-1.5 backdrop-blur-sm">
          <Handshake className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--tc-primary)' }} />
          <span className="text-sm text-muted-foreground">Affiliate program</span>
        </div>

        <h1 className="text-3xl leading-[1.08] font-medium tracking-[-0.04em] text-balance sm:text-5xl">
          Earn when traders <br className="sm:hidden" />
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                'linear-gradient(to bottom, var(--foreground) 0%, var(--tc-accent) 100%)',
            }}
          >
            you know start tracking.
          </span>
        </h1>

        <p className="text-muted-foreground mt-4 max-w-2xl text-pretty">
          Share AlphaStats with your audience and earn a generous recurring commission on
          every subscription. Built for traders who already recommend it.
        </p>

        <div className="mt-8">
          <Button
            asChild
            size="lg"
            className="relative cursor-pointer overflow-hidden rounded-lg text-white font-semibold border-0 shadow-lg hover:shadow-xl transition-all duration-300 group h-11 px-6"
            style={{ background: CTA_GRADIENT_BG, boxShadow: CTA_GRADIENT_SHADOW }}
          >
            <a href={LS_AFFILIATES_URL} target="_blank" rel="noopener noreferrer">
              <span className="relative z-10 flex items-center gap-2">
                Apply to the program
                <ArrowRight className="h-4 w-4" />
              </span>
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
            </a>
          </Button>
        </div>
      </div>

      {/* ── 3 program stats ──────────────────────────────────────────────── */}
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 pb-12 sm:pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ProgramStat
            icon={<Percent className="h-4 w-4" />}
            value={`${AFFILIATE_PROGRAM.commissionPercent}%`}
            label="Recurring commission"
            detail="On every paid subscription your referral keeps."
          />
          <ProgramStat
            icon={<Timer className="h-4 w-4" />}
            value={`${AFFILIATE_PROGRAM.cookieWindowDays} days`}
            label="Cookie window"
            detail="Your referral converts any time within the window."
          />
          <ProgramStat
            icon={<Wallet className="h-4 w-4" />}
            value={AFFILIATE_PROGRAM.payoutCadence}
            label="Payouts"
            detail="Created on the 1st &amp; 15th, paid on the 14th &amp; 28th. 30-day holding period."
          />
        </div>
      </div>

      {/* ── Earnings Calculator ──────────────────────────────────────────── */}
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 pb-12 sm:pb-16">
        <EarningsCalculator />
      </div>

      {/* ── Apply section ────────────────────────────────────────────────── */}
      <div className="relative mx-auto max-w-2xl px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-medium tracking-[-0.03em] text-foreground">
            Ready to apply?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Apply directly through our affiliate portal. Takes less than a minute.
          </p>
        </div>

        <div className="rounded-2xl border border-black/[0.07] dark:border-white/[0.12] bg-transparent p-6 sm:p-8 transition-colors duration-200 hover:border-black/[0.12] dark:hover:border-white/[0.18]">
          <div className="flex flex-col items-center py-8 text-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{
                background:
                  'linear-gradient(135deg, color-mix(in oklab, var(--tc-primary) 20%, transparent), color-mix(in oklab, var(--tc-primary) 5%, transparent))',
                border: '1px solid color-mix(in oklab, var(--tc-primary) 30%, transparent)',
              }}
            >
              <Handshake className="h-7 w-7" style={{ color: 'var(--tc-primary)' }} />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Join the program</h3>
            <p className="text-muted-foreground max-w-sm">
              Apply through our Lemon Squeezy affiliate portal. Once approved, you&apos;ll get
              your unique referral link and access to your earnings dashboard.
            </p>
            <Button
              asChild
              className="mt-2 relative cursor-pointer overflow-hidden rounded-lg text-white font-semibold border-0 shadow-lg hover:shadow-xl transition-all duration-300 group h-11 px-6"
              style={{ background: CTA_GRADIENT_BG, boxShadow: CTA_GRADIENT_SHADOW }}
            >
              <a href={LS_AFFILIATES_URL} target="_blank" rel="noopener noreferrer">
                <span className="relative z-10 flex items-center gap-2">
                  Apply now
                  <ExternalLink className="h-4 w-4" />
                </span>
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
              </a>
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Opens in a new tab. You&apos;ll need a Lemon Squeezy account to apply.
            </p>
          </div>
        </div>
      </div>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <div className="relative mx-auto max-w-2xl px-4 sm:px-6 pb-20 sm:pb-28">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-medium tracking-[-0.03em] text-foreground">
            Frequently asked
          </h2>
        </div>
        <div className="space-y-4">
          <FaqItem
            question="When do I get paid?"
            answer="Payouts are created on the 1st and 15th, then released on the 14th and 28th after a 30-day holding period. Available in hundreds of countries; minor processing and currency fees apply. We do not hold any funds — everything goes through Lemon Squeezy."
          />
          <FaqItem
            question="How do I track clicks and conversions?"
            answer={
              <>
                Everything lives in your Lemon Squeezy Affiliate Hub — clicks, referrals,
                earnings, payout history, and creatives. We don&apos;t duplicate that dashboard
                inside AlphaStats.{' '}
                <a
                  href="https://docs.lemonsqueezy.com/help/affiliates/affiliate-hub"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                  style={{ color: 'var(--tc-primary)' }}
                >
                  Hub docs
                </a>
              </>
            }
          />
          <FaqItem
            question="What can't I do?"
            answer={
              <>
                No telemarketing, no impersonating AlphaStats or Lemon Squeezy, no unapproved
                product claims, no sub-affiliates without LS written approval. All campaigns
                must be pre-approved by LS and comply with applicable law. Read the{' '}
                <a
                  href="https://lemonsqueezy.com/affiliate-terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                  style={{ color: 'var(--tc-primary)' }}
                >
                  full affiliate terms
                </a>{' '}
                before you start promoting.
              </>
            }
          />
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Want to learn more about how affiliate programs work on Lemon Squeezy?{' '}
          <a
            href="https://docs.lemonsqueezy.com/help/affiliates/becoming-an-affiliate"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground transition-colors"
            style={{ color: 'var(--tc-primary)' }}
          >
            Read the Lemon Squeezy guide
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </p>
      </div>
    </section>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────────────

interface ProgramStatProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  detail: string;
}

function ProgramStat({ icon, value, label, detail }: ProgramStatProps) {
  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-black/[0.07] dark:border-white/[0.12] bg-transparent p-6 transition-colors duration-200 hover:border-black/[0.12] dark:hover:border-white/[0.18]">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl"
        style={{
          backgroundColor: 'color-mix(in oklab, var(--tc-primary) 12%, transparent)',
          color: 'var(--tc-primary)',
        }}
      >
        {icon}
      </div>
      <div className="text-3xl font-medium text-foreground tracking-[-0.03em] leading-none">
        {value}
      </div>
      <div className="text-sm font-semibold text-foreground/80 group-hover:text-foreground transition-colors">
        {label}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}

const MONTHLY_PRICE = TIER_DEFINITIONS.pro.pricing.monthly?.usd ?? 11.99;
const ANNUAL_PRICE = TIER_DEFINITIONS.pro.pricing.annual?.usd ?? 114.99;

function EarningsCalculator() {
  const [referrals, setReferrals] = useState(10);
  const [plan, setPlan] = useState<'monthly' | 'annual'>('monthly');

  const rate = AFFILIATE_PROGRAM.commissionPercent / 100;
  const monthlyEarnings = plan === 'monthly'
    ? referrals * MONTHLY_PRICE * rate
    : referrals * (ANNUAL_PRICE * rate) / 12;
  const yearlyEarnings = plan === 'monthly'
    ? referrals * MONTHLY_PRICE * rate * 12
    : referrals * ANNUAL_PRICE * rate;

  const trackPct = ((referrals - 1) / 199) * 100;

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

  return (
    <div className="rounded-2xl border border-black/[0.07] dark:border-white/[0.12] bg-transparent p-6 sm:p-8 transition-colors duration-200 hover:border-black/[0.12] dark:hover:border-white/[0.18]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
          style={{
            backgroundColor: 'color-mix(in oklab, var(--tc-primary) 12%, transparent)',
            color: 'var(--tc-primary)',
          }}
        >
          <TrendingUp className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground tracking-[-0.02em]">Earnings calculator</h2>
          <p className="text-xs text-muted-foreground">Estimate your monthly and yearly commission</p>
        </div>
      </div>

      {/* Plan toggle */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Subscriber plan</p>
        <div className="inline-flex rounded-xl border border-black/[0.07] dark:border-white/[0.12] p-1 gap-1">
          {(['monthly', 'annual'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlan(p)}
              className="relative px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
              style={plan === p ? {
                background: 'color-mix(in oklab, var(--tc-primary) 15%, transparent)',
                color: 'var(--tc-primary)',
              } : {
                color: 'var(--muted-foreground)',
              }}
            >
              {p === 'monthly' ? 'Monthly' : 'Annual'}
            </button>
          ))}
        </div>
      </div>

      {/* Slider */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Referrals</p>
          <span className="text-2xl font-semibold text-foreground tracking-[-0.03em]">{referrals}</span>
        </div>
        <input
          type="range"
          min={1}
          max={200}
          step={1}
          value={referrals}
          onChange={(e) => setReferrals(Number(e.target.value))}
          className="w-full h-5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_2px_6px_rgba(0,0,0,0.4)] [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
          style={{
            background: `linear-gradient(to right, white 0%, white ${trackPct}%, rgb(100 116 139 / 0.35) ${trackPct}%, rgb(100 116 139 / 0.35) 100%) center / 100% 6px no-repeat`,
          }}
        />
        <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5">
          <span>1</span>
          <span>200</span>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl p-5 border border-black/[0.07] dark:border-white/[0.12]">
          <p className="text-xs text-muted-foreground mb-1">Monthly earnings</p>
          <p className="text-2xl sm:text-3xl font-semibold text-foreground tracking-[-0.03em]">
            {fmt(monthlyEarnings)}
          </p>
          {plan === 'annual' && (
            <p className="text-[11px] text-muted-foreground mt-1">Commission paid annually</p>
          )}
        </div>
        <div
          className="rounded-xl p-5 border"
          style={{
            background: 'color-mix(in oklab, var(--tc-primary) 8%, transparent)',
            borderColor: 'color-mix(in oklab, var(--tc-primary) 25%, transparent)',
          }}
        >
          <p className="text-xs text-muted-foreground mb-1">Yearly earnings</p>
          <p className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em]" style={{ color: 'var(--tc-primary)' }}>
            {fmt(yearlyEarnings)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">{AFFILIATE_PROGRAM.commissionPercent}% of {plan === 'monthly' ? `$${MONTHLY_PRICE}/mo` : `$${ANNUAL_PRICE}/yr`} × {referrals}</p>
        </div>
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground text-center">
        Estimates only. Actual earnings depend on active subscriptions and Lemon Squeezy fee deductions.
      </p>
    </div>
  );
}

function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: React.ReactNode;
}) {
  return (
    <div className="group rounded-xl border border-black/[0.07] dark:border-white/[0.12] bg-transparent p-5 transition-colors duration-200 hover:border-black/[0.12] dark:hover:border-white/[0.18] sm:p-6">
      <h3 className="text-sm sm:text-base font-semibold leading-snug text-foreground/80 group-hover:text-foreground transition-colors mb-2">
        {question}
      </h3>
      <p className="text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
        {answer}
      </p>
    </div>
  );
}
