'use client';

import { useMemo } from 'react';
import { Shuffle, BarChart3, ToggleLeft, TrendingUp } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { MonteCarloChart } from '@/components/trades/MonteCarloChart';
import { runMonteCarloSimulation } from '@/utils/monteCarloSimulation';
import type { Trade } from '@/types/trade';

/* ── Mock trades for simulation (only fields used by runMonteCarloSimulation) ── */

const MOCK_TRADES = [
  { break_even: false, trade_outcome: 'Win', risk_reward_ratio: 2.5, calculated_profit: 580 },
  { break_even: false, trade_outcome: 'Lose', risk_reward_ratio: 0, calculated_profit: -260 },
  { break_even: false, trade_outcome: 'Win', risk_reward_ratio: 3.2, calculated_profit: 1100 },
  { break_even: false, trade_outcome: 'Win', risk_reward_ratio: 1.8, calculated_profit: 300 },
  { break_even: false, trade_outcome: 'Lose', risk_reward_ratio: 0, calculated_profit: -350 },
  { break_even: false, trade_outcome: 'Win', risk_reward_ratio: 2.1, calculated_profit: 420 },
  { break_even: true, trade_outcome: 'BE', risk_reward_ratio: 0, calculated_profit: 0 },
  { break_even: false, trade_outcome: 'Win', risk_reward_ratio: 1.5, calculated_profit: 190 },
  { break_even: false, trade_outcome: 'Lose', risk_reward_ratio: 0, calculated_profit: -180 },
  { break_even: false, trade_outcome: 'Win', risk_reward_ratio: 2.8, calculated_profit: 750 },
  { break_even: false, trade_outcome: 'Win', risk_reward_ratio: 1.2, calculated_profit: 150 },
  { break_even: false, trade_outcome: 'Lose', risk_reward_ratio: 0, calculated_profit: -300 },
  { break_even: false, trade_outcome: 'Win', risk_reward_ratio: 3.5, calculated_profit: 900 },
  { break_even: false, trade_outcome: 'Lose', risk_reward_ratio: 0, calculated_profit: -220 },
  { break_even: false, trade_outcome: 'Win', risk_reward_ratio: 2.0, calculated_profit: 380 },
  { break_even: true, trade_outcome: 'BE', risk_reward_ratio: 0, calculated_profit: 0 },
  { break_even: false, trade_outcome: 'Win', risk_reward_ratio: 1.6, calculated_profit: 250 },
  { break_even: false, trade_outcome: 'Lose', risk_reward_ratio: 0, calculated_profit: -280 },
  { break_even: false, trade_outcome: 'Win', risk_reward_ratio: 2.3, calculated_profit: 500 },
  { break_even: false, trade_outcome: 'Win', risk_reward_ratio: 1.9, calculated_profit: 340 },
  { break_even: false, trade_outcome: 'Lose', risk_reward_ratio: 0, calculated_profit: -190 },
  { break_even: false, trade_outcome: 'Win', risk_reward_ratio: 2.7, calculated_profit: 680 },
  { break_even: true, trade_outcome: 'BE', risk_reward_ratio: 0, calculated_profit: 0 },
  { break_even: false, trade_outcome: 'Win', risk_reward_ratio: 1.4, calculated_profit: 170 },
  { break_even: false, trade_outcome: 'Lose', risk_reward_ratio: 0, calculated_profit: -310 },
  { break_even: false, trade_outcome: 'Win', risk_reward_ratio: 3.0, calculated_profit: 820 },
  { break_even: false, trade_outcome: 'Lose', risk_reward_ratio: 0, calculated_profit: -150 },
  { break_even: false, trade_outcome: 'Win', risk_reward_ratio: 2.4, calculated_profit: 540 },
  { break_even: false, trade_outcome: 'Win', risk_reward_ratio: 1.7, calculated_profit: 280 },
  { break_even: false, trade_outcome: 'Lose', risk_reward_ratio: 0, calculated_profit: -240 },
] as unknown as Trade[];

/* ── Feature pills ── */

const FEATURE_PILLS = [
  {
    icon: Shuffle,
    title: '500 Simulated Paths',
    description: 'Your past trades, reshuffled into hundreds of possible futures.',
  },
  {
    icon: BarChart3,
    title: 'Probability Bands',
    description: 'Visualise the full range of outcomes — from best to worst case.',
  },
  {
    icon: ToggleLeft,
    title: 'Dual Perspectives',
    description: 'Switch between risk-unit and dollar views in one tap.',
  },
  {
    icon: TrendingUp,
    title: 'Up to 1,000 Trades Ahead',
    description: 'Project your edge forward and see how far it can take you.',
  },
];

/* ── Tooltip walkthrough steps ── */

