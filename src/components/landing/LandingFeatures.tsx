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

/* ── FeatureCard (with forwardRef for position measurement) ── */

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
        className="scroll-reveal relative rounded-xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm text-card-foreground p-6"
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
            <p className="text-sm text-white/40 leading-relaxed">{description}</p>
          </div>
        </div>
      </motion.div>
    );
  }
);

/* ── Signal dot that travels along a connection line ── */

function SignalDot({
  x1, y1, x2, y2, delay, duration = 2,
}: {
  x1: number; y1: number; x2: number; y2: number;
  delay: number; duration?: number;
}) {
  return (
    <motion.g
      initial={{ x: x1, y: y1, opacity: 0, scale: 0.4 }}
      animate={{
        x: [x1, x2, x2],
        y: [y1, y2, y2],
        opacity: [0, 1, 0],
        scale: [0.4, 1.3, 0.4],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        repeatDelay: 2.5,
        ease: 'easeInOut',
        times: [0, 0.65, 1],
      }}
    >
      {/* Outer glow */}
      <circle r="4" fill="var(--tc-primary)" opacity={0.3} />
      {/* Core dot */}
      <circle r="2.2" fill="var(--tc-primary)" />
      {/* White hot center */}
      <circle r="1" fill="white" opacity={0.85} />
    </motion.g>
  );
}

/* ── Neural connections SVG layer ── */

interface ConnPoint { x1: number; y1: number; x2: number; y2: number; id: number; }

function NeuralConnections({
  gridRef,
  brainRef,
  cardRefs,
}: {
  gridRef: React.RefObject<HTMLDivElement>;
  brainRef: React.RefObject<HTMLDivElement>;
  cardRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}) {
  const [connections, setConnections] = useState<ConnPoint[]>([]);
  const isInView = useInView(gridRef, { once: true, amount: 0.25 });

  useEffect(() => {
    const measure = () => {
      if (!gridRef.current || !brainRef.current) return;
      const cont = gridRef.current.getBoundingClientRect();
      const brain = brainRef.current.getBoundingClientRect();
      // Skip when brain column is hidden (display:none → width=0)
      if (brain.width === 0) return;
      const bx = brain.left + brain.width / 2 - cont.left;
      const by = brain.top + brain.height / 2 - cont.top;

      const pts = cardRefs.current
        .map((el, i) => {
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0) return null; // hidden element
          // Target: icon center — 24px padding + 20px (half of 40px icon)
          return {
            x1: bx, y1: by,
            x2: rect.left + 44 - cont.left,
            y2: rect.top + 44 - cont.top,
            id: i,
          };
        })
        .filter(Boolean) as ConnPoint[];

      setConnections(pts);
    };

    const t = setTimeout(measure, 350);
    const ro = new ResizeObserver(measure);
    if (gridRef.current) ro.observe(gridRef.current);
    window.addEventListener('resize', measure);
    return () => { clearTimeout(t); ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [gridRef, brainRef, cardRefs]);

  return (
    <div
      className="absolute inset-0 pointer-events-none hidden lg:block"
      style={{ zIndex: 1 }}
      aria-hidden
    >
      <svg className="w-full h-full overflow-visible">
        <defs>
          <filter id="lf-dot-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="lf-line-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Connection lines */}
        {connections.map((conn) => (
          <g key={`line-${conn.id}`}>
            {/* Dashed base line */}
            <motion.path
              d={`M ${conn.x1} ${conn.y1} L ${conn.x2} ${conn.y2}`}
              stroke="var(--tc-primary)"
              strokeWidth="0.8"
              strokeDasharray="3 9"
              fill="none"
              style={{ strokeOpacity: 0.18 }}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={isInView ? { pathLength: 1, opacity: 1 } : {}}
              transition={{ duration: 1.6, delay: 0.4 + conn.id * 0.13, ease: 'easeOut' }}
            />
            {/* Glow overlay */}
            <motion.path
              d={`M ${conn.x1} ${conn.y1} L ${conn.x2} ${conn.y2}`}
              stroke="var(--tc-accent)"
              strokeWidth="1.5"
              fill="none"
              filter="url(#lf-line-glow)"
              style={{ strokeOpacity: 0.06 }}
              initial={{ pathLength: 0 }}
              animate={isInView ? { pathLength: 1 } : {}}
              transition={{ duration: 1.6, delay: 0.5 + conn.id * 0.13 }}
            />
          </g>
        ))}

        {/* Traveling signal dots */}
        {isInView &&
          connections.map((conn) => (
            <g key={`dot-${conn.id}`} filter="url(#lf-dot-glow)">
              <SignalDot
                x1={conn.x1} y1={conn.y1}
                x2={conn.x2} y2={conn.y2}
                delay={1.5 + conn.id * 0.5}
                duration={1.9 + (conn.id % 3) * 0.25}
              />
            </g>
          ))}
      </svg>
    </div>
  );
}

/* ── Brain hub: Logo + orbital rings + glow ── */

function BrainHub() {
  return (
    <div className="relative flex items-center justify-center">
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
        {/* Node on ring */}
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
            'linear-gradient(145deg, color-mix(in oklch, var(--tc-primary) 22%, #100d1e) 0%, #100d1e 100%)',
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
    </div>
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
  const gridRef = useRef<HTMLDivElement>(null);
  const brainRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>(Array(6).fill(null));

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

        {/* ── Feature grid with neural brain ── */}
        <div ref={gridRef} className="relative">

          {/* SVG neural connections — lg+ only, behind cards */}
          <NeuralConnections
            gridRef={gridRef}
            brainRef={brainRef}
            cardRefs={cardRefs}
          />

          {/* Desktop (lg+): 3-col — [left cards | brain | right cards] */}
          <div className="hidden lg:grid lg:grid-cols-[1fr_220px_1fr] lg:gap-x-8 lg:gap-y-5">

            {/* Left cards column */}
            <div className="flex flex-col gap-5 relative z-10">
              {FEATURES_LEFT.map((f, i) => (
                <FeatureCard
                  key={f.title}
                  ref={(el) => { cardRefs.current[i] = el; }}
                  icon={f.icon}
                  title={f.title}
                  description={f.description}
                  delayMs={300 + i * 100}
                />
              ))}
            </div>

            {/* Brain center column */}
            <div
              ref={brainRef}
              className="flex items-center justify-center pointer-events-none"
              style={{ zIndex: 20 }}
            >
              <BrainHub />
            </div>

            {/* Right cards column */}
            <div className="flex flex-col gap-5 relative z-10">
              {FEATURES_RIGHT.map((f, i) => (
                <FeatureCard
                  key={f.title}
                  ref={(el) => { cardRefs.current[i + 3] = el; }}
                  icon={f.icon}
                  title={f.title}
                  description={f.description}
                  delayMs={300 + (i + 3) * 100}
                />
              ))}
            </div>
          </div>

          {/* Mobile / tablet (<lg): plain 2-col grid */}
          <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-5 relative z-10">
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
        </div>

        {/* ── Stats row ── */}
        <div className="relative z-10 mt-20 grid grid-cols-2 sm:grid-cols-4 gap-4">
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
