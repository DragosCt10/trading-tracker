'use client';

import { useRef, useEffect, useState } from 'react';
import {
  CalendarDays,
  CalendarRange,
  Newspaper,
  Tags,
  BarChart3,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useInView,
  useMotionValue,
} from 'framer-motion';
import Link from 'next/link';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { BGPattern } from '@/components/ui/bg-pattern';
import { CpuArchitecture } from '@/components/ui/cpu-architecture';

/* ── Feature data ── */

const FEATURES_LEFT = [
  {
    icon: CalendarDays,
    title: 'Trades Calendar',
    description:
      'Monthly view with color-coded daily P&L, weekly breakdowns, and per-market filtering at a glance.',
  },
  {
    icon: CalendarRange,
    title: 'Date Range Picker',
    description:
      'Flexible date filtering with quick presets, custom ranges, and full year-level views.',
  },
  {
    icon: Newspaper,
    title: 'News Trade Marking',
    description:
      'Flag trades around CPI, NFP, and FOMC events with low-medium-high intensity levels.',
  },
];

const FEATURES_RIGHT = [
  {
    icon: Tags,
    title: 'Custom Trade Tags',
    description:
      '10 color-coded tags — pin your favorites for instant one-click categorization.',
  },
  {
    icon: BarChart3,
    title: '60+ Analytics Cards',
    description:
      'Performance, risk, psychology, and market analysis — all computed in real time.',
  },
  {
    icon: ShieldCheck,
    title: 'Risk Management',
    description:
      'Track max drawdown, recovery factor, and risk-per-trade across every account.',
  },
];

const STATS = [
  { value: 60, suffix: '+', label: 'Analytics Cards' },
  { value: 20, suffix: '+', label: 'Filter Criteria' },
  { value: 10, suffix: '', label: 'Tag Colors' },
  { value: 5, suffix: '', label: 'Risk Metrics' },
];

/* ── Sub-components ── */

