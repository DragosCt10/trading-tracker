'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { format, getDaysInMonth, parse } from 'date-fns';
import { Crown } from 'lucide-react';
import type { Trade } from '@/types/trade';
import { AiVisionPatternsSkeleton, AiVisionScoreCardsSkeleton, AiVisionMetricRowsSkeleton } from '@/components/dashboard/ai-vision/AiVisionSkeleton';
import { AiVisionLoadingOverlay } from '@/components/dashboard/ai-vision/AiVisionLoadingOverlay';
import { AiVisionScoreCard } from '@/components/dashboard/ai-vision/AiVisionScoreCard';
import { AiVisionMetricRow, type TrendPoint } from '@/components/dashboard/ai-vision/AiVisionMetricRow';
import {
  useAiVisionData,
  AI_VISION_ALL_PERIODS,
  PERIOD_PRESETS,
  type PeriodKey,
  type PeriodPreset,
} from '@/hooks/useAiVisionData';
import { calculatePeriodMetrics, type PeriodMetrics } from '@/utils/calculatePeriodMetrics';
import { calculateAiVisionScore } from '@/utils/calculateAiVisionScore';
import { detectTradingPatterns, detectMultiPeriodTrends, mergePatternsByPeriod, type DetectedPattern } from '@/utils/detectTradingPatterns';
import { AiVisionPatterns } from '@/components/dashboard/ai-vision/AiVisionPatterns';
import { SectionHeading } from '../sections/SectionHeading';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSubscription } from '@/hooks/useSubscription';
import type { ResolvedSubscription } from '@/types/subscription';
import { cn } from '@/lib/utils';

// Stable reference for metrics with no trend history — prevents new `[]` per
// render from breaking `React.memo` on AiVisionMetricRow. (Audit finding F18.)
const EMPTY_TREND: TrendPoint[] = [];

interface AiVisionClientProps {
  userId: string;
  strategyId: string | null;
  strategyName: string;
  mode: 'live' | 'backtesting' | 'demo';
  accountId: string | undefined;
  accountBalance: number;
  /** Asset class of the active account; threaded so futures dashboards read stored P&L. */
  accountType?: 'standard' | 'futures';
  initialSubscription?: ResolvedSubscription;
}

// --- Gauge card configs ---
interface MetricGaugeConfig {
  key: keyof PeriodMetrics;
  label: string;
  infoText: string;
  format: (v: number) => string;
  gaugeMax: number;
  invertBetter?: boolean;
  targetText: string;
  scaleLeft?: string;
  scaleRight?: string;
}


