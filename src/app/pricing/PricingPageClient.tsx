'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PublicPageShell } from '@/components/shared/PublicPageShell';
import { useParallax } from '@/hooks/useParallax';
import { createPublicCheckoutUrl } from '@/lib/server/subscription';
import type { BillingPeriod } from '@/types/subscription';
import { PricingFAQ } from '@/components/pricing/PricingFAQ';
import { PricingComparison } from '@/components/pricing/PricingComparison';
import { PaymentSecuredInfo } from '@/components/pricing/PaymentSecuredInfo';

export function PricingPageClient() {
  const sectionRef = useParallax();
  const router = useRouter();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('annual');
  const [isCheckoutPending, startCheckoutTransition] = useTransition();

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
          <PricingComparison
            billingPeriod={billingPeriod}
            setBillingPeriod={setBillingPeriod}
            isCheckoutPending={isCheckoutPending}
            onCheckout={handleCheckout}
          />

          {/* Secured payment info */}
          <PaymentSecuredInfo className="mx-auto mt-2 max-w-xl" />
        </div>

        <PricingFAQ className="mt-4 sm:mt-8" />
      </section>
    </PublicPageShell>
  );
}
