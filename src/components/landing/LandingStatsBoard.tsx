'use client';

import { useScrollReveal } from '@/hooks/useScrollReveal';
import { StrategyCard } from '@/components/dashboard/strategy/StrategyCard';
import type { Strategy } from '@/types/strategy';
import type { StrategyOverviewRow } from '@/lib/server/strategiesOverview';

/* ── Mock strategies ── */

const MOCK_STRATEGIES: Strategy[] = [
  {
    id: 'preview-1',
    user_id: 'preview',
    account_id: 'preview',
    name: 'Institutional Strategy',
    slug: 'institutional-strategy',
    created_at: '2025-01-01',
    updated_at: '2025-12-01',
    is_active: true,
    extra_cards: ['session_stats', 'setup_stats', 'mss_stats'],
    saved_setup_types: [],
    saved_liquidity_types: [],
    saved_tags: [],
  },
  {
    id: 'preview-2',
    user_id: 'preview',
    account_id: 'preview',
    name: 'Scalping Pro',
    slug: 'scalping-pro',
    created_at: '2025-01-01',
    updated_at: '2025-12-01',
    is_active: true,
    extra_cards: ['launch_hour', 'fvg_size'],
    saved_setup_types: [],
    saved_liquidity_types: [],
    saved_tags: [],
  },
  {
    id: 'preview-3',
    user_id: 'preview',
    account_id: 'preview',
    name: 'NAS100',
    slug: 'nas100',
    created_at: '2025-01-01',
    updated_at: '2025-12-01',
    is_active: true,
    extra_cards: ['trend_stats', 'potential_rr', 'sl_size_stats', 'evaluation_stats'],
    saved_setup_types: [],
    saved_liquidity_types: [],
    saved_tags: [],
  },
];

const MOCK_OVERVIEW: Record<string, StrategyOverviewRow> = {
  'preview-1': {
    totalTrades: 142,
    winRate: 68,
    avgRR: 1.8,
    totalRR: 24.5,
    totalProfit: 4820.5,
    equityCurve: [
      { d: '2025-01-15', p: 120 },
      { d: '2025-02-10', p: 380 },
      { d: '2025-03-05', p: 290 },
      { d: '2025-04-12', p: 820 },
      { d: '2025-05-08', p: 680 },
      { d: '2025-06-20', p: 1450 },
      { d: '2025-07-14', p: 1920 },
      { d: '2025-08-03', p: 1780 },
      { d: '2025-09-18', p: 2600 },
      { d: '2025-10-10', p: 3400 },
      { d: '2025-11-05', p: 3200 },
      { d: '2025-12-01', p: 4200 },
      { d: '2025-12-20', p: 4820 },
    ],
  },
  'preview-2': {
    totalTrades: 284,
    winRate: 52,
    avgRR: 0.65,
    totalRR: 5.2,
    totalProfit: 380,
    equityCurve: [
      { d: '2025-01-15', p: 60 },
      { d: '2025-02-10', p: 220 },
      { d: '2025-03-05', p: -40 },
      { d: '2025-04-12', p: 310 },
      { d: '2025-05-08', p: 80 },
      { d: '2025-06-20', p: 260 },
      { d: '2025-07-14', p: 140 },
      { d: '2025-08-03', p: 420 },
      { d: '2025-09-18', p: -20 },
      { d: '2025-10-10', p: 480 },
      { d: '2025-11-05', p: 190 },
      { d: '2025-12-01', p: 340 },
      { d: '2025-12-20', p: 380 },
    ],
  },
  'preview-3': {
    totalTrades: 67,
    winRate: 75,
    avgRR: 2.4,
    totalRR: 38.2,
    totalProfit: 11450,
    equityCurve: [
      { d: '2025-01-15', p: 400 },
      { d: '2025-02-10', p: 950 },
      { d: '2025-03-05', p: 1800 },
      { d: '2025-04-12', p: 2500 },
      { d: '2025-05-08', p: 3600 },
      { d: '2025-06-20', p: 4200 },
      { d: '2025-07-14', p: 5100 },
      { d: '2025-08-03', p: 6300 },
      { d: '2025-09-18', p: 7400 },
      { d: '2025-10-10', p: 8200 },
      { d: '2025-11-05', p: 9500 },
      { d: '2025-12-01', p: 10600 },
      { d: '2025-12-20', p: 11450 },
    ],
  },
};

const ACCOUNT_BALANCE = 40000;

/* ── No-op handlers ── */
const noop = () => {};
const noopAsync = async () => {};

/* ── Component ── */

export function LandingStatsBoard() {
  const sectionRef = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={sectionRef}
      id="stats-board"
      className="relative scroll-mt-20"
    >
      {/* Theme orbs — same as the global layout orbs, scoped to this section */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-[20%] left-1/4 w-[500px] h-[500px] orb-bg-1 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] orb-bg-2 rounded-full blur-3xl" />
      </div>

      {/* Top gradient blend — sits above orbs for seamless hero transition */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 right-0 h-48 z-[1]"
        style={{
          background:
            'linear-gradient(to bottom, #0d0a12 0%, #0d0a12 20%, transparent 100%)',
        }}
      />

      {/* Bottom gradient blend — seamless transition to next section */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 z-[1]"
        style={{
          background:
            'linear-gradient(to top, #0d0a12 0%, transparent 100%)',
        }}
      />

      <div className="relative z-[2] mx-auto max-w-6xl px-4 py-24 sm:py-32">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none px-4 py-1.5 backdrop-blur-sm mb-6">
            <span
              className="h-1.5 w-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: 'var(--tc-accent)' }}
            />
            <span className="text-sm text-muted-foreground">Stats Board</span>
          </div>

          <h2
            className="text-3xl sm:text-4xl lg:text-[42px] font-medium leading-[1.12] tracking-[-0.03em] bg-clip-text text-transparent"
            style={{
              backgroundImage:
                'linear-gradient(to bottom, var(--foreground) 40%, var(--tc-accent))',
            }}
          >
            See your strategies
            <br />
            at a glance.
          </h2>

          <p className="mt-5 text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
            Each strategy card tracks your win rate, risk-reward, equity curve,
            and P&amp;L in real time. Know exactly where you stand.
          </p>
        </div>

        {/* Real StrategyCard previews */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 landing-preview-cards"
          onClickCapture={(e) => { e.stopPropagation(); e.preventDefault(); }}
        >
          {MOCK_STRATEGIES.map((strategy, i) => (
            <div
              key={strategy.id}
              className="scroll-reveal [&>div]:h-full [&_[class*=Card]]:h-full"
              style={{ '--reveal-delay': `${200 + i * 200}ms` } as React.CSSProperties}
            >
              <StrategyCard
                strategy={strategy}
                overviewStats={MOCK_OVERVIEW[strategy.id]}
                accountId="preview"
                mode="live"
                userId="preview"
                currencySymbol="$"
                onEdit={noop}
                onDelete={noopAsync}
                isLoading={false}
                accountBalance={ACCOUNT_BALANCE}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