const TOOLTIP_STEPS = [
  {
    left: '12%',
    label: 'Trade #5',
    color: 'var(--tc-primary, #8b5cf6)',
    title: 'Upside potential',
    desc: 'Purple zone — your most favourable projected outcomes.',
  },
  {
    left: '42%',
    label: 'Trade #20',
    color: 'var(--tc-primary, #8b5cf6)',
    title: 'Expected path',
    desc: 'The median line — the most likely trajectory for your equity.',
  },
  {
    left: '78%',
    label: 'Trade #40',
    color: '#f43f5e',
    title: 'Downside range',
    desc: 'Red zone — preparing you for less favourable stretches.',
  },
];

/* ── Legend helpers ── */

function LegendDot({ color, label, opacity = 1 }: { color: string; label: string; opacity?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="block w-2.5 h-2.5 rounded-sm flex-shrink-0"
        style={{ background: color, opacity }}
      />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

/* ── Main component ── */

export function LandingFutureEquity() {
  const sectionRef = useScrollReveal<HTMLElement>();

  const simulationData = useMemo(
    () => runMonteCarloSimulation(MOCK_TRADES, 500, 50),
    [],
  );

  return (
    <section ref={sectionRef} id="future-equity" className="relative scroll-mt-20">
      {/* Tooltip walkthrough keyframes */}
      <style>{`
        @keyframes mc-cursor-walk {
          0%, 8%    { left: 12%; opacity: 0; }
          12%, 28%  { left: 12%; opacity: 1; }
          32%, 34%  { opacity: 0; }
          38%, 58%  { left: 42%; opacity: 1; }
          62%, 64%  { opacity: 0; }
          68%, 88%  { left: 78%; opacity: 1; }
          92%, 100% { left: 78%; opacity: 0; }
        }
        @keyframes mc-tip-1 {
          0%, 8%    { opacity: 0; transform: translateX(-50%) translateY(4px); }
          12%, 28%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          32%, 100% { opacity: 0; transform: translateX(-50%) translateY(4px); }
        }
        @keyframes mc-tip-2 {
          0%, 34%   { opacity: 0; transform: translateX(-50%) translateY(4px); }
          38%, 58%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          62%, 100% { opacity: 0; transform: translateX(-50%) translateY(4px); }
        }
        @keyframes mc-tip-3 {
          0%, 64%   { opacity: 0; transform: translateX(-50%) translateY(4px); }
          68%, 88%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          92%, 100% { opacity: 0; transform: translateX(-50%) translateY(4px); }
        }
      `}</style>

      {/* ── Background: theme-aware radial glow + grid ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {/* Radial glow — uses CSS variables so it adapts to theme */}
        <div
          className="absolute inset-0 -z-30"
          style={{
            backgroundImage: [
              'radial-gradient(60% 40% at 50% 55%, color-mix(in oklch, var(--tc-primary) 18%, transparent) 0%, color-mix(in oklch, var(--tc-accent) 12%, transparent) 30%, color-mix(in oklch, var(--tc-primary) 6%, transparent) 50%, transparent 70%)',
              'radial-gradient(50% 35% at 20% 10%, color-mix(in oklch, var(--tc-primary) 14%, transparent) 0%, color-mix(in oklch, var(--tc-primary) 6%, transparent) 40%, transparent 70%)',
              'radial-gradient(40% 30% at 80% 25%, color-mix(in oklch, var(--tc-accent) 10%, transparent) 0%, transparent 60%)',
            ].join(','),
          }}
        />

        {/* Soft vignette — edges only */}
        <div
          className="absolute inset-0 -z-20 bg-[radial-gradient(140%_120%_at_50%_0%,transparent_65%,#ffffff_100%)] dark:bg-[radial-gradient(140%_120%_at_50%_0%,transparent_65%,#0d0a12_100%)]"
        />

        {/* Grid overlay: vertical lines + curved horizontal arcs */}
        <div
          className="absolute inset-0 -z-10 mix-blend-screen opacity-5 dark:opacity-10"
          style={{
            backgroundImage: [
              'repeating-linear-gradient(90deg, rgba(255,255,255,0.09) 0 1px, transparent 1px 96px)',
              'repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 24px)',
              'repeating-radial-gradient(80% 55% at 50% 52%, rgba(255,255,255,0.06) 0 1px, transparent 1px 120px)',
            ].join(','),
            backgroundBlendMode: 'screen',
          }}
        />

        {/* Top gradient blend — matches actual landing page bg */}
        <div
          className="absolute top-0 left-0 right-0 h-56 z-[1] bg-gradient-to-b from-white to-transparent dark:from-[#0d0a12] dark:to-transparent"
        />
      </div>

      {/* ── Content ── */}
      <div className="relative z-[2] mx-auto max-w-6xl px-4 py-24 sm:py-32">
        {/* Badge */}
        <div
          className="scroll-reveal inline-flex items-center gap-2 rounded-full border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none px-4 py-1.5 backdrop-blur-sm mb-6"
          style={{ '--reveal-delay': '0ms' } as React.CSSProperties}
        >
          <span
            className="h-1.5 w-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: 'var(--tc-accent)' }}
          />
          <span className="text-sm text-muted-foreground">Future Equity</span>
        </div>

        {/* Heading */}
        <h2
          className="scroll-reveal text-3xl sm:text-4xl lg:text-[42px] font-medium leading-[1.12] tracking-[-0.03em] bg-clip-text text-transparent max-w-2xl"
          style={{
            backgroundImage: 'linear-gradient(to bottom, var(--foreground) 40%, var(--tc-accent))',
            '--reveal-delay': '100ms',
          } as React.CSSProperties}
        >
          See Where Your
          <br />
          Edge Takes You.
        </h2>

        {/* Description */}
        <p
          className="scroll-reveal mt-5 text-base text-muted-foreground leading-relaxed max-w-lg"
          style={{ '--reveal-delay': '200ms' } as React.CSSProperties}
        >
          Your past trades, reshuffled into hundreds of possible futures.
          See where your edge could take you — and how to prepare for every path.
        </p>

        {/* ── Perspective card preview + floating tooltips ── */}
        <div
          className="scroll-reveal relative mt-14"
          style={{ '--reveal-delay': '300ms' } as React.CSSProperties}
        >
          {/* Perspective-transformed card */}
          <div style={{ perspective: '1000px', perspectiveOrigin: '50% 100%' }}>
            <div style={{ transform: 'rotateX(6deg)', transformOrigin: 'center bottom' }}>
              <div className="relative w-full rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm overflow-hidden">
                {/* Card header */}
                <div className="px-5 sm:px-6 pt-5 pb-2">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-col gap-1">
                      <p className="text-lg font-semibold text-foreground">
                        Future Equity
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Based on 30 trades · 50 future trades projected
                      </p>
                    </div>

                    <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
                      <div className="flex items-center rounded-xl border border-slate-300/40 dark:border-slate-700/50 overflow-hidden h-8 text-xs bg-slate-100/50 dark:bg-slate-800/40">
                        <span className="px-3 h-full flex items-center font-semibold bg-slate-200 dark:bg-slate-700 text-foreground shadow-sm">
                          R
                        </span>
                        <span className="px-3 h-full flex items-center font-semibold text-muted-foreground">
                          $
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                          Future trades:
                        </span>
                        <span className="text-xs font-medium text-foreground px-2.5 py-1 rounded-xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-100/50 dark:bg-slate-800/30">
                          50
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chart area */}
                <div className="px-5 sm:px-6 pt-2 pb-2">
                  <div className="h-72">
                    <MonteCarloChart
                      data={simulationData}
                      mode="r"
                      currencySymbol="$"
                    />
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-5 sm:px-6 pb-5">
                  <LegendDot color="var(--tc-primary, #8b5cf6)" label="75th–90th" />
                  <LegendDot color="var(--tc-primary, #8b5cf6)" label="50th–75th" opacity={0.5} />
                  <div className="flex items-center gap-1.5">
                    <span
                      className="block w-6 h-0.5 rounded-full"
                      style={{ background: 'var(--tc-primary, #8b5cf6)' }}
                    />
                    <span className="text-xs text-muted-foreground">Median</span>
                  </div>
                  <LegendDot color="#f43f5e" label="25th–50th" opacity={0.5} />
                  <LegendDot color="#f43f5e" label="10th–25th" />
                </div>
              </div>
            </div>
          </div>

          {/* Floating tooltips — OUTSIDE perspective, hidden on mobile */}
          <div
            className="pointer-events-none absolute hidden md:block"
            style={{ top: '18%', bottom: '22%', left: '6%', right: '6%' }}
          >
            {/* Cursor line */}
            <div
              className="absolute top-0 bottom-0 w-px"
              style={{
                background: 'linear-gradient(to bottom, transparent, color-mix(in oklch, var(--foreground) 40%, transparent), transparent)',
                animation: 'mc-cursor-walk 12s ease-in-out infinite',
              }}
            />

            {/* Tooltip bubbles — matches MonteCarloChart tooltip styling */}
            {TOOLTIP_STEPS.map((step, i) => (
              <div
                key={i}
                className="absolute top-0"
                style={{
                  left: step.left,
                  animation: `mc-tip-${i + 1} 12s ease-in-out infinite`,
                  opacity: 0,
                }}
              >
                <div className="relative -translate-x-1/2 mt-2 overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 p-4 w-48">
                  <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-2xl" />
                  <div className="relative flex flex-col gap-2">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">{step.label}</p>
                    <div className="flex items-center justify-between gap-6">
                      <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span
                          className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: step.color }}
                        />
                        {step.title}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Feature pills ── */}
        <div className="relative mt-14 grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-8 lg:grid-cols-4">
          {FEATURE_PILLS.map((pill, i) => {
            const Icon = pill.icon;
            return (
              <div
                key={pill.title}
                className="scroll-reveal space-y-3"
                style={{ '--reveal-delay': `${500 + i * 100}ms` } as React.CSSProperties}
              >
                <div className="flex items-center gap-2">
                  <Icon className="size-4" style={{ color: 'var(--tc-primary)' }} />
                  <h3 className="text-sm font-medium text-foreground">{pill.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{pill.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
