'use client';

// src/app/(app)/(inside-strategy)/strategy/[strategy]/ai-vision/AiVisionClient.tsx
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { AiVisionSkeleton } from '@/components/dashboard/ai-vision/AiVisionSkeleton';
import { AiVisionLoadingOverlay } from '@/components/dashboard/ai-vision/AiVisionLoadingOverlay';
import { AiVisionScoreCard } from '@/components/dashboard/ai-vision/AiVisionScoreCard';
import { AiVisionBarChart } from '@/components/dashboard/ai-vision/AiVisionBarChart';
import { PeriodMetricCard } from '@/components/dashboard/ai-vision/PeriodMetricCard';
import { MetricTrendChart } from '@/components/dashboard/ai-vision/MetricTrendChart';
import { MetricGaugeCard, type GaugeGradientStop } from '@/components/dashboard/ai-vision/MetricGaugeCard';
import {
  useAiVisionData,
  AI_VISION_ALL_PERIODS,
  PERIOD_PRESETS,
  type PeriodKey,
  type PeriodPreset,
} from '@/hooks/useAiVisionData';
import { calculatePeriodMetrics, type PeriodMetrics } from '@/utils/calculatePeriodMetrics';
import { calculateAiVisionScore } from '@/utils/calculateAiVisionScore';
import { calculateRollingMetrics } from '@/utils/calculateRollingMetrics';
import { SectionHeading } from '../sections/SectionHeading';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface AiVisionClientProps {
  userId: string;
  strategyId: string | null;
  strategyName: string;
  mode: string;
  accountId: string | undefined;
  accountBalance: number;
}

// --- Metric definitions ---
interface MetricDef {
  key: keyof PeriodMetrics;
  label: string;
  format: (v: number) => string;
  invertDelta?: boolean;
}

