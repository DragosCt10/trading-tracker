'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PublicPageShell } from '@/components/shared/PublicPageShell';
import { createPublicCheckoutUrl } from '@/lib/server/subscription';
import type { BillingPeriod, TierId } from '@/types/subscription';
import { PricingFAQ } from '@/components/pricing/PricingFAQ';
import { PricingComparison } from '@/components/pricing/PricingComparison';
import { PaymentSecuredInfo } from '@/components/pricing/PaymentSecuredInfo';
import { EarlyBirdBanner } from '@/components/pricing/EarlyBirdBanner';
import { EARLY_BIRD_LIMIT } from '@/constants/earlyBird';
import { useDisplayedEarlyBirdSlots } from '@/utils/earlyBirdSlots';

type PaidTierId = Exclude<TierId, 'starter' | 'elite'>;

interface PricingPageClientProps {
  earlyBirdSlotsUsed: number;
}

export function PricingPageClient({ earlyBirdSlotsUsed }: PricingPageClientProps) {
  const router = useRouter();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('annual');
  const [isCheckoutPending, startCheckoutTransition] = useTransition();
  const [pendingCheckoutTier, setPendingCheckoutTier] = useState<PaidTierId | null>(null);
  // Checkout eligibility uses the REAL count so we never sell past the cap.
  const earlyBirdAvailable = earlyBirdSlotsUsed < EARLY_BIRD_LIMIT;
  // Banner display uses the merged real+simulated count (ticks every minute)
  // so it stays in sync with the landing-page launch banner.
  const displayedSlotsUsed = useDisplayedEarlyBirdSlots(earlyBirdSlotsUsed);

  function handleCheckout(tier: PaidTierId) {
    setPendingCheckoutTier(tier);
    startCheckoutTransition(async () => {
      try {
        // Early-bird only applies to Pro. Starter Plus always uses its regular variants.
        const url = await createPublicCheckoutUrl(tier, billingPeriod, tier === 'pro' && earlyBirdAvailable);
        router.push(url);
      } catch {
        router.push('/signup');
      }
    });
  }

  return (
    <PublicPageShell>
      <section>
        {/* Hero */}
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pt-30 sm:pt-40 pb-10 text-center">
          <h1 className="text-3xl leading-[1.08] font-medium tracking-[-0.04em] text-balance sm:text-5xl">
            Clear pricing,{' '}
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

          <p className="text-muted-foreground mt-4 max-w-2xl text-pretty">
            Start free. Upgrade when your trading demands deeper insights,{' '}
            <br />
            more stats board, and full control.
          </p>
        </div>

        {/* Pricing cards + table */}
        <div className="relative mx-auto max-w-6xl px-2 sm:px-4 pb-12 sm:pb-20">
          <EarlyBirdBanner slotsUsed={displayedSlotsUsed} className="mb-6" />

          <PricingComparison
            billingPeriod={billingPeriod}
            setBillingPeriod={setBillingPeriod}
            isCheckoutPending={isCheckoutPending}
            pendingCheckoutTier={pendingCheckoutTier}
            onCheckout={handleCheckout}
            useEarlyBird={earlyBirdAvailable}
          />

          {/* Secured payment info */}
          <PaymentSecuredInfo className="mx-auto mt-2 max-w-xl" />
        </div>

        <PricingFAQ className="mt-4 sm:mt-8" />
      </section>
    </PublicPageShell>
  );
}
