'use client';

import { useState, useCallback } from 'react';
import { SectionBadge, SectionHeading } from '@/components/landing/shared';
import { Radio, FlaskConical, History, ChevronDown, Pencil, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { RotatingText } from '@/components/ui/rotating-text';

/* ── Mode configuration ── */

const MODES = [
  {
    label: 'Live',
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.10)',
    border: 'rgba(34, 197, 94, 0.22)',
    badgeClass: 'themed-badge-live',
    icon: Radio,
    description:
      'Track real capital trades with full performance analytics and risk metrics.',
    account: 'FTMO Challenge',
  },
  {
    label: 'Demo',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.10)',
    border: 'rgba(245, 158, 11, 0.22)',
    badgeClass: 'themed-badge-demo',
    icon: FlaskConical,
    description:
      'Paper trade new strategies risk-free while building your statistical edge.',
    account: 'Paper Trading',
  },
  {
    label: 'Backtesting',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.10)',
    border: 'rgba(59, 130, 246, 0.22)',
    badgeClass: 'themed-badge-backtesting',
    icon: History,
    description:
      'Log historical setups to validate your strategy before going live.',
    account: 'NQ Historical',
  },
] as const;

const MODE_WORDS = MODES.map((m) => m.label);

/* ── Per-mode card data ── */

const MODE_CARD_DATA = [
  {
    balance: '$50,000',
    balanceCents: '.00',
    today: '+$1,750.00',
    todayPositive: true,
    trades: [
      { symbol: 'NQ', name: 'NAS100', direction: 'Long', rr: '2.5', pnl: '+$1,240', win: true },
      { symbol: 'EU', name: 'EURUSD', direction: 'Short', rr: '1.8', pnl: '-$380', win: false },
      { symbol: 'GC', name: 'XAUUSD', direction: 'Long', rr: '3.1', pnl: '+$890', win: true },
    ],
    winRate: '68%',
    avgRR: '1.8',
    pnl: '+$4,820',
    pnlPositive: true,
  },
  {
    balance: '$10,000',
    balanceCents: '.00',
    today: '+$320.50',
    todayPositive: true,
    trades: [
      { symbol: 'ES', name: 'SP500', direction: 'Long', rr: '1.5', pnl: '+$220', win: true },
      { symbol: 'BTC', name: 'BTCUSD', direction: 'Short', rr: '2.0', pnl: '-$150', win: false },
      { symbol: 'NQ', name: 'NAS100', direction: 'Long', rr: '2.8', pnl: '+$250', win: true },
    ],
    winRate: '55%',
    avgRR: '1.4',
    pnl: '+$1,280',
    pnlPositive: true,
  },
  {
    balance: '$100,000',
    balanceCents: '.00',
    today: '-$430.00',
    todayPositive: false,
    trades: [
      { symbol: 'CL', name: 'CRUDE', direction: 'Short', rr: '3.2', pnl: '+$2,100', win: true },
      { symbol: 'GC', name: 'XAUUSD', direction: 'Long', rr: '1.2', pnl: '-$680', win: false },
      { symbol: 'EU', name: 'EURUSD', direction: 'Long', rr: '2.6', pnl: '+$1,450', win: true },
    ],
    winRate: '72%',
    avgRR: '2.4',
    pnl: '+$12,340',
    pnlPositive: true,
  },
] as const;

const blurTransition = { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] } as const;

