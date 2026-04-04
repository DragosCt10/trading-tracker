'use client';

import { useRef, useEffect, useState, forwardRef } from 'react';
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
import Logo from '@/components/shared/Logo';

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

/* ── Neural connections SVG ── */

interface ConnPoint {
  x1: number; y1: number; // brain center
  x2: number; y2: number; // near-card end (shortened)
  id: number;
}

function NeuralConnections({
  containerRef,
  brainRef,
  leftCardRefs,
  rightCardRefs,
  statsRefs,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  brainRef: React.RefObject<HTMLDivElement | null>;
  leftCardRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  rightCardRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  statsRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}) {
  const [connections, setConnections] = useState<ConnPoint[]>([]);
  const isInView = useInView(containerRef, { once: false, amount: 0.2 });

  useEffect(() => {
    const measure = () => {
      if (!containerRef.current || !brainRef.current) return;
      const cont = containerRef.current.getBoundingClientRect();
      const brain = brainRef.current.getBoundingClientRect();
      if (brain.width === 0) return; // hidden on mobile

      const bx = brain.left + brain.width / 2 - cont.left;
      const by = brain.top + brain.height / 2 - cont.top;
      const GAP = 28; // px to stop before card edge

      const makeConn = (tx: number, ty: number, id: number, lengthFactor = 1): ConnPoint | null => {
        const dx = tx - bx;
        const dy = ty - by;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < GAP) return null;
        const factor = ((len - GAP) / len) * lengthFactor;
        return { x1: bx, y1: by, x2: bx + dx * factor, y2: by + dy * factor, id };
      };

      const pts: ConnPoint[] = [];
      let id = 0;

      // Left cards → target right-edge center of each card (bottom card = id 2, cut to half)
      for (let i = 0; i < leftCardRefs.current.length; i++) {
        const el = leftCardRefs.current[i];
        if (el && el.getBoundingClientRect().width > 0) {
          const r = el.getBoundingClientRect();
          const c = makeConn(r.right - cont.left, r.top + r.height / 2 - cont.top, id, i === 2 ? 0.5 : 1);
          if (c) pts.push(c);
        }
        id++;
      }

      // Right cards → target left-edge center of each card (bottom card = id 5, cut to half)
      for (let i = 0; i < rightCardRefs.current.length; i++) {
        const el = rightCardRefs.current[i];
        if (el && el.getBoundingClientRect().width > 0) {
          const r = el.getBoundingClientRect();
          const c = makeConn(r.left - cont.left, r.top + r.height / 2 - cont.top, id, i === 2 ? 0.5 : 1);
          if (c) pts.push(c);
        }
        id++;
      }

      // Stats cards → target top-center (outer 2 cut to half, inner 2 full)
      for (let i = 0; i < statsRefs.current.length; i++) {
        const el = statsRefs.current[i];
        if (el && el.getBoundingClientRect().width > 0) {
          const r = el.getBoundingClientRect();
          const isOuter = i === 0 || i === statsRefs.current.length - 1;
          const c = makeConn(r.left + r.width / 2 - cont.left, r.top - cont.top, id, isOuter ? 0.5 : 1);
          if (c) pts.push(c);
        }
        id++;
      }

      setConnections(pts);
    };

    const t = setTimeout(measure, 400);
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', measure);
    return () => { clearTimeout(t); ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [containerRef, brainRef, leftCardRefs, rightCardRefs, statsRefs]);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }} aria-hidden>
      <svg className="w-full h-full">
        <defs>
          {connections.map((conn) => (
            <linearGradient
              key={`grad-def-${conn.id}`}
              id={`lf-grad-${conn.id}`}
              gradientUnits="userSpaceOnUse"
              x1={conn.x1} y1={conn.y1}
              x2={conn.x2} y2={conn.y2}
            >
              <stop offset="0%" stopColor="var(--tc-primary)" stopOpacity="0.35" />
              <stop offset="55%" stopColor="var(--tc-primary)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--tc-primary)" stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {connections.map((conn) => (
          <motion.path
            key={`line-${conn.id}`}
            d={`M ${conn.x1} ${conn.y1} L ${conn.x2} ${conn.y2}`}
            stroke={`url(#lf-grad-${conn.id})`}
            strokeWidth="1"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={isInView ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
            transition={{
              duration: 1.4,
              delay: 0.6 + (conn.id % 10) * 0.1,
              ease: 'easeOut',
            }}
          />
        ))}
      </svg>
    </div>
  );
}

/* ── Brain hub: Logo + orbital rings + glow ── */

function BrainHub() {
  const hubRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(hubRef, { once: false, amount: 0.4 });

  return (
    <motion.div
      ref={hubRef}
      className="relative flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.55 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.75, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Outermost slow pulse */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 180, height: 180,
          background: 'radial-gradient(circle, color-mix(in oklch, var(--tc-primary) 16%, transparent) 0%, transparent 70%)',
        }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.75, 0.4] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Secondary pulse (offset phase) */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 130, height: 130,
          background: 'radial-gradient(circle, color-mix(in oklch, var(--tc-accent) 12%, transparent) 0%, transparent 70%)',
        }}
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
      />

      {/* Orbital ring 1 — spins clockwise */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 108, height: 108,
          border: '1px solid color-mix(in oklch, var(--tc-primary) 38%, transparent)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
      >
        <span
          className="absolute rounded-full"
          style={{
            width: 7, height: 7,
            background: 'var(--tc-primary)',
            boxShadow: '0 0 10px 3px var(--tc-primary)',
            top: -3.5, left: 'calc(50% - 3.5px)',
          }}
        />
        <span
          className="absolute rounded-full"
          style={{
            width: 4, height: 4,
            background: 'color-mix(in oklch, var(--tc-primary) 60%, white)',
            boxShadow: '0 0 6px 1px var(--tc-primary)',
            bottom: -2, left: 'calc(50% - 2px)',
          }}
        />
      </motion.div>

      {/* Orbital ring 2 — counter-spins, tilted in 3D */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 132, height: 132,
          border: '1px solid color-mix(in oklch, var(--tc-accent) 28%, transparent)',
          rotateX: 58,
          transformPerspective: 300,
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
      >
        <span
          className="absolute rounded-full"
          style={{
            width: 5, height: 5,
            background: 'var(--tc-accent)',
            boxShadow: '0 0 7px 2px var(--tc-accent)',
            top: -2.5, left: 'calc(50% - 2.5px)',
          }}
        />
      </motion.div>

      {/* Orbital ring 3 — slow, large, barely visible */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 152, height: 152,
          border: '0.5px solid color-mix(in oklch, var(--tc-primary) 15%, transparent)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
      >
        <span
          className="absolute rounded-full"
          style={{
            width: 4, height: 4,
            background: 'color-mix(in oklch, var(--tc-primary) 80%, white)',
            boxShadow: '0 0 6px 1px var(--tc-primary)',
            right: -2, top: 'calc(50% - 2px)',
          }}
        />
      </motion.div>

      {/* Logo brain center */}
      <motion.div
        className="relative z-10 flex items-center justify-center rounded-full"
        style={{
          width: 74, height: 74,
          background:
            'radial-gradient(ellipse at 45% 45%, color-mix(in oklch, var(--tc-primary) 55%, oklch(0.28 0 0)) 0%, color-mix(in oklch, var(--tc-primary) 22%, oklch(0.1 0 0)) 55%, oklch(0.06 0 0) 100%)',
          border: '1.5px solid color-mix(in oklch, var(--tc-primary) 55%, transparent)',
          boxShadow: [
            '0 0 0 8px color-mix(in oklch, var(--tc-primary) 8%, transparent)',
            '0 0 36px color-mix(in oklch, var(--tc-primary) 24%, transparent)',
            'inset 0 1px 0 color-mix(in oklch, var(--tc-primary) 30%, transparent)',
          ].join(', '),
        }}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Logo width={42} height={42} />
      </motion.div>
    </motion.div>
  );
}

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
            <div className="flex flex-col gap-5 relative z-10">
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
            <div className="flex flex-col gap-5 relative z-10">
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
          <div className="mt-20 grid grid-cols-4 gap-4 relative z-10">
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
