'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PublicPageShell } from '@/components/shared/PublicPageShell';
import { useParallax } from '@/hooks/useParallax';
import { createPublicCheckoutUrl } from '@/lib/server/subscription';
import { createPublicAddonCheckoutUrl } from '@/lib/server/addons';
import type { BillingPeriod } from '@/types/subscription';
import { PricingFAQ } from '@/components/pricing/PricingFAQ';
import { PricingComparison } from '@/components/pricing/PricingComparison';
import { PaymentSecuredInfo } from '@/components/pricing/PaymentSecuredInfo';
import { EarlyBirdBanner } from '@/components/pricing/EarlyBirdBanner';
import { EARLY_BIRD_LIMIT } from '@/constants/earlyBird';

interface PricingPageClientProps {
  earlyBirdSlotsUsed: number;
  /**
   * ER-1: computed server-side from env. When false, the AddonCard is not
   * rendered and no checkout action is wired. This is the only gate — the
   * variant ID is never exposed to the client.
   */
  starterPlusAvailable: boolean;
}

export function PricingPageClient({
  earlyBirdSlotsUsed,
  starterPlusAvailable,
}: PricingPageClientProps) {
  const sectionRef = useParallax();
  const router = useRouter();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('annual');
  const [isCheckoutPending, startCheckoutTransition] = useTransition();
  const [isAddonCheckoutPending, startAddonCheckoutTransition] = useTransition();
  const earlyBirdAvailable = earlyBirdSlotsUsed < EARLY_BIRD_LIMIT;

  function handleCheckout() {
    startCheckoutTransition(async () => {
      try {
        const url = await createPublicCheckoutUrl(billingPeriod, earlyBirdAvailable);
        router.push(url);
      } catch {
        router.push('/signup');
      }
    });
  }

  function handleAddonCheckout() {
    startAddonCheckoutTransition(async () => {
      try {
        const url = await createPublicAddonCheckoutUrl('starter_plus');
        router.push(url);
      } catch {
        router.push('/signup');
      }
    });
  }

  return (
    <PublicPageShell>
      <section ref={sectionRef}>
        {/* Hero */}
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pt-30 sm:pt-40 pb-10 text-center">
          <h1
            data-parallax-speed="0.35"
            className="text-3xl leading-[1.08] font-medium tracking-[-0.04em] text-balance sm:text-5xl"
          >
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

          <p data-parallax-speed="0.25" className="text-muted-foreground mt-4 max-w-2xl text-pretty">
            Start free. Upgrade when your trading demands deeper insights,{' '}
            <br />
            more stats board, and full control.
          </p>
        </div>

        {/* Pricing cards + table */}
        <div className="relative mx-auto max-w-5xl px-2 sm:px-4 pb-12 sm:pb-20">
          {earlyBirdAvailable && (
            <EarlyBirdBanner slotsUsed={earlyBirdSlotsUsed} className="mb-6" />
          )}

          <PricingComparison
            billingPeriod={billingPeriod}
            setBillingPeriod={setBillingPeriod}
            isCheckoutPending={isCheckoutPending}
            onCheckout={handleCheckout}
            useEarlyBird={earlyBirdAvailable}
            starterPlusAvailable={starterPlusAvailable}
            onAddonCheckout={handleAddonCheckout}
            isAddonCheckoutPending={isAddonCheckoutPending}
          />

          {/* Secured payment info */}
          <PaymentSecuredInfo className="mx-auto mt-2 max-w-xl" />
        </div>

        <PricingFAQ className="mt-4 sm:mt-8" />
      </section>
    </PublicPageShell>
  );
}