export function LandingModes() {
  const sectionRef = useScrollReveal<HTMLElement>();
  const [activeIndex, setActiveIndex] = useState(0);

  const handleNext = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const mode = MODES[activeIndex];

  return (
    <section ref={sectionRef} id="modes" className="relative scroll-mt-20">
      {/* Top gradient blend */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 right-0 h-32"
        style={{
          background:
            'linear-gradient(to bottom, #0d0a12 0%, transparent 100%)',
        }}
      />

      {/* Theme orbs — mirrored right-to-left diagonal */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-[20%] right-1/4 w-[500px] h-[500px] orb-bg-1 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] orb-bg-2 rounded-full blur-3xl" />
      </div>

      <div className="relative z-[2] mx-auto max-w-6xl px-4 py-24 sm:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* ── Left: Text column ── */}
          <div>
            {/* Badge */}
            <SectionBadge label="Account Modes" />

            {/* Heading */}
            <SectionHeading>
              Ready to Track
              <br />
              Every Move.
            </SectionHeading>

            {/* Description */}
            <p
              className="scroll-reveal mt-5 text-base text-muted-foreground leading-relaxed max-w-md"
              style={{ '--reveal-delay': '200ms' } as React.CSSProperties}
            >
              Organize your trades across dedicated environments.
              Instantly know whether a trade was executed live, practiced in
              demo, or validated through backtesting.
            </p>

            {/* Mode feature items */}
            <div className="mt-8 space-y-1">
              {MODES.map((m, i) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.label}
                    className="scroll-reveal flex items-start gap-4 rounded-xl px-3 py-3 transition-colors duration-500"
                    style={
                      {
                        '--reveal-delay': `${350 + i * 120}ms`,
                        backgroundColor:
                          activeIndex === i ? `${m.color}06` : 'transparent',
                      } as React.CSSProperties
                    }
                  >
                    <div
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-500"
                      style={{
                        backgroundColor: m.bg,
                        border: `1px solid ${m.border}`,
                      }}
                    >
                      <Icon className="h-4 w-4" style={{ color: m.color }} />
                    </div>
                    <div>
                      <span
                        className="text-sm font-semibold transition-colors duration-500"
                        style={{
                          color:
                            activeIndex === i
                              ? m.color
                              : 'rgba(255,255,255,0.85)',
                        }}
                      >
                        {m.label}
                      </span>
                      <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
                        {m.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right: Visual card ── */}
          <div
            className="scroll-reveal relative"
            style={{ '--reveal-delay': '200ms' } as React.CSSProperties}
          >
            {/* Mock ActionBar — separate card above, centered */}
            <div className="relative mb-6 flex justify-center">
              <div className="inline-flex rounded-2xl border border-slate-700/50 bg-slate-800/30 px-3 py-2 backdrop-blur-sm shadow-md">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Mode badge — colored per mode (green/amber/blue) */}
                  <div
                    className="flex items-center justify-center h-8 w-[100px] rounded-xl border px-2 shrink-0 text-xs sm:text-sm font-medium transition-all duration-500"
                    style={{
                      backgroundColor: mode.bg,
                      borderColor: mode.border,
                      color: mode.color,
                    }}
                  >
                    <RotatingText
                      words={MODE_WORDS as unknown as string[]}
                      interval={3000}
                      mode="blur"
                      className="leading-none"
                      onNext={handleNext}
                    />
                  </div>

                  {/* Account selector — fixed width, animated text */}
                  <button
                    type="button"
                    className="group flex items-center justify-between h-8 w-[160px] overflow-hidden rounded-xl border border-slate-700/80 bg-transparent text-slate-200 px-3 text-xs sm:text-sm font-medium transition-colors duration-200 cursor-default"
                  >
                    <span className="relative flex-1 overflow-hidden h-full flex items-center">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={mode.account}
                          className="font-medium truncate"
                          initial={{ opacity: 0, filter: 'blur(6px)' }}
                          animate={{ opacity: 1, filter: 'blur(0px)' }}
                          exit={{ opacity: 0, filter: 'blur(6px)' }}
                          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                        >
                          {mode.account}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0 ml-1.5" />
                  </button>

                  {/* Edit button */}
                  <button
                    type="button"
                    className="flex items-center gap-1.5 h-8 rounded-xl border border-slate-700/80 bg-slate-900/40 text-slate-200 px-2.5 text-xs font-medium cursor-default"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>

                  {/* Add button */}
                  <div className="flex items-center justify-center h-8 w-8 rounded-xl themed-btn-primary text-white font-semibold border-0 overflow-hidden relative">
                    <span className="relative z-10 flex items-center justify-center">
                      <Plus className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card */}
            <div className="relative rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6 backdrop-blur-sm shadow-md overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(6px)' }}
                  transition={blurTransition}
                >
                  {/* Balance row */}
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Balance
                      </p>
                      <p className="mt-1 text-2xl font-bold text-foreground tracking-tight">
                        {MODE_CARD_DATA[activeIndex].balance}
                        <span className="text-base text-muted-foreground">{MODE_CARD_DATA[activeIndex].balanceCents}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Today
                      </p>
                      <p className={`mt-1 text-sm font-semibold ${MODE_CARD_DATA[activeIndex].todayPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {MODE_CARD_DATA[activeIndex].today}
                      </p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="mt-5 h-px bg-border/30" />

                  {/* Trade list */}
                  <div className="mt-4 space-y-3">
                    {MODE_CARD_DATA[activeIndex].trades.map((trade) => (
                      <div
                        key={trade.symbol}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/30 text-xs font-bold text-muted-foreground">
                            {trade.symbol}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {trade.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {trade.direction} &middot; {trade.rr} RR
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-sm font-bold ${trade.win ? 'text-emerald-400' : 'text-rose-400'}`}
                        >
                          {trade.pnl}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Bottom stat bar */}
                  <div className="mt-5 flex items-center justify-between rounded-xl bg-muted/10 border border-border/20 px-4 py-3">
                    <div className="text-center">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                        Win Rate
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-foreground">{MODE_CARD_DATA[activeIndex].winRate}</p>
                    </div>
                    <div className="h-6 w-px bg-border/30" />
                    <div className="text-center">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                        Avg RR
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-foreground">{MODE_CARD_DATA[activeIndex].avgRR}</p>
                    </div>
                    <div className="h-6 w-px bg-border/30" />
                    <div className="text-center">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                        P&L
                      </p>
                      <p className={`mt-0.5 text-sm font-bold ${MODE_CARD_DATA[activeIndex].pnlPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {MODE_CARD_DATA[activeIndex].pnl}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient blend */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-32"
        style={{
          background:
            'linear-gradient(to top, #0d0a12 0%, transparent 100%)',
        }}
      />
    </section>
  );
}
