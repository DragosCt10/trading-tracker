'use client';

import { useState, useCallback } from 'react';
import { Radio, FlaskConical, History } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { RotatingText } from '@/components/ui/rotating-text';

/* ── Mode configuration ── */

const MODES = [
  {
    label: 'Live',
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.10)',
    border: 'rgba(34, 197, 94, 0.22)',
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
    icon: History,
    description:
      'Log historical setups to validate your strategy before going live.',
    account: 'NQ Historical',
  },
] as const;

const MODE_WORDS = MODES.map((m) => m.label);

/* ── Mock trades data ── */

const MOCK_TRADES = [
  { symbol: 'NQ', name: 'NAS100', direction: 'Long', rr: '2.5', pnl: '+$1,240', win: true },
  { symbol: 'EU', name: 'EURUSD', direction: 'Short', rr: '1.8', pnl: '-$380', win: false },
  { symbol: 'GC', name: 'XAUUSD', direction: 'Long', rr: '3.1', pnl: '+$890', win: true },
];

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

      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[20%] right-[10%] h-[500px] w-[600px]"
        style={{
          background:
            'radial-gradient(ellipse, color-mix(in oklch, var(--tc-primary) 6%, transparent) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      <div className="relative z-[2] mx-auto max-w-6xl px-4 py-24 sm:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* ── Left: Text column ── */}
          <div>
            {/* Badge */}
            <div
              className="scroll-reveal inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 backdrop-blur-sm mb-6"
              style={{ '--reveal-delay': '0ms' } as React.CSSProperties}
            >
              <span
                className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: 'var(--tc-accent)' }}
              />
              <span className="text-sm text-white/50">Account Modes</span>
            </div>

            {/* Heading */}
            <h2
              className="scroll-reveal text-3xl sm:text-4xl lg:text-[42px] font-medium leading-[1.12] tracking-[-0.03em] bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  'linear-gradient(to bottom, var(--foreground) 40%, var(--tc-accent))',
                '--reveal-delay': '100ms',
              } as React.CSSProperties}
            >
              Ready to Track
              <br />
              Every Move.
            </h2>

            {/* Description */}
            <p
              className="scroll-reveal mt-5 text-base text-white/40 leading-relaxed max-w-md"
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
                      <p className="mt-0.5 text-sm text-white/40 leading-relaxed">
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
            {/* Glow behind card — color follows active mode */}
            <div
              aria-hidden
              className="absolute -inset-6 rounded-3xl blur-3xl transition-colors duration-700"
              style={{
                backgroundColor: mode.color,
                opacity: 0.08,
              }}
            />

            {/* Card */}
            <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm">
              {/* Card header — rotating badge + account */}
              <div className="flex items-center justify-between">
                {/* Rotating mode badge */}
                <div
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 transition-all duration-700"
                  style={{
                    backgroundColor: mode.bg,
                    border: `1px solid ${mode.border}`,
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full transition-colors duration-700"
                    style={{
                      backgroundColor: mode.color,
                      boxShadow: `0 0 6px ${mode.color}`,
                    }}
                  />
                  <RotatingText
                    words={MODE_WORDS as unknown as string[]}
                    interval={3000}
                    mode="blur"
                    className="text-sm font-semibold"
                    onNext={handleNext}
                  />
                </div>

                {/* Account name */}
                <span
                  className="text-xs text-white/30 transition-all duration-500"
                  key={mode.account}
                >
                  {mode.account}
                </span>
              </div>

              {/* Balance row */}
              <div className="mt-5 flex items-end justify-between">
                <div>
                  <p className="text-xs text-white/30 uppercase tracking-wider">
                    Balance
                  </p>
                  <p className="mt-1 text-2xl font-bold text-white tracking-tight">
                    $50,000
                    <span className="text-base text-white/30">.00</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/30 uppercase tracking-wider">
                    Today
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-400">
                    +$1,750.00
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="mt-5 h-px bg-white/[0.06]" />

              {/* Trade list */}
              <div className="mt-4 space-y-3">
                {MOCK_TRADES.map((trade) => (
                  <div
                    key={trade.symbol}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05] text-xs font-bold text-white/50">
                        {trade.symbol}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {trade.name}
                        </p>
                        <p className="text-xs text-white/35">
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
              <div className="mt-5 flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.04] px-4 py-3">
                <div className="text-center">
                  <p className="text-[11px] text-white/30 uppercase tracking-wider">
                    Win Rate
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-white">68%</p>
                </div>
                <div className="h-6 w-px bg-white/[0.06]" />
                <div className="text-center">
                  <p className="text-[11px] text-white/30 uppercase tracking-wider">
                    Avg RR
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-white">1.8</p>
                </div>
                <div className="h-6 w-px bg-white/[0.06]" />
                <div className="text-center">
                  <p className="text-[11px] text-white/30 uppercase tracking-wider">
                    P&L
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-emerald-400">
                    +$4,820
                  </p>
                </div>
              </div>
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