const METRICS: MetricDef[] = [
  { key: 'winRate',          label: 'Win Rate',         format: (v) => `${v.toFixed(1)}%` },
  { key: 'netPnlPct',        label: 'Net PnL %',        format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` },
  { key: 'profitFactor',     label: 'Profit Factor',    format: (v) => v.toFixed(2) },
  { key: 'expectancy',       label: 'Expectancy',       format: (v) => `$${v.toFixed(0)}` },
  { key: 'maxDrawdown',      label: 'Max Drawdown',     format: (v) => `${v.toFixed(2)}%`, invertDelta: true },
  { key: 'recoveryFactor',   label: 'Recovery Factor',  format: (v) => v.toFixed(2) },
  { key: 'avgWinLossRatio',  label: 'Avg W/L Ratio',    format: (v) => v.toFixed(2) },
  { key: 'tradeFrequency',   label: 'Trade Frequency',  format: (v) => `${v.toFixed(1)}/d` },
  { key: 'longWinRate',      label: 'Long Win Rate',    format: (v) => `${v.toFixed(1)}%` },
  { key: 'shortWinRate',     label: 'Short Win Rate',   format: (v) => `${v.toFixed(1)}%` },
  { key: 'consistencyScore', label: 'Consistency',      format: (v) => `${v.toFixed(1)}%` },
  { key: 'currentStreak',    label: 'Current Streak',   format: (v) => v >= 0 ? `+${v}W` : `${Math.abs(v)}L` },
];

// --- Gauge card configs ---
interface MetricGaugeConfig {
  key: keyof PeriodMetrics;
  label: string;
  infoText: string;
  format: (v: number) => string;
  gradientStops: GaugeGradientStop[];
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
    gradientStops: [{ offset: '0%', stopColor: '#34d399' }, { offset: '100%', stopColor: '#059669' }],
    gaugeMax: 100, targetText: 'Target ≥ 50%', scaleLeft: '0%', scaleRight: '100%',
  },
  {
    key: 'netPnlPct',
    label: 'Net PnL %',
    infoText: 'Net profit/loss as a percentage of account balance over the period.',
    format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`,
    gradientStops: [{ offset: '0%', stopColor: '#60a5fa' }, { offset: '100%', stopColor: '#2563eb' }],
    gaugeMax: 10, targetText: 'Higher is better', scaleLeft: '0%', scaleRight: '+10%',
  },
  {
    key: 'profitFactor',
    label: 'Profit Factor',
    infoText: 'Gross profit divided by gross loss. Above 1.5 is considered good.',
    format: (v) => v.toFixed(2),
    gradientStops: [{ offset: '0%', stopColor: '#a78bfa' }, { offset: '100%', stopColor: '#7c3aed' }],
    gaugeMax: 3, targetText: 'Target ≥ 1.5', scaleLeft: '0', scaleRight: '3',
  },
  {
    key: 'expectancy',
    label: 'Expectancy',
    infoText: 'Average profit or loss per trade in dollars. Positive means the system is profitable.',
    format: (v) => `$${v.toFixed(0)}`,
    gradientStops: [{ offset: '0%', stopColor: '#38bdf8' }, { offset: '100%', stopColor: '#0284c7' }],
    gaugeMax: 500, targetText: 'Higher is better', scaleLeft: '$0', scaleRight: '$500',
  },
  {
    key: 'maxDrawdown',
    label: 'Max Drawdown',
    infoText: 'Largest peak-to-trough decline. Lower is better — aim to keep below 10%.',
    format: (v) => `${v.toFixed(2)}%`,
    gradientStops: [{ offset: '0%', stopColor: '#f87171' }, { offset: '100%', stopColor: '#dc2626' }],
    gaugeMax: 20, invertBetter: true, targetText: 'Target < 10%', scaleLeft: '0%', scaleRight: '20%',
  },
  {
    key: 'recoveryFactor',
    label: 'Recovery Factor',
    infoText: 'Net profit divided by max drawdown. Shows how well the system recovers from losses.',
    format: (v) => v.toFixed(2),
    gradientStops: [{ offset: '0%', stopColor: '#c084fc' }, { offset: '100%', stopColor: '#9333ea' }],
    gaugeMax: 3, targetText: 'Target ≥ 1', scaleLeft: '0', scaleRight: '3',
  },
  {
    key: 'avgWinLossRatio',
    label: 'Avg W/L Ratio',
    infoText: 'Average winning trade size divided by average losing trade size.',
    format: (v) => v.toFixed(2),
    gradientStops: [{ offset: '0%', stopColor: '#fb923c' }, { offset: '100%', stopColor: '#ea580c' }],
    gaugeMax: 3, targetText: 'Target ≥ 1.5', scaleLeft: '0', scaleRight: '3',
  },
  {
    key: 'tradeFrequency',
    label: 'Trade Frequency',
    infoText: 'Average number of trades per day over the period.',
    format: (v) => `${v.toFixed(1)}/d`,
    gradientStops: [{ offset: '0%', stopColor: '#94a3b8' }, { offset: '100%', stopColor: '#475569' }],
    gaugeMax: 5, targetText: 'Trades per day', scaleLeft: '0', scaleRight: '5/d',
  },
  {
    key: 'longWinRate',
    label: 'Long Win Rate',
    infoText: 'Win rate for long (buy) trades only.',
    format: (v) => `${v.toFixed(1)}%`,
    gradientStops: [{ offset: '0%', stopColor: '#34d399' }, { offset: '100%', stopColor: '#059669' }],
    gaugeMax: 100, targetText: 'Target ≥ 50%', scaleLeft: '0%', scaleRight: '100%',
  },
  {
    key: 'shortWinRate',
    label: 'Short Win Rate',
    infoText: 'Win rate for short (sell) trades only.',
    format: (v) => `${v.toFixed(1)}%`,
    gradientStops: [{ offset: '0%', stopColor: '#22d3ee' }, { offset: '100%', stopColor: '#0891b2' }],
    gaugeMax: 100, targetText: 'Target ≥ 50%', scaleLeft: '0%', scaleRight: '100%',
  },
  {
    key: 'consistencyScore',
    label: 'Consistency',
    infoText: 'How consistently the strategy produces positive results across individual trading days.',
    format: (v) => `${v.toFixed(1)}%`,
    gradientStops: [{ offset: '0%', stopColor: '#fbbf24' }, { offset: '100%', stopColor: '#d97706' }],
    gaugeMax: 100, targetText: 'Target ≥ 60%', scaleLeft: '0%', scaleRight: '100%',
  },
  {
    key: 'currentStreak',
    label: 'Current Streak',
    infoText: 'Current consecutive winning or losing streak. Positive = wins, negative = losses.',
    format: (v) => v >= 0 ? `+${v}W` : `${Math.abs(v)}L`,
    gradientStops: [{ offset: '0%', stopColor: '#818cf8' }, { offset: '100%', stopColor: '#4f46e5' }],
    gaugeMax: 10, targetText: 'Win streak', scaleLeft: '0', scaleRight: '10W',
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

  // ── Trend line toggle state ───────────────────────────────────────────────
  const [showTrendLines, setShowTrendLines] = useState(false);

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

  // ── Metric computation ───────────────────────────────────────────────────
  const metricsA = useMemo(
    () => calculatePeriodMetrics(periods[keyA].trades, accountBalance, daysForKey(keyA)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [periods[keyA].trades, accountBalance, keyA],
  );
  const metricsB = useMemo(
    () => calculatePeriodMetrics(periods[keyB].trades, accountBalance, daysForKey(keyB)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [periods[keyB].trades, accountBalance, keyB],
  );
  const metricsC = useMemo(
    () => calculatePeriodMetrics(periods[keyC].trades, accountBalance, daysForKey(keyC)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [periods[keyC].trades, accountBalance, keyC],
  );

  const scoreA = useMemo(() => calculateAiVisionScore(metricsA), [metricsA]);
  const scoreB = useMemo(() => calculateAiVisionScore(metricsB), [metricsB]);
  const scoreC = useMemo(() => calculateAiVisionScore(metricsC), [metricsC]);

  const rollingData = useMemo(
    () => calculateRollingMetrics(allTrades, accountBalance),
    [allTrades, accountBalance],
  );

  const markets = useMemo(
    () => Array.from(new Set(allTrades.map((t) => t.market).filter(Boolean))),
    [allTrades],
  );

  // ── Initial loading ───────────────────────────────────────────────────────
  if (isInitialLoading) {
    return <AiVisionSkeleton />;
  }

  const allEmpty =
    metricsA.tradeCount === 0 &&
    metricsB.tradeCount === 0 &&
    metricsC.tradeCount === 0;

  return (
    <div className="relative min-h-screen">
      <AiVisionLoadingOverlay isVisible={isRefetching} />

      <div
        className={cn(
          'flex flex-col gap-6 p-6 transition-all duration-300',
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

        {/* ── Score cards + Bar chart side by side ─────────────────────────── */}
        <section aria-label="AI Vision Scores">
          <SectionHeading
            title="Composite Health Score"
            description="Each period is compared to the next longer window (0–100)"
            containerClassName="mt-4"
          />

          {allEmpty ? (
            <>
              <div className="grid grid-cols-3 gap-4">
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
            <div className="flex flex-col">
              {/* Score cards — 3-column row */}
              <div className="grid grid-cols-3 gap-4">
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

              {/* Chart — full width */}
              <SectionHeading
                title="Performance vs Baseline"
                description={`${labelForKey(keyA)} & ${labelForKey(keyB)} compared against ${labelForKey(keyC)}`}
                containerClassName="mt-14"
              />
              <AiVisionBarChart
                metricsA={metricsA}
                metricsB={metricsB}
                metricsC={metricsC}
                labelA={labelForKey(keyA)}
                labelB={labelForKey(keyB)}
              />
            </div>
          )}
        </section>

        {/* ── Metric Gauge Cards ───────────────────────────────────────────── */}
        {!allEmpty && (
          <section aria-label="Metric gauge cards">
            <SectionHeading
              title="Metric Cards"
              description="Each metric as a gauge with trend line"
              containerClassName="mt-2"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
              {METRIC_GAUGE_CONFIGS.map((cfg) => (
                <MetricGaugeCard
                  key={cfg.key}
                  title={cfg.label}
                  infoText={cfg.infoText}
                  periods={[
                    { label: labelForKey(keyA), value: metricsA[cfg.key] as number, hasNoTrades: metricsA.tradeCount === 0 },
                    { label: labelForKey(keyB), value: metricsB[cfg.key] as number, hasNoTrades: metricsB.tradeCount === 0 },
                    { label: labelForKey(keyC), value: metricsC[cfg.key] as number, hasNoTrades: metricsC.tradeCount === 0 },
                  ]}
                  rollingPoints={rollingData.points}
                  metricKey={cfg.key}
                  formatValue={cfg.format}
                  gradientStops={cfg.gradientStops}
                  gaugeMax={cfg.gaugeMax}
                  invertBetter={cfg.invertBetter}
                  targetText={cfg.targetText}
                  scaleLeft={cfg.scaleLeft}
                  scaleRight={cfg.scaleRight}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Metric table ─────────────────────────────────────────────────── */}
        {!allEmpty && (
          <section aria-label="Period metric comparison">
            <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_1fr] gap-x-3 px-4 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Metric</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{keyA}</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{keyB}</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{keyC}</span>
              <span />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Trend</span>
            </div>

            <div className="flex flex-col gap-1.5">
              {METRICS.map((m) => (
                <PeriodMetricCard
                  key={m.key}
                  metricKey={m.key}
                  label={m.label}
                  value7d={metricsA[m.key] as number}
                  value30d={metricsB[m.key] as number}
                  value90d={metricsC[m.key] as number}
                  hasNoTrades7d={metricsA.tradeCount === 0}
                  hasNoTrades30d={metricsB.tradeCount === 0}
                  hasNoTrades90d={metricsC.tradeCount === 0}
                  formatValue={m.format}
                  invertDelta={m.invertDelta}
                  rollingPoints={rollingData.points}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Trend lines toggle ───────────────────────────────────────────── */}
        {!allEmpty && (
          <section aria-label="Trend line charts">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              onClick={() => setShowTrendLines((v) => !v)}
            >
              {showTrendLines ? (
                <><ChevronUp className="h-3.5 w-3.5" />Hide trend lines</>
              ) : (
                <><ChevronDown className="h-3.5 w-3.5" />Show trend lines</>
              )}
            </Button>

            {showTrendLines && (
              <div className="mt-3">
                {rollingData.skippedDueToSize ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
                    Trend lines available for strategies with ≤5,000 trades.
                  </p>
                ) : rollingData.points.length < 2 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
                    Not enough trading history for trend lines. Keep trading!
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {METRICS.map((m) => (
                      <MetricTrendChart
                        key={m.key}
                        label={m.label}
                        metricKey={m.key}
                        points={rollingData.points}
                        formatValue={m.format}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
