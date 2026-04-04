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

/* ── Equity curve SVG points ── */

const CURVE_POINTS = '0,80 30,72 55,78 80,60 110,65 140,48 170,52 200,35 230,40 260,22 290,28 320,12';
const CURVE_POINTS_SHADOW = '0,80 30,72 55,78 80,60 110,65 140,48 170,52 200,35 230,40 260,22 290,28 320,12 320,100 0,100';

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

function CenterVisual() {
  return (
    <div className="relative w-full max-w-[280px]">
      {/* Main card */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md p-6 space-y-5">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/25 mb-1">Portfolio</p>
            <p className="text-xl font-semibold text-foreground/90 tracking-tight">$52,480</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-medium text-emerald-400">+12.4%</span>
          </div>
        </div>

        {/* Mini equity curve */}
        <div className="relative h-[80px] w-full">
          <svg
            viewBox="0 0 320 100"
            fill="none"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--tc-primary)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="var(--tc-primary)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--tc-primary)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="var(--tc-primary)" stopOpacity="1" />
              </linearGradient>
            </defs>
            <polygon points={CURVE_POINTS_SHADOW} fill="url(#curveGrad)" />
            <polyline
              points={CURVE_POINTS}
              stroke="url(#lineGrad)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Glow dot at end */}
            <circle cx="320" cy="12" r="3" fill="var(--tc-primary)" />
            <circle cx="320" cy="12" r="6" fill="var(--tc-primary)" opacity="0.2" />
          </svg>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Win Rate', value: '68%' },
            { label: 'Profit Factor', value: '2.53' },
            { label: 'Sharpe', value: '1.84' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-[10px] text-white/25 mb-0.5">{s.label}</p>
              <p className="text-sm font-semibold text-foreground/80">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Mini trade list */}
        <div className="space-y-2">
          {[
            { market: 'NAS100', pnl: '+$1,240', win: true },
            { market: 'XAUUSD', pnl: '+$890', win: true },
            { market: 'EURUSD', pnl: '-$380', win: false },
          ].map((t) => (
            <div
              key={t.market}
              className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2"
            >
              <span className="text-xs text-white/50 font-medium">{t.market}</span>
              <span className={`text-xs font-semibold ${t.win ? 'text-emerald-400' : 'text-rose-400'}`}>
                {t.pnl}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Decorative glow behind card */}
      <div
        className="absolute -inset-4 -z-10 rounded-3xl blur-2xl opacity-20"
        style={{ background: 'radial-gradient(ellipse, var(--tc-primary), transparent 70%)' }}
      />
    </div>
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
            trade with an edge.
          </h2>

          <p
            className="scroll-reveal mt-5 text-base text-white/40 leading-relaxed max-w-md mx-auto"
            style={{ '--reveal-delay': '200ms' } as React.CSSProperties}
          >
            Deep analytics, risk management, and journaling tools designed for
            serious traders who study every session.
          </p>
        </div>

        {/* ── 3-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 lg:gap-8 items-center">
          {/* Left column */}
          <div className="space-y-5 order-2 lg:order-1">
            {FEATURES_LEFT.map((f, i) => (
              <FeatureCard
                key={f.title}
                icon={f.icon}
                title={f.title}
                description={f.description}
                direction="left"
                delayMs={300 + i * 150}
              />
            ))}
          </div>

          {/* Center visual */}
          <div
            ref={calendarRef}
            className="flex justify-center order-1 lg:order-2 mb-6 lg:mb-0"
          >
            <motion.div
              className="scroll-reveal"
              style={{ y: calendarY, '--reveal-delay': '200ms' } as React.CSSProperties & { y: typeof calendarY }}
            >
              <CenterVisual />
            </motion.div>
          </div>

          {/* Right column */}
          <div className="space-y-5 order-3">
            {FEATURES_RIGHT.map((f, i) => (
              <FeatureCard
                key={f.title}
                icon={f.icon}
                title={f.title}
                description={f.description}
                direction="right"
                delayMs={300 + i * 150}
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
