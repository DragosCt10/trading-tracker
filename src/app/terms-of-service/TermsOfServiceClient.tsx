'use client';

import Link from 'next/link';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { PricingHeroBackground } from '@/components/pricing/PricingHeroBackground';
import { Footer } from '@/components/shared/Footer';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    content: (
      <>
        <p>
          By accessing and using Alpha Stats, you agree to be bound by these
          Terms of Service. If you do not agree, do not use the platform.
        </p>
        <p className="mt-3">
          We may update these Terms at any time. The updated version becomes
          effective upon posting. Your continued use of the platform means you
          accept the changes.
        </p>
      </>
    ),
  },
  {
    title: '2. Description of Service',
    content: (
      <>
        <p>
          Alpha Stats is an online trading statistics platform. It allows users
          to log trades, track performance, analyze statistics, and gain insights
          into their trading behavior.
        </p>
        <p className="mt-3">
          The platform may include features such as dashboards, performance
          metrics, journaling tools, and AI-powered journaling assistance.
        </p>
        <p className="mt-3">
          All information provided is for informational and educational purposes
          only.
        </p>
      </>
    ),
  },
  {
    title: '3. Account Registration',
    content: (
      <>
        <p className="mb-3">To use Alpha Stats, you must:</p>
        <ul className="list-disc pl-6 space-y-1.5 text-muted-foreground">
          <li>Be at least 18 years old</li>
          <li>Provide accurate and complete information</li>
          <li>Maintain the security of your account credentials</li>
        </ul>
        <p className="mt-3">
          You are responsible for all activity under your account.
        </p>
        <p className="mt-3">
          You may not create multiple accounts for abusive purposes. We reserve
          the right to suspend or terminate accounts at our discretion.
        </p>
      </>
    ),
  },
  {
    title: '4. Subscription and Payment',
    content: (
      <>
        <p>Some features require a paid subscription.</p>
        <p className="mt-3 mb-3">By subscribing, you agree that:</p>
        <ul className="list-disc pl-6 space-y-1.5 text-muted-foreground">
          <li>Subscriptions are billed on a recurring basis</li>
          <li>Payments are processed through third-party providers</li>
          <li>
            Subscriptions renew automatically unless canceled before the billing
            date
          </li>
        </ul>
        <p className="mt-3">
          You can cancel your subscription at any time through your account
          settings. Cancellation stops future billing but does not provide
          refunds for the current billing period.
        </p>
        <p className="mt-3">
          If a payment fails, we may suspend or limit access to paid features.
        </p>
      </>
    ),
  },
  {
    title: '5. No Financial Advice',
    content: (
      <>
        <p>Alpha Stats is a data analysis and journaling tool only.</p>
        <p className="mt-3">
          We do not provide financial advice, investment recommendations, or
          trading signals. You are solely responsible for your trading decisions.
        </p>
        <p className="mt-3">
          Trading and investing involve risk. You may lose part or all of your
          capital. Past performance does not guarantee future results.
        </p>
      </>
    ),
  },
  {
    title: '6. Acceptable Use',
    content: (
      <>
        <p className="mb-3">You agree not to:</p>
        <ul className="list-disc pl-6 space-y-1.5 text-muted-foreground">
          <li>Share or resell your account access</li>
          <li>Copy, distribute, or exploit the platform</li>
          <li>Use automated systems to scrape or extract data</li>
          <li>Engage in illegal or abusive activity</li>
        </ul>
        <p className="mt-3">
          We may suspend or terminate your account if you violate these rules.
        </p>
      </>
    ),
  },
  {
    title: '7. Intellectual Property',
    content: (
      <>
        <p>
          All content, design, software, and functionality of Alpha Stats are
          owned by us.
        </p>
        <p className="mt-3">
          You may not copy, modify, distribute, or reverse engineer any part of
          the platform without permission.
        </p>
      </>
    ),
  },
  {
    title: '8. Termination',
    content: (
      <>
        <p>
          We may suspend or terminate your account at any time if you violate
          these Terms.
        </p>
        <p className="mt-3">You may stop using the platform at any time.</p>
        <p className="mt-3">
          Upon termination, your access to the platform may be removed, and your
          data may be deleted according to our policies.
        </p>
      </>
    ),
  },
  {
    title: '9. Limitation of Liability',
    content: (
      <>
        <p>
          We are not liable for any financial losses, trading losses, or damages
          resulting from the use of the platform.
        </p>
        <p className="mt-3">
          The service is provided &ldquo;as is&rdquo; without guarantees of
          accuracy, reliability, or availability.
        </p>
        <p className="mt-3">
          Our total liability, if any, is limited to the amount you paid in the
          last 12 months.
        </p>
      </>
    ),
  },
  {
    title: '10. Modifications',
    content: (
      <>
        <p>
          We may update or modify these Terms at any time at our sole discretion.
        </p>
        <p className="mt-3">
          Any changes become effective immediately upon posting on the platform,
          unless stated otherwise.
        </p>
        <p className="mt-3">
          We may notify users of material changes via email or through the
          platform, but it is your responsibility to review these Terms
          periodically.
        </p>
        <p className="mt-3">
          Your continued use of Alpha Stats after any changes means you accept
          the updated Terms.
        </p>
      </>
    ),
  },
  {
    title: '11. Contact',
    content: (
      <p>
        If you have any questions about these Terms of Service,{' '}
        <Link
          href="/contact"
          className="underline decoration-white text-white underline-offset-2"
        >
          contact us
        </Link>
        .
      </p>
    ),
  },
] as const;

export function TermsOfServiceClient() {
  return (
    <div className="landing-page-override w-full">
      <LandingNavbar />

      <section className="relative overflow-clip">
        <PricingHeroBackground />

      <main className="relative mx-auto max-w-3xl px-4 sm:px-6 pt-32 sm:pt-40 pb-16 sm:pb-24">
        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em] text-white">
          Terms of Service
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
