'use client';

// src/app/(app)/(inside-strategy)/strategy/[strategy]/ai-vision/AiVisionClient.tsx
import { useMemo, useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { TradeFiltersBar } from '@/components/dashboard/analytics/TradeFiltersBar';
import { AiVisionSkeleton } from '@/components/dashboard/ai-vision/AiVisionSkeleton';
import { AiVisionLoadingOverlay } from '@/components/dashboard/ai-vision/AiVisionLoadingOverlay';
import { AiVisionScoreCard } from '@/components/dashboard/ai-vision/AiVisionScoreCard';
import { AiVisionRadarChart } from '@/components/dashboard/ai-vision/AiVisionRadarChart';
import { PeriodMetricCard } from '@/components/dashboard/ai-vision/PeriodMetricCard';
import { MetricTrendChart } from '@/components/dashboard/ai-vision/MetricTrendChart';
import { useAiVisionData, AI_VISION_DEFAULT_PERIODS } from '@/hooks/useAiVisionData';
import { calculatePeriodMetrics, EMPTY_PERIOD_METRICS, type PeriodMetrics } from '@/utils/calculatePeriodMetrics';
import { calculateAiVisionScore } from '@/utils/calculateAiVisionScore';
import { calculateRollingMetrics } from '@/utils/calculateRollingMetrics';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { buildPresetRange } from '@/utils/dateRangeHelpers';

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

function periodDayCount(key: string): number {
  return AI_VISION_DEFAULT_PERIODS.find((p) => p.key === key)?.days ?? 30;
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
  // Date range state is tracked but doesn't affect the 3 fixed period windows
  const [activeFilter, setActiveFilter] = useState<'year' | '15days' | '30days' | 'month' | 'all'>('year');
  const [dateRange, setDateRange] = useState(buildPresetRange('year').dateRange);

  // ── Trend line toggle state ───────────────────────────────────────────────
  const [showTrendLines, setShowTrendLines] = useState(false);

  // ── Data queries ─────────────────────────────────────────────────────────
  const {
    periods,
    allTrades,
    allTradesLoading,
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

  // ── Metric computation ───────────────────────────────────────────────────
  const metrics7d = useMemo(
    () => calculatePeriodMetrics(periods['7d'].trades, accountBalance, periodDayCount('7d')),
    [periods, accountBalance],
  );
  const metrics30d = useMemo(
    () => calculatePeriodMetrics(periods['30d'].trades, accountBalance, periodDayCount('30d')),
    [periods, accountBalance],
  );
  const metrics90d = useMemo(
    () => calculatePeriodMetrics(periods['90d'].trades, accountBalance, periodDayCount('90d')),
    [periods, accountBalance],
  );

  const score7d  = useMemo(() => calculateAiVisionScore(metrics7d),  [metrics7d]);
  const score30d = useMemo(() => calculateAiVisionScore(metrics30d), [metrics30d]);
  const score90d = useMemo(() => calculateAiVisionScore(metrics90d), [metrics90d]);

  const rollingData = useMemo(
    () => calculateRollingMetrics(allTrades, accountBalance),
    [allTrades, accountBalance],
  );

  // Market list from all trades (populates dropdown once loaded)
  const markets = useMemo(
    () => Array.from(new Set(allTrades.map((t) => t.market).filter(Boolean))),
    [allTrades],
  );

  // ── Initial loading ───────────────────────────────────────────────────────
  if (isInitialLoading) {
    return <AiVisionSkeleton />;
  }

  const allEmpty =
    metrics7d.tradeCount === 0 &&
    metrics30d.tradeCount === 0 &&
    metrics90d.tradeCount === 0;

  return (
    <div className="relative min-h-screen">
      {/* Refetch overlay (filter change, not initial load) */}
      <AiVisionLoadingOverlay isVisible={isRefetching} />

      <div
        className={cn(
          'flex flex-col gap-6 p-6 transition-all duration-300',
          isRefetching && 'blur-[2px] opacity-30 pointer-events-none',
        )}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            AI Vision
          </h1>
          <span className="text-sm text-slate-500 dark:text-slate-400">— {strategyName}</span>
        </div>

        {/* ── Filter bar (market + execution — date range visible but unused for periods) ── */}
        <TradeFiltersBar
          variant="full"
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          isCustomRange={false}
          selectedMarket={selectedMarket}
          onSelectedMarketChange={setSelectedMarket}
          markets={markets}
          selectedExecution={selectedExecution}
          onSelectedExecutionChange={setSelectedExecution}
          showAllTradesOption
        />

        {/* Period column labels */}
        <div className="grid grid-cols-3 gap-4 px-1">
          {AI_VISION_DEFAULT_PERIODS.map((p) => (
            <p key={p.key} className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {p.label}
            </p>
          ))}
        </div>

        {/* ── AI Vision Score cards ────────────────────────────────────────── */}
        <section aria-label="AI Vision Scores">
          <div className="grid grid-cols-3 gap-4">
            <AiVisionScoreCard
              label="Last 7 days"
              score={score7d}
              delta={metrics7d.tradeCount > 0 && metrics30d.tradeCount > 0 ? score7d - score30d : null}
              hasNoTrades={metrics7d.tradeCount === 0}
            />
            <AiVisionScoreCard
              label="Last 30 days"
              score={score30d}
              delta={metrics30d.tradeCount > 0 && metrics90d.tradeCount > 0 ? score30d - score90d : null}
              hasNoTrades={metrics30d.tradeCount === 0}
            />
            <AiVisionScoreCard
              label="Last 90 days"
              score={score90d}
              delta={null}
              isBaseline
              hasNoTrades={metrics90d.tradeCount === 0}
            />
          </div>
        </section>

        {/* ── All-empty state ──────────────────────────────────────────────── */}
        {allEmpty && (
          <div className="flex items-center justify-center py-16 text-slate-400 dark:text-slate-500 text-sm">
            No trades found for this period. Start trading to see AI Vision insights.
          </div>
        )}

        {/* ── Radar chart ─────────────────────────────────────────────────── */}
        {!allEmpty && (
          <section aria-label="Performance radar chart">
            <AiVisionRadarChart
              metrics7d={metrics7d}
              metrics30d={metrics30d}
              metrics90d={metrics90d}
            />
          </section>
        )}

        {/* ── Metric table ─────────────────────────────────────────────────── */}
        {!allEmpty && (
          <section aria-label="Period metric comparison">
            {/* Column header row */}
            <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_1fr] gap-x-3 px-4 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Metric</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">7d</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">30d</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">90d</span>
              <span />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Trend</span>
            </div>

            <div className="flex flex-col gap-1.5">
              {METRICS.map((m) => (
                <PeriodMetricCard
                  key={m.key}
                  metricKey={m.key}
                  label={m.label}
                  value7d={metrics7d[m.key] as number}
                  value30d={metrics30d[m.key] as number}
                  value90d={metrics90d[m.key] as number}
                  hasNoTrades7d={metrics7d.tradeCount === 0}
                  hasNoTrades30d={metrics30d.tradeCount === 0}
                  hasNoTrades90d={metrics90d.tradeCount === 0}
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
