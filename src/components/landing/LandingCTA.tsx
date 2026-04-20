'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

function CallToAction1() {
  return (
    <div className="max-w-6xl py-16 md:w-full mx-2 md:mx-auto flex flex-col items-center justify-center text-center rounded-2xl p-10 text-white relative overflow-hidden bg-transparent"
    >
      {/* Animated border — rotating conic gradient via @property --border-angle */}
      <div
        aria-hidden
        className="absolute -inset-[1px] rounded-2xl pointer-events-none cta-border-glow"
      />

      {/* Static subtle border fallback for when animation isn't visible */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-2xl pointer-events-none border border-white/10"
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* Badge */}
        <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full border border-border/40 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm text-sm font-medium text-white/90">
          <span className="size-2 rounded-full shrink-0 mr-2" style={{ background: 'var(--tc-primary)' }} />
          Your edge starts here
        </div>

        {/* Heading */}
        <h2 className="text-4xl md:text-5xl md:leading-[60px] font-semibold max-w-xl mt-5 bg-gradient-to-r from-white to-white/70 text-transparent bg-clip-text">
          Ready to own your trading results?
        </h2>

        {/* Subtitle */}
        <p className="mt-4 max-w-md text-base text-muted-foreground">
          Stop guessing. Start measuring every trade, every pattern, every edge — completely free.
        </p>

        {/* CTA button */}
        <Link
          href="/login"
          className="group relative overflow-hidden inline-flex items-center gap-2 px-8 py-3 text-sm font-semibold uppercase tracking-wide rounded-xl mt-8 transition-all duration-300 bg-white text-slate-900 hover:bg-white/90"
          style={{
            boxShadow: '0 10px 25px -5px color-mix(in oklch, var(--tc-primary) 50%, transparent)',
          }}
        >
          <span className="relative z-10 flex items-center gap-2">
            Get started for free
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
          </span>
        </Link>
      </div>
    </div>
  );
}

export function LandingCTA() {
  const sectionRef = useScrollReveal<HTMLElement>();

  return (
    <section ref={sectionRef} className="relative">
      {/* Background blends */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div
          className="absolute inset-0 -z-30"
          style={{
            backgroundImage: [
              'radial-gradient(50% 40% at 50% 50%, color-mix(in oklch, var(--tc-primary) 10%, transparent) 0%, transparent 70%)',
            ].join(','),
          }}
        />
        {/* Soft vignette */}
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(140%_120%_at_50%_0%,transparent_65%,#ffffff_100%)] dark:bg-[radial-gradient(140%_120%_at_50%_0%,transparent_65%,#0d0a12_100%)]" />
        {/* Top gradient blend */}
        <div className="absolute top-0 left-0 right-0 h-32 z-[1] bg-gradient-to-b from-white to-transparent dark:from-[#0d0a12] dark:to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-[2] mx-auto max-w-6xl px-4 py-24 sm:py-32">
        <div className="scroll-reveal" style={{ '--reveal-delay': '0ms' } as React.CSSProperties}>
          <CallToAction1 />
        </div>
      </div>
    </section>
  );
}