const METRIC_GAUGE_CONFIGS: MetricGaugeConfig[] = [
  {
    key: 'winRate',
    label: 'Win Rate',
    infoText: 'Percentage of trades that closed with a profit. 50%+ is generally acceptable.',
    format: (v) => `${v.toFixed(1)}%`,

    gaugeMax: 100, targetText: 'Target ≥ 50%', scaleLeft: '0%', scaleRight: '100%',
  },
  {
    key: 'netPnlPct',
    label: 'Net PnL %',
    infoText: 'Net profit/loss as a percentage of account balance over the period.',
    format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`,

    gaugeMax: 10, targetText: 'Higher is better', scaleLeft: '0%', scaleRight: '+10%',
  },
  {
    key: 'profitFactor',
    label: 'Profit Factor',
    infoText: 'Gross profit divided by gross loss. Above 1.5 is considered good.',
    format: (v) => v.toFixed(2),

    gaugeMax: 3, targetText: 'Target ≥ 1.5', scaleLeft: '0', scaleRight: '3',
  },
  {
    key: 'expectancy',
    label: 'Expectancy',
    infoText: 'Average profit or loss per trade in dollars. Positive means the system is profitable.',
    format: (v) => `$${v.toFixed(0)}`,

    gaugeMax: 500, targetText: 'Higher is better', scaleLeft: '$0', scaleRight: '$500',
  },
  {
    key: 'maxDrawdown',
    label: 'Max Drawdown',
    infoText: 'Largest peak-to-trough decline. Lower is better — aim to keep below 10%.',
    format: (v) => `${v.toFixed(2)}%`,

    gaugeMax: 20, invertBetter: true, targetText: 'Target < 10%', scaleLeft: '0%', scaleRight: '20%',
  },
  {
    key: 'recoveryFactor',
    label: 'Recovery Factor',
    infoText: 'Net profit divided by max drawdown. Shows how well the system recovers from losses.',
    format: (v) => v.toFixed(2),

    gaugeMax: 3, targetText: 'Target ≥ 1', scaleLeft: '0', scaleRight: '3',
  },
  {
    key: 'avgWinLossRatio',
    label: 'Avg W/L Ratio',
    infoText: 'Average winning trade size divided by average losing trade size.',
    format: (v) => v.toFixed(2),

    gaugeMax: 3, targetText: 'Target ≥ 1.5', scaleLeft: '0', scaleRight: '3',
  },
  {
    key: 'tradeFrequency',
    label: 'Trade Frequency',
    infoText: 'Average number of trades per day over the period.',
    format: (v) => `${v.toFixed(1)}/d`,

    gaugeMax: 5, targetText: 'Trades per day', scaleLeft: '0', scaleRight: '5/d',
  },
  {
    key: 'longWinRate',
    label: 'Long Win Rate',
    infoText: 'Win rate for long (buy) trades only.',
    format: (v) => `${v.toFixed(1)}%`,

    gaugeMax: 100, targetText: 'Target ≥ 50%', scaleLeft: '0%', scaleRight: '100%',
  },
  {
    key: 'shortWinRate',
    label: 'Short Win Rate',
    infoText: 'Win rate for short (sell) trades only.',
    format: (v) => `${v.toFixed(1)}%`,

    gaugeMax: 100, targetText: 'Target ≥ 50%', scaleLeft: '0%', scaleRight: '100%',
  },
  {
    key: 'consistencyScore',
    label: 'Consistency',
    infoText: 'How consistently the strategy produces positive results across individual trading days.',
    format: (v) => `${v.toFixed(1)}%`,

    gaugeMax: 100, targetText: 'Target ≥ 60%', scaleLeft: '0%', scaleRight: '100%',
  },
];

function daysForKey(key: PeriodKey): number {
  return AI_VISION_ALL_PERIODS.find((p) => p.key === key)?.days ?? 30;
}

function labelForKey(key: PeriodKey): string {
  return AI_VISION_ALL_PERIODS.find((p) => p.key === key)?.label ?? key;
}

// ─── Static demo data shown when feature is locked (non-PRO) ────────────────

const DEMO_METRICS_A: PeriodMetrics = {
  winRate: 63.2, netPnlPct: 4.1, profitFactor: 1.87, expectancy: 182,
  maxDrawdown: 6.4, recoveryFactor: 1.9, avgWinLossRatio: 1.62,
  tradeFrequency: 2.3, longWinRate: 67.1, shortWinRate: 58.4,
  consistencyScore: 71.5, currentStreak: 3, maxWinStreak: 7, maxLossStreak: 3,
  tradeCount: 38, dayCount: 30,
};

const DEMO_METRICS_B: PeriodMetrics = {
  winRate: 57.8, netPnlPct: 2.6, profitFactor: 1.54, expectancy: 134,
  maxDrawdown: 8.1, recoveryFactor: 1.4, avgWinLossRatio: 1.44,
  tradeFrequency: 2.0, longWinRate: 60.3, shortWinRate: 53.1,
  consistencyScore: 64.2, currentStreak: 1, maxWinStreak: 6, maxLossStreak: 4,
  tradeCount: 61, dayCount: 60,
};

const DEMO_METRICS_C: PeriodMetrics = {
  winRate: 54.1, netPnlPct: 1.8, profitFactor: 1.38, expectancy: 98,
  maxDrawdown: 9.7, recoveryFactor: 1.1, avgWinLossRatio: 1.31,
  tradeFrequency: 1.8, longWinRate: 56.2, shortWinRate: 50.9,
  consistencyScore: 58.6, currentStreak: 1, maxWinStreak: 5, maxLossStreak: 5,
  tradeCount: 163, dayCount: 90,
};

const DEMO_SCORE_A = 74;
const DEMO_SCORE_B = 61;
const DEMO_SCORE_C = 52;

const DEMO_TREND_MONTHS = ['Oct 24', 'Nov 24', 'Dec 24', 'Jan 25', 'Feb 25', 'Mar 25'];
const DEMO_TREND_BY_METRIC: Record<string, { month: string; value: number | null }[]> = {
  winRate:          DEMO_TREND_MONTHS.map((m, i) => ({ month: m, value: [51, 55, 58, 60, 62, 63][i] ?? null })),
  netPnlPct:        DEMO_TREND_MONTHS.map((m, i) => ({ month: m, value: [0.8, 1.2, 1.9, 2.4, 3.1, 4.1][i] ?? null })),
  profitFactor:     DEMO_TREND_MONTHS.map((m, i) => ({ month: m, value: [1.2, 1.3, 1.5, 1.6, 1.7, 1.9][i] ?? null })),
  expectancy:       DEMO_TREND_MONTHS.map((m, i) => ({ month: m, value: [70, 90, 110, 130, 155, 182][i] ?? null })),
  maxDrawdown:      DEMO_TREND_MONTHS.map((m, i) => ({ month: m, value: [11, 10, 9, 8, 7, 6][i] ?? null })),
  recoveryFactor:   DEMO_TREND_MONTHS.map((m, i) => ({ month: m, value: [0.8, 1.0, 1.2, 1.4, 1.7, 1.9][i] ?? null })),
  avgWinLossRatio:  DEMO_TREND_MONTHS.map((m, i) => ({ month: m, value: [1.1, 1.2, 1.3, 1.4, 1.5, 1.6][i] ?? null })),
  tradeFrequency:   DEMO_TREND_MONTHS.map((m, i) => ({ month: m, value: [1.5, 1.7, 1.9, 2.0, 2.2, 2.3][i] ?? null })),
  longWinRate:      DEMO_TREND_MONTHS.map((m, i) => ({ month: m, value: [53, 57, 61, 63, 65, 67][i] ?? null })),
  shortWinRate:     DEMO_TREND_MONTHS.map((m, i) => ({ month: m, value: [48, 50, 52, 54, 56, 58][i] ?? null })),
  consistencyScore: DEMO_TREND_MONTHS.map((m, i) => ({ month: m, value: [54, 58, 61, 65, 68, 72][i] ?? null })),
};

const DEMO_PATTERNS: DetectedPattern[] = [
  { id: 'demo-1', type: 'strength', title: 'Strong Long Bias', description: '67.1% win rate on long trades — your strategy performs best with the trend.', priority: 1 },
  { id: 'demo-2', type: 'insight',  title: 'Improving Win Rate', description: 'Win rate has risen from 51% to 63% over the last 6 months — positive momentum.', priority: 2 },
  { id: 'demo-3', type: 'warning',  title: 'Max Drawdown Above 5%', description: 'Peak-to-trough drawdown reached 6.4% this period. Consider tightening risk controls.', priority: 3 },
  { id: 'demo-4', type: 'weakness', title: 'Short Win Rate Lagging', description: 'Short trades win only 58.4% of the time vs 67.1% for longs. Review short setups.', priority: 4 },
];

export default function AiVisionClient({
  userId,
  strategyId,
  strategyName,
  mode,
  accountId,
  accountBalance,
  accountType = 'standard',
  initialSubscription,
}: AiVisionClientProps) {
  // ── Subscription / PRO gate ───────────────────────────────────────────────
  const { isPro } = useSubscription({ userId, initialData: initialSubscription });
  const isLocked = !isPro;

  // ── Filter state ─────────────────────────────────────────────────────────
  const [selectedMarket, setSelectedMarket] = useState('all');
  const [selectedExecution, setSelectedExecution] = useState<'all' | 'executed' | 'nonExecuted'>('executed');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('short');

  // ── Data queries ─────────────────────────────────────────────────────────
  // Skip the network fetch entirely when locked — non-PRO users see demo data.
  const {
    periods,
    allTrades,
    isInitialLoading,
    isRefetching,
  } = useAiVisionData({
    userId,
    accountId,
    mode,
    strategyId,
    market: selectedMarket,
    execution: selectedExecution,
    enabled: !isLocked,
  });

  // ── Active preset keys ────────────────────────────────────────────────────
  const [keyA, keyB, keyC] = PERIOD_PRESETS[periodPreset].keys;

  const tradesA = periods[keyA].trades;
  const tradesB = periods[keyB].trades;
  const tradesC = periods[keyC].trades;

  // ── Metric computation ───────────────────────────────────────────────────
  // When locked, return demo values directly — saves the full calculation
  // pipeline for every non-PRO render. (Audit finding F5.)
  const metricsA = useMemo(
    () => (isLocked ? DEMO_METRICS_A : calculatePeriodMetrics(tradesA, accountBalance, daysForKey(keyA), accountType)),
    [isLocked, tradesA, accountBalance, keyA, accountType],
  );
  const metricsB = useMemo(
    () => (isLocked ? DEMO_METRICS_B : calculatePeriodMetrics(tradesB, accountBalance, daysForKey(keyB), accountType)),
    [isLocked, tradesB, accountBalance, keyB, accountType],
  );
  const metricsC = useMemo(
    () => (isLocked ? DEMO_METRICS_C : calculatePeriodMetrics(tradesC, accountBalance, daysForKey(keyC), accountType)),
    [isLocked, tradesC, accountBalance, keyC, accountType],
  );

  const scoreA = useMemo(() => (isLocked ? DEMO_SCORE_A : calculateAiVisionScore(metricsA)), [isLocked, metricsA]);
  const scoreB = useMemo(() => (isLocked ? DEMO_SCORE_B : calculateAiVisionScore(metricsB)), [isLocked, metricsB]);
  const scoreC = useMemo(() => (isLocked ? DEMO_SCORE_C : calculateAiVisionScore(metricsC)), [isLocked, metricsC]);

  // Monthly trendline data per metric key, derived from allTrades.
  //
  // Previous implementation called `calculatePeriodMetrics` 11× per month
  // (once for each METRIC_GAUGE_CONFIGS entry) and only kept one field each
  // time — O(months × 11) scans. Now we compute each month's metrics once
  // and fan out to every metric key. (Audit finding F1.)
  //
  // Also:
  //  - Uses `date-fns/parse` instead of `new Date('01 MMM yy')` so Firefox
  //    and Safari don't silently return Invalid Date. (Audit finding F6.)
  //  - Uses `getDaysInMonth()` for the `days` arg so `tradeFrequency` is
  //    correct for 28/30/31-day months. (Audit finding F7.)
  //  - Skips malformed `trade_date` rows instead of producing
  //    `"Invalid Date"` month keys. (Eng-review critical gap.)
  const trendByMetric = useMemo<Record<string, TrendPoint[]>>(() => {
    if (isLocked) return DEMO_TREND_BY_METRIC;
    if (allTrades.length === 0) return {};

    const byMonth = new Map<string, Trade[]>();
    for (const t of allTrades) {
      const d = new Date(t.trade_date);
      if (Number.isNaN(d.getTime())) continue;
      const key = format(d, 'MMM yy');
      let bucket = byMonth.get(key);
      if (!bucket) {
        bucket = [];
        byMonth.set(key, bucket);
      }
      bucket.push(t);
    }
    if (byMonth.size === 0) return {};

    const parseMonthLabel = (label: string) => parse(label, 'MMM yy', new Date());

    const sortedMonths = Array.from(byMonth.entries()).sort(
      ([a], [b]) => parseMonthLabel(a).getTime() - parseMonthLabel(b).getTime(),
    );

    // Fill in missing months between first and last with null.
    const filledMonths: Array<[string, Trade[] | null]> = [];
    const start = parseMonthLabel(sortedMonths[0][0]);
    const end = parseMonthLabel(sortedMonths[sortedMonths.length - 1][0]);
    const cur = new Date(start);
    while (cur <= end) {
      const label = format(cur, 'MMM yy');
      filledMonths.push([label, byMonth.get(label) ?? null]);
      cur.setMonth(cur.getMonth() + 1);
    }

    // Compute metrics ONCE per month, then fan out across METRIC_GAUGE_CONFIGS.
    const metricsByMonth = filledMonths.map(([month, trades]) => {
      if (!trades) return { month, metrics: null as PeriodMetrics | null };
      const daysInMonth = getDaysInMonth(parseMonthLabel(month));
      return { month, metrics: calculatePeriodMetrics(trades, accountBalance, daysInMonth, accountType) };
    });

    const result: Record<string, TrendPoint[]> = {};
    for (const cfg of METRIC_GAUGE_CONFIGS) {
      result[cfg.key] = metricsByMonth.map(({ month, metrics }) => ({
        month,
        value: metrics ? (metrics[cfg.key] as number) : null,
      }));
    }
    return result;
  }, [isLocked, allTrades, accountBalance, accountType]);

  const markets = useMemo(
    () => Array.from(new Set(allTrades.map((t) => t.market).filter(Boolean))),
    [allTrades],
  );

  // ── Pattern detection (across all 3 periods + multi-period trends) ─────
  const detectedPatterns = useMemo(() => {
    if (isLocked) return DEMO_PATTERNS;

    const labelA = labelForKey(keyA);
    const labelB = labelForKey(keyB);
    const labelC = labelForKey(keyC);

    const patternsA = detectTradingPatterns(tradesA, metricsA, accountBalance, metricsB);
    const patternsB = detectTradingPatterns(tradesB, metricsB, accountBalance, metricsC);
    const patternsC = detectTradingPatterns(tradesC, metricsC, accountBalance, null);
    const trendPatterns = detectMultiPeriodTrends(metricsA, metricsB, metricsC, [labelA, labelB, labelC], tradesA, tradesB, tradesC, accountBalance, accountType);

    const merged = mergePatternsByPeriod([
      { patterns: patternsA, periodLabel: labelA },
      { patterns: patternsB, periodLabel: labelB },
      { patterns: patternsC, periodLabel: labelC },
    ]);

    // Add trend patterns (these are already unique, no merging needed)
    return [...merged, ...trendPatterns].sort((a, b) => a.priority - b.priority);
  }, [isLocked, tradesA, tradesB, tradesC, metricsA, metricsB, metricsC, accountBalance, accountType, keyA, keyB, keyC]);

  // Guard against hydration mismatch: during SSR, TanStack Query has no cache
  // so `isInitialLoading` is true, but on the client cached data from prior
  // navigation can make it false immediately. Force the first render to match
  // the server (skeleton for PRO) then flip after mount.
  const emptySubscribe = (cb: () => void) => () => {};
  const hasMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const allEmpty =
    !isLocked &&
    hasMounted &&
    !isInitialLoading &&
    metricsA.tradeCount === 0 &&
    metricsB.tradeCount === 0 &&
    metricsC.tradeCount === 0;

  const isLoading = !isLocked && (!hasMounted || isInitialLoading);

  return (
    <div className="relative min-h-screen">
      <AiVisionLoadingOverlay isVisible={isRefetching} />

      <div
        className={cn(
          'flex flex-col gap-6 transition-all duration-300',
          isRefetching && 'blur-[2px] opacity-30 pointer-events-none',
        )}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-0">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            AI Vision
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Performance insights and trend analysis for {strategyName}
          </p>
        </div>

        {/* ── Filters row: period preset + market + execution ─────────────── */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Period preset toggle */}
          <div
            className="flex items-center gap-1.5 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 p-1"
            role="group"
            aria-label="Period preset"
          >
            {(Object.entries(PERIOD_PRESETS) as [PeriodPreset, typeof PERIOD_PRESETS[PeriodPreset]][]).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                aria-pressed={periodPreset === key}
                onClick={() => setPeriodPreset(key)}
                className={cn(
                  'rounded-lg px-3 py-1 text-xs font-semibold transition-all duration-200',
                  periodPreset === key
                    ? 'themed-btn-primary text-white border-0'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Market filter */}
          <div className="flex items-center gap-2">
            <span id="ai-vision-market-label" className="text-xs font-semibold text-slate-500 dark:text-slate-300 whitespace-nowrap">Market:</span>
            <Select value={selectedMarket} onValueChange={setSelectedMarket}>
              <SelectTrigger aria-labelledby="ai-vision-market-label" className="w-32 h-8 text-xs rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-none text-slate-900 dark:text-slate-50">
                <SelectValue placeholder="All Markets" />
              </SelectTrigger>
              <SelectContent className="z-[100] rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl text-slate-900 dark:text-slate-50">
                <SelectItem value="all">All Markets</SelectItem>
                {markets.map((market) => (
                  <SelectItem key={market} value={market}>{market}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Execution filter */}
          <div className="flex items-center gap-2">
            <span id="ai-vision-execution-label" className="text-xs font-semibold text-slate-500 dark:text-slate-300 whitespace-nowrap">Execution:</span>
            <Select value={selectedExecution} onValueChange={(v) => setSelectedExecution(v as 'all' | 'executed' | 'nonExecuted')}>
              <SelectTrigger aria-labelledby="ai-vision-execution-label" className="w-32 h-8 text-xs rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-none text-slate-900 dark:text-slate-50">
                <SelectValue placeholder="Executed" />
              </SelectTrigger>
              <SelectContent className="z-[100] rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl text-slate-900 dark:text-slate-50">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="executed">Executed</SelectItem>
                <SelectItem value="nonExecuted">Non Executed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── PRO-gated data sections ──────────────────────────────────────── */}
        <TooltipProvider>
          <Tooltip delayDuration={120}>
            <TooltipTrigger asChild>
              <div className="relative">
                {/* PRO badge */}
                {isLocked && (
                  <span className="absolute right-0 top-0 z-20 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                    <Crown className="w-3 h-3" aria-hidden="true" /> PRO
                  </span>
                )}

                {/* Blur glass overlay */}
                {isLocked && (
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 bg-white/10 dark:bg-slate-950/10 backdrop-blur-[2px] rounded-2xl" />
                )}

                {/* Content — blurred when locked */}
                <div className={cn('flex flex-col gap-6', isLocked && 'blur-[3px] opacity-70 pointer-events-none select-none')}>

                  {/* ── AI Detected Patterns ───────────────────────────────── */}
                  {isLoading ? (
                    <AiVisionPatternsSkeleton />
                  ) : !allEmpty ? (
                    <AiVisionPatterns patterns={detectedPatterns} />
                  ) : null}

                  {/* ── Score cards ────────────────────────────────────────── */}
                  <section aria-label="AI Vision Scores">
                    <SectionHeading
                      title="Composite Health Score"
                      description="Each period is compared to the next longer window (0–100)"
                      containerClassName="mt-10"
                    />

                    {isLoading ? (
                      <AiVisionScoreCardsSkeleton />
                    ) : allEmpty ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                          <AiVisionScoreCard label={labelForKey(keyA)} score={scoreA} delta={null} hasNoTrades />
                          <AiVisionScoreCard label={labelForKey(keyB)} score={scoreB} delta={null} hasNoTrades />
                          <AiVisionScoreCard label={labelForKey(keyC)} score={scoreC} delta={null} isBaseline hasNoTrades />
                        </div>
                        <div className="flex items-center justify-center py-16 text-slate-500 dark:text-slate-400 text-sm">
                          No trades found for this period. Start trading to see AI Vision insights.
                        </div>
                      </>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <AiVisionScoreCard
                          label={labelForKey(keyA)}
                          score={scoreA}
                          delta={metricsA.tradeCount > 0 && metricsB.tradeCount > 0 ? scoreA - scoreB : null}
                          vsLabel={`vs ${keyB}`}
                          hasNoTrades={metricsA.tradeCount === 0}
                        />
                        <AiVisionScoreCard
                          label={labelForKey(keyB)}
                          score={scoreB}
                          delta={metricsB.tradeCount > 0 && metricsC.tradeCount > 0 ? scoreB - scoreC : null}
                          vsLabel={`vs ${keyC}`}
                          hasNoTrades={metricsB.tradeCount === 0}
                        />
                        <AiVisionScoreCard
                          label={labelForKey(keyC)}
                          score={scoreC}
                          delta={null}
                          isBaseline
                          hasNoTrades={metricsC.tradeCount === 0}
                        />
                      </div>
                    )}
                  </section>

                  {/* ── Metric Rows ─────────────────────────────────────────── */}
                  {!allEmpty && (
                    <section aria-label="Metric rows">
                      <SectionHeading
                        title="Performance Metrics"
                        description="Deep dive into each metric that contributes to the health score."
                        containerClassName="mt-14"
                      />
                      {isLoading ? (
                        <AiVisionMetricRowsSkeleton />
                      ) : (
                        <div className="flex flex-col gap-6 mt-3">
                          {METRIC_GAUGE_CONFIGS.map((cfg) => (
                            <AiVisionMetricRow
                              key={cfg.key}
                              title={cfg.label}
                              infoText={cfg.infoText}
                              periods={[
                                { label: labelForKey(keyA), value: metricsA[cfg.key] as number, hasNoTrades: metricsA.tradeCount === 0 },
                                { label: labelForKey(keyB), value: metricsB[cfg.key] as number, hasNoTrades: metricsB.tradeCount === 0 },
                                { label: labelForKey(keyC), value: metricsC[cfg.key] as number, hasNoTrades: metricsC.tradeCount === 0 },
                              ]}
                              trendData={trendByMetric[cfg.key] ?? EMPTY_TREND}
                              formatValue={cfg.format}
                              invertBetter={cfg.invertBetter}
                              gaugeMax={cfg.gaugeMax}
                              showGauge
                              targetText={cfg.targetText}
                              scaleLeft={cfg.scaleLeft}
                              scaleRight={cfg.scaleRight}
                            />
                          ))}
                        </div>
                      )}
                    </section>
                  )}

                </div>
              </div>
            </TooltipTrigger>
            {isLocked && (
              <TooltipContent
                side="top"
                align="center"
                sideOffset={8}
                className="max-w-sm text-xs rounded-2xl p-3 relative overflow-hidden border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/90 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50"
              >
                <div aria-hidden="true" className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-2xl hidden dark:block" />
                <div className="relative">The data shown under the blur is fictive and for demo purposes only. Upgrade to PRO to unlock AI Vision insights.</div>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

      </div>
    </div>
  );
}
