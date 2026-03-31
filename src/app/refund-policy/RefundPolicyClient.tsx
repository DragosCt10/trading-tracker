'use client';

import { LandingHeader } from '@/components/landing/LandingHeader';
import { PricingHeroBackground } from '@/components/pricing/PricingHeroBackground';
import { Footer } from '@/components/shared/Footer';

const SECTIONS = [
  {
    title: 'No Refunds',
    content: (
      <>
        <p>All purchases are final.</p>
        <p className="mt-3">
          Due to the nature of our digital product, access to Alpha Stats paid
          features is granted immediately after payment. By purchasing a
          subscription, you agree that you lose your right of withdrawal once
          access to the service has been provided.
        </p>
        <p className="mt-3">
          We do not offer refunds for any subscription payments, including
          partial billing periods.
        </p>
      </>
    ),
  },
  {
    title: 'Free Plan',
    content: (
      <>
        <p>Alpha Stats offers a free plan with limited features.</p>
        <p className="mt-3">
          You can use the free plan to evaluate the platform before upgrading to
          a paid subscription. By choosing to upgrade, you acknowledge that you
          understand the features included in the paid plan.
        </p>
      </>
    ),
  },
  {
    title: 'Subscription and Billing',
    content: (
      <>
        <p>All subscriptions are billed on a recurring basis.</p>
        <p className="mt-3">
          Your subscription will automatically renew at the end of each billing
          period unless you cancel it before the next billing date.
        </p>
        <p className="mt-3">
          You are responsible for managing your subscription and canceling it in
          time if you do not wish to be charged again.
        </p>
      </>
    ),
  },
  {
    title: 'Cancellation',
    content: (
      <>
        <p>
          You can cancel your subscription at any time through your account
          settings.
        </p>
        <p className="mt-3">
          Cancellation stops future billing. You will continue to have access to
          paid features until the end of your current billing period.
        </p>
        <p className="mt-3">
          After the billing period ends, your account will revert to the free
          plan.
        </p>
        <p className="mt-3">
          No refunds or credits are provided for unused time.
        </p>
      </>
    ),
  },
  {
    title: 'Billing Issues and Exceptions',
    content: (
      <>
        <p className="mb-3">
          Refunds may be issued only in the following cases:
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-muted-foreground">
          <li>Duplicate charges</li>
          <li>Incorrect billing caused by a system error</li>
          <li>
            Verified technical issues that prevented access to paid features
          </li>
        </ul>
        <p className="mt-3">
          All requests are reviewed on a case-by-case basis.
        </p>
      </>
    ),
  },
  {
    title: 'Contact',
    content: (
      <p>
        If you believe you were charged in error, contact us at{' '}
        <a
          href="mailto:info@alpha-stats.com"
          className="underline decoration-white text-white underline-offset-2"
        >
          info@alpha-stats.com
        </a>
        .
      </p>
    ),
  },
] as const;

export function RefundPolicyClient() {
  return (
    <div className="landing-page-override w-full">
      <LandingHeader />

      <section className="relative overflow-clip">
        <PricingHeroBackground />

      <main className="relative mx-auto max-w-3xl px-4 sm:px-6 pt-32 sm:pt-40 pb-16 sm:pb-24">
        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em] text-white">
          Refund Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: March 31, 2026</p>

        {/* Divider with theme accent */}
        <div className="mt-6 mb-10 h-px w-full overflow-hidden">
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(90deg, var(--tc-primary), transparent 80%)`,
              opacity: 0.3,
            }}
          />
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-white/90 mb-3">
                {section.title}
              </h2>
              <div className="text-[15px] leading-relaxed text-muted-foreground">
                {section.content}
              </div>
            </section>
          ))}
        </div>
      </main>

      <div className="relative [&>footer]:bg-transparent [&>footer]:border-0 [&>footer]:mt-0">
        <Footer />
      </div>
      </section>
    </div>
  );
}
