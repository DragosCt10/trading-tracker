'use client';

import { useRef, useEffect, useState, forwardRef } from 'react';
import { SectionBadge, SectionHeading } from '@/components/landing/shared';
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
  useSpring,
  useInView,
  useMotionValue,
} from 'framer-motion';
import Link from 'next/link';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { BGPattern } from '@/components/ui/bg-pattern';
import { NeuralConnections } from './features/NeuralConnections';
import { BrainHub } from './features/BrainHub';

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

/* ── FeatureCard ── */

interface FeatureCardProps {
  icon: typeof CalendarDays;
  title: string;
  description: string;
  delayMs: number;
}

const FeatureCard = forwardRef<HTMLDivElement, FeatureCardProps>(
  function FeatureCard({ icon: Icon, title, description, delayMs }, ref) {
    return (
      <motion.div
        ref={ref}
        className="scroll-reveal relative rounded-xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm text-muted-foreground p-6"
        style={{ '--reveal-delay': `${delayMs}ms` } as React.CSSProperties}
      >
        <div className="flex items-start gap-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: 'color-mix(in oklch, var(--tc-primary) 10%, transparent)',
              border: '1px solid color-mix(in oklch, var(--tc-primary) 22%, transparent)',
            }}
          >
            <Icon className="h-5 w-5" style={{ color: 'var(--tc-primary)' }} />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-foreground/90 mb-1">{title}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          </div>
        </div>
      </motion.div>
    );
  }
);

/* ── AnimatedCounter ── */

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
      className="group flex flex-col items-center text-center rounded-xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm text-card-foreground p-6 transition-colors duration-300 hover:border-slate-300/50 dark:hover:border-slate-600/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
    >
      <span className="text-3xl font-bold text-foreground tracking-tight">
        {display}{suffix}
      </span>
      <span className="text-sm text-muted-foreground mt-1">{label}</span>
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

  // Refs for desktop neural connections
  const containerRef = useRef<HTMLDivElement>(null);
  const brainRef = useRef<HTMLDivElement>(null);
  const leftCardRefs = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const rightCardRefs = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const statsRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);

  const allFeatures = [...FEATURES_LEFT, ...FEATURES_RIGHT];

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
          <SectionBadge label="Features" />

          <SectionHeading>
            Everything you need to
            <br />
            trade like a PRO.
          </SectionHeading>

          <p
            className="scroll-reveal mt-5 text-base text-muted-foreground leading-relaxed max-w-md mx-auto"
            style={{ '--reveal-delay': '200ms' } as React.CSSProperties}
          >
            Deep analytics, risk management, and journaling tools designed for
            serious traders who study every session.
          </p>
        </div>

        {/* ── Desktop (lg+): feature grid + stats in one relative container ── */}
        <div ref={containerRef} className="hidden lg:block relative">

          {/* SVG neural connections — behind all content */}
          <NeuralConnections
            containerRef={containerRef}
            brainRef={brainRef}
            leftCardRefs={leftCardRefs}
            rightCardRefs={rightCardRefs}
            statsRefs={statsRefs}
          />

          {/* 3-col feature grid */}
          <div className="grid grid-cols-[1fr_220px_1fr] gap-x-8">

            {/* Left cards */}
            <div className="flex flex-col gap-6 relative z-10">
              {FEATURES_LEFT.map((f, i) => (
                <FeatureCard
                  key={f.title}
                  ref={(el) => { leftCardRefs.current[i] = el; }}
                  icon={f.icon}
                  title={f.title}
                  description={f.description}
                  delayMs={300 + i * 100}
                />
              ))}
            </div>

            {/* Brain center */}
            <div
              ref={brainRef}
              className="flex items-center justify-center pointer-events-none"
              style={{ zIndex: 20 }}
            >
              <BrainHub />
            </div>

            {/* Right cards */}
            <div className="flex flex-col gap-6 relative z-10">
              {FEATURES_RIGHT.map((f, i) => (
                <FeatureCard
                  key={f.title}
                  ref={(el) => { rightCardRefs.current[i] = el; }}
                  icon={f.icon}
                  title={f.title}
                  description={f.description}
                  delayMs={300 + (i + 3) * 100}
                />
              ))}
            </div>
          </div>

          {/* Stats row — inside same container so SVG can reach them */}
          <div className="mt-20 grid grid-cols-4 gap-6 relative z-10">
            {STATS.map((stat, i) => (
              <div key={stat.label} ref={(el) => { statsRefs.current[i] = el; }}>
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  label={stat.label}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Mobile / tablet (<lg): plain stacked layout ── */}
        <div className="lg:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {allFeatures.map((f, i) => (
              <FeatureCard
                key={f.title}
                icon={f.icon}
                title={f.title}
                description={f.description}
                delayMs={300 + i * 100}
              />
            ))}
          </div>

          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {STATS.map((stat) => (
              <AnimatedCounter
                key={stat.label}
                value={stat.value}
                suffix={stat.suffix}
                label={stat.label}
              />
            ))}
          </div>
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
            Start tracking like a PRO
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
