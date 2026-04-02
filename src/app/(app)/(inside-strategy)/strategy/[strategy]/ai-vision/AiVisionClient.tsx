'use client';

// src/app/(app)/(inside-strategy)/strategy/[strategy]/ai-vision/AiVisionClient.tsx
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
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
import { detectTradingPatterns, detectMultiPeriodTrends, mergePatternsByPeriod } from '@/utils/detectTradingPatterns';
import { AiVisionPatterns } from '@/components/dashboard/ai-vision/AiVisionPatterns';
import { SectionHeading } from '../sections/SectionHeading';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface AiVisionClientProps {
  userId: string;
  strategyId: string | null;
  strategyName: string;
  mode: 'live' | 'backtesting' | 'demo';
  accountId: string | undefined;
  accountBalance: number;
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

export default function AiVisionClient({
  userId,
  strategyId,
  strategyName,
  mode,
  accountId,
  accountBalance,
}: AiVisionClientProps) {
  // ── Filter state ─────────────────────────────────────────────────────────
  const [selectedMarket, setSelectedMarket] = useState('all');
  const [selectedExecution, setSelectedExecution] = useState<'all' | 'executed' | 'nonExecuted'>('executed');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('short');

  // ── Data queries ─────────────────────────────────────────────────────────
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
  });

  // ── Active preset keys ────────────────────────────────────────────────────
  const [keyA, keyB, keyC] = PERIOD_PRESETS[periodPreset].keys;

  // Destructure trades for stable useMemo deps (avoids eslint-disable for dynamic indexing)
  const tradesA = periods[keyA].trades;
  const tradesB = periods[keyB].trades;
  const tradesC = periods[keyC].trades;

  // ── Metric computation ───────────────────────────────────────────────────
  const metricsA = useMemo(
    () => calculatePeriodMetrics(tradesA, accountBalance, daysForKey(keyA)),
    [tradesA, accountBalance, keyA],
  );
  const metricsB = useMemo(
    () => calculatePeriodMetrics(tradesB, accountBalance, daysForKey(keyB)),
    [tradesB, accountBalance, keyB],
  );
  const metricsC = useMemo(
    () => calculatePeriodMetrics(tradesC, accountBalance, daysForKey(keyC)),
    [tradesC, accountBalance, keyC],
  );

  const scoreA = useMemo(() => calculateAiVisionScore(metricsA), [metricsA]);
  const scoreB = useMemo(() => calculateAiVisionScore(metricsB), [metricsB]);
  const scoreC = useMemo(() => calculateAiVisionScore(metricsC), [metricsC]);

  // Monthly trendline data per metric key, derived from allTrades
  const trendByMetric = useMemo<Record<string, TrendPoint[]>>(() => {
    if (allTrades.length === 0) return {};
    const byMonth = new Map<string, typeof allTrades>();
    for (const t of allTrades) {
      const key = format(new Date(t.trade_date), 'MMM yy');
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(t);
    }
    // Sort months chronologically (oldest → newest)
    const sortedMonths = Array.from(byMonth.entries()).sort(([a], [b]) => {
      return new Date(`01 ${a}`).getTime() - new Date(`01 ${b}`).getTime();
    });

    // Fill in missing months between first and last with null
    const filledMonths: Array<[string, typeof allTrades | null]> = [];
    if (sortedMonths.length > 0) {
      const start = new Date(`01 ${sortedMonths[0][0]}`);
      const end = new Date(`01 ${sortedMonths[sortedMonths.length - 1][0]}`);
      const cur = new Date(start);
      while (cur <= end) {
        const label = format(cur, 'MMM yy');
        filledMonths.push([label, byMonth.get(label) ?? null]);
        cur.setMonth(cur.getMonth() + 1);
      }
    }

    const result: Record<string, TrendPoint[]> = {};
    for (const cfg of METRIC_GAUGE_CONFIGS) {
      result[cfg.key] = filledMonths.map(([month, trades]) => ({
        month,
        value: trades ? calculatePeriodMetrics(trades, accountBalance, 30)[cfg.key] as number : null,
      }));
    }
    return result;
  }, [allTrades, accountBalance]);

  const markets = useMemo(
    () => Array.from(new Set(allTrades.map((t) => t.market).filter(Boolean))),
    [allTrades],
  );

  // ── Pattern detection (across all 3 periods + multi-period trends) ─────
  const detectedPatterns = useMemo(() => {
    const labelA = labelForKey(keyA);
    const labelB = labelForKey(keyB);
    const labelC = labelForKey(keyC);

    const patternsA = detectTradingPatterns(tradesA, metricsA, accountBalance, metricsB);
    const patternsB = detectTradingPatterns(tradesB, metricsB, accountBalance, metricsC);
    const patternsC = detectTradingPatterns(tradesC, metricsC, accountBalance, null);
    const trendPatterns = detectMultiPeriodTrends(metricsA, metricsB, metricsC, [labelA, labelB, labelC], tradesA, tradesB, tradesC, accountBalance);

    const merged = mergePatternsByPeriod([
      { patterns: patternsA, periodLabel: labelA },
      { patterns: patternsB, periodLabel: labelB },
      { patterns: patternsC, periodLabel: labelC },
    ]);

    // Add trend patterns (these are already unique, no merging needed)
    return [...merged, ...trendPatterns].sort((a, b) => a.priority - b.priority);
  }, [tradesA, tradesB, tradesC, metricsA, metricsB, metricsC, accountBalance, keyA, keyB, keyC]);

  const allEmpty =
    !isInitialLoading &&
    metricsA.tradeCount === 0 &&
    metricsB.tradeCount === 0 &&
    metricsC.tradeCount === 0;

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
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 p-1">
            {(Object.entries(PERIOD_PRESETS) as [PeriodPreset, typeof PERIOD_PRESETS[PeriodPreset]][]).map(([key, preset]) => (
              <button
                key={key}
                type="button"
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
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 whitespace-nowrap">Market:</span>
            <Select value={selectedMarket} onValueChange={setSelectedMarket}>
              <SelectTrigger className="w-32 h-8 text-xs rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-none text-slate-900 dark:text-slate-50">
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
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 whitespace-nowrap">Execution:</span>
            <Select value={selectedExecution} onValueChange={(v) => setSelectedExecution(v as 'all' | 'executed' | 'nonExecuted')}>
              <SelectTrigger className="w-32 h-8 text-xs rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-none text-slate-900 dark:text-slate-50">
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

        {/* ── AI Detected Patterns ─────────────────────────────────────────── */}
        {isInitialLoading ? (
          <AiVisionPatternsSkeleton />
        ) : !allEmpty ? (
          <AiVisionPatterns patterns={detectedPatterns} />
        ) : null}

        {/* ── Score cards ─────────────────────────────────────────────────── */}
        <section aria-label="AI Vision Scores">
          <SectionHeading
            title="Composite Health Score"
            description="Each period is compared to the next longer window (0–100)"
            containerClassName="mt-10"
          />

          {isInitialLoading ? (
            <AiVisionScoreCardsSkeleton />
          ) : allEmpty ? (
            <>
              <div className="grid grid-cols-3 gap-6">
                <AiVisionScoreCard
                  label={labelForKey(keyA)}
                  score={scoreA}
                  delta={null}
                  hasNoTrades
                />
                <AiVisionScoreCard
                  label={labelForKey(keyB)}
                  score={scoreB}
                  delta={null}
                  hasNoTrades
                />
                <AiVisionScoreCard
                  label={labelForKey(keyC)}
                  score={scoreC}
                  delta={null}
                  isBaseline
                  hasNoTrades
                />
              </div>
              <div className="flex items-center justify-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                No trades found for this period. Start trading to see AI Vision insights.
              </div>
            </>
          ) : (
            <div className="grid grid-cols-3 gap-6">
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

        {/* ── Metric Rows ─────────────────────────────────────────────────── */}
        {!allEmpty && (
          <section aria-label="Metric rows">
            <SectionHeading
              title="Performance Metrics"
              description="Deep dive into each metric that contributes to the health score."
              containerClassName="mt-14"
            />
            {isInitialLoading ? (
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
                    trendData={trendByMetric[cfg.key] ?? []}
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
  );
}