function FeatureCard({
  icon: Icon,
  title,
  description,
  direction,
  delayMs,
}: {
  icon: typeof CalendarDays;
  title: string;
  description: string;
  direction: 'left' | 'right';
  delayMs: number;
}) {
  return (
    <motion.div
      className="scroll-reveal group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm transition-colors duration-500 hover:border-white/[0.12] hover:bg-white/[0.04]"
      style={{ '--reveal-delay': `${delayMs}ms` } as React.CSSProperties}
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
    >
      {/* Corner accent on hover */}
      <div
        className={`absolute top-0 ${direction === 'left' ? 'left-0 rounded-tl-2xl' : 'right-0 rounded-tr-2xl'} w-12 h-12 opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
        style={{
          background:
            direction === 'left'
              ? 'linear-gradient(135deg, color-mix(in oklch, var(--tc-primary) 15%, transparent), transparent)'
              : 'linear-gradient(225deg, color-mix(in oklch, var(--tc-primary) 15%, transparent), transparent)',
        }}
      />

      <div className="flex items-start gap-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300 group-hover:brightness-125"
          style={{
            backgroundColor: 'color-mix(in oklch, var(--tc-primary) 10%, transparent)',
            border: '1px solid color-mix(in oklch, var(--tc-primary) 22%, transparent)',
          }}
        >
          <Icon className="h-5 w-5" style={{ color: 'var(--tc-primary)' }} />
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-foreground/90 mb-1">{title}</p>
          <p className="text-sm text-white/40 leading-relaxed">{description}</p>
        </div>
      </div>
    </motion.div>
  );
}


function AnimatedCounter({
  value,
  suffix,
  label,
}: {
  value: number;
  suffix: string;
  label: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { damping: 30, stiffness: 100 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (isInView) motionVal.set(value);
  }, [isInView, motionVal, value]);

  useEffect(() => {
    const unsub = spring.on('change', (v) => setDisplay(Math.round(v)));
    return unsub;
  }, [spring]);

  return (
    <div
      ref={ref}
      className="group flex flex-col items-center text-center rounded-2xl border border-white/[0.04] bg-white/[0.02] backdrop-blur-sm p-6 transition-colors duration-300 hover:border-white/[0.08] hover:bg-white/[0.04]"
    >
      <span className="text-3xl font-bold text-foreground tracking-tight">
        {display}{suffix}
      </span>
      <span className="text-sm text-white/35 mt-1">{label}</span>
      <div
        className="w-8 h-0.5 mt-3 rounded-full group-hover:w-12 transition-all duration-300"
        style={{ backgroundColor: 'var(--tc-primary)', opacity: 0.5 }}
      />
    </div>
  );
}

/* ── Main component ── */

export function LandingFeatures() {
  const sectionRef = useScrollReveal<HTMLElement>();
  const calendarRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: calendarRef,
    offset: ['start end', 'end start'],
  });

  const calendarY = useTransform(scrollYProgress, [0, 1], [30, -30]);

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative scroll-mt-20"
    >
      {/* Background treatment */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-[15%] left-1/4 w-[500px] h-[500px] orb-bg-1 rounded-full blur-3xl" />
        <div className="absolute bottom-[10%] right-1/4 w-[500px] h-[500px] orb-bg-2 rounded-full blur-3xl" />
        <BGPattern variant="dots" mask="fade-edges" size={24} fill="rgba(255,255,255,0.08)" />
      </div>

      {/* Top gradient blend */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 right-0 h-32"
        style={{ background: 'linear-gradient(to bottom, #0d0a12 0%, transparent 100%)' }}
      />

      <div className="relative z-[2] mx-auto max-w-6xl px-4 py-24 sm:py-32">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div
            className="scroll-reveal inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 backdrop-blur-sm mb-6"
            style={{ '--reveal-delay': '0ms' } as React.CSSProperties}
          >
            <span
              className="h-1.5 w-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: 'var(--tc-accent)' }}
            />
            <span className="text-sm text-white/50">Features</span>
          </div>

          <h2
            className="scroll-reveal text-3xl sm:text-4xl lg:text-[42px] font-medium leading-[1.12] tracking-[-0.03em] bg-clip-text text-transparent"
            style={{
              backgroundImage: 'linear-gradient(to bottom, var(--foreground) 40%, var(--tc-accent))',
              '--reveal-delay': '100ms',
            } as React.CSSProperties}
          >
            Everything you need to
            <br />
            trade like a PRO.
          </h2>

          <p
            className="scroll-reveal mt-5 text-base text-white/40 leading-relaxed max-w-md mx-auto"
            style={{ '--reveal-delay': '200ms' } as React.CSSProperties}
          >
            Deep analytics, risk management, and journaling tools designed for
            serious traders who study every session.
          </p>
        </div>

        {/* ── Feature grid with CPU background ── */}
        <div ref={calendarRef} className="relative">
          {/* CPU Architecture background — centered behind cards */}
          <div className="absolute inset-0 z-0 hidden lg:flex items-center justify-center pointer-events-none">
            <motion.div
              className="w-full h-full max-h-[600px]"
              style={{ y: calendarY }}
            >
              <CpuArchitecture
                text="ALPHA STATS"
                width="100%"
                height="100%"
              />
            </motion.div>
          </div>

          {/* Mobile-only: CPU shown on top */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="w-full max-w-sm h-[200px]">
              <CpuArchitecture text="ALPHA STATS" width="100%" height="100%" />
            </div>
          </div>

          {/* Cards grid — sits on top */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-5 lg:gap-x-[28%] lg:gap-y-5">
            {[...FEATURES_LEFT, ...FEATURES_RIGHT].map((f, i) => (
              <FeatureCard
                key={f.title}
                icon={f.icon}
                title={f.title}
                description={f.description}
                direction={i < 3 ? 'left' : 'right'}
                delayMs={300 + i * 100}
              />
            ))}
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map((stat) => (
            <AnimatedCounter
              key={stat.label}
              value={stat.value}
              suffix={stat.suffix}
              label={stat.label}
            />
          ))}
        </div>

        {/* ── CTA ── */}
        <div
          className="scroll-reveal mt-16 text-center"
          style={{ '--reveal-delay': '400ms' } as React.CSSProperties}
        >
          <p className="text-white/30 text-sm mb-5">
            Built for traders who take their edge seriously.
          </p>
          <Link
            href="/login"
            className="group inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-medium text-white transition-all duration-300 hover:brightness-110 hover:scale-[1.03]"
            style={{
              background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-accent-end))',
              boxShadow: '0 0 24px color-mix(in oklch, var(--tc-primary) 30%, transparent)',
            }}
          >
            Start tracking your edge
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
        </div>
      </div>

      {/* Bottom gradient blend */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 z-[1]"
        style={{ background: 'linear-gradient(to top, #0d0a12 0%, transparent 100%)' }}
      />
    </section>
  );
}
