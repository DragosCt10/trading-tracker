'use client';

import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  LayoutGrid,
  TrendingDown,
  TrendingUp,
  Columns2,
  PanelLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EquityCurveChart } from '@/components/dashboard/analytics/EquityCurveChart';
import { buildEquityPointsFromTrades } from '@/components/dashboard/analytics/EquityCurveCard';
import { TotalTradesDonut } from '@/components/dashboard/analytics/TotalTradesChartCard';
import { SummaryHalfGauge } from '@/components/dashboard/analytics/SummaryHalfGauge';
import { TradeCardsView } from '@/components/trades/TradeCardsView';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import {
  computeMonthlyStatsFromTrades,
  calculateTotalYearProfit,
} from '@/components/dashboard/analytics/AccountOverviewCard';
import { calculateTradingOverviewStats } from '@/utils/calculateTradingOverviewStats';
import { calculateWinRates } from '@/utils/calculateWinRates';
import { calculateAverageDrawdown } from '@/utils/analyticsCalculations';
import { useBECalc } from '@/contexts/BECalcContext';
import { useDarkMode } from '@/hooks/useDarkMode';
import { cn, formatPercent, roundToCents } from '@/lib/utils';
import type { Trade } from '@/types/trade';
import type { CustomStatConfig } from '@/types/customStats';
import { buildFilterPills } from '@/utils/applyCustomStatFilter';

type CardViewMode = 'grid-4' | 'grid-2' | 'split' | 'table';

interface CustomStatDetailViewProps {
  config: CustomStatConfig;
  trades: Trade[];
  currencySymbol: string;
  accountBalance: number | null;
  onBack: () => void;
}

export function CustomStatDetailView({
  config,
  trades,
  currencySymbol,
  accountBalance,
  onBack,
}: CustomStatDetailViewProps) {
  const { beCalcEnabled } = useBECalc();
  const { mounted } = useDarkMode();
  const [sortField, setSortField] = useState<'trade_date' | 'market' | 'outcome'>('trade_date');
  const [cardViewMode, setCardViewMode] = useState<CardViewMode>('grid-4');

  const filterPills = useMemo(() => buildFilterPills(config.filters), [config.filters]);

  const monthlyStats = useMemo(() => computeMonthlyStatsFromTrades(trades), [trades]);
  const netCumulativePnl = useMemo(() => calculateTotalYearProfit(monthlyStats), [monthlyStats]);
  const pnlPercent = useMemo(() => {
    const base = accountBalance || 1;
    return (netCumulativePnl / base) * 100;
  }, [netCumulativePnl, accountBalance]);

  const equityChartData = useMemo(() => buildEquityPointsFromTrades(trades), [trades]);
  const hasEquityData = equityChartData.length > 0;

  const totalTrades = trades.length;
  const wins = useMemo(() => trades.filter((t) => !t.break_even && t.trade_outcome === 'Win').length, [trades]);
  const losses = useMemo(() => trades.filter((t) => !t.break_even && t.trade_outcome === 'Lose').length, [trades]);
  const beTrades = useMemo(() => trades.filter((t) => t.break_even || t.trade_outcome === 'BE').length, [trades]);

  const overviewStats = useMemo(() => calculateTradingOverviewStats(trades), [trades]);
  const { winRateWithBE } = useMemo(() => calculateWinRates(trades), [trades]);
  const effectiveWinRate = beCalcEnabled ? winRateWithBE : overviewStats.winRate;

  const tradesForDrawdown = useMemo(() => trades.filter((t) => t.executed === true), [trades]);
  const averageDrawdown = useMemo(
    () => calculateAverageDrawdown(tradesForDrawdown, accountBalance || 0),
    [tradesForDrawdown, accountBalance]
  );
  const normalizedAverageDrawdown = useMemo(() => {
    const capped = Math.max(0, Math.min(averageDrawdown, 20));
    return (capped / 20) * 100;
  }, [averageDrawdown]);

  const sortedTrades = useMemo(() => {
    const list = [...trades];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'outcome') {
        const aV = a.break_even ? 'BE' : (a.trade_outcome ?? '');
        const bV = b.break_even ? 'BE' : (b.trade_outcome ?? '');
        cmp = aV.localeCompare(bV);
      } else if (sortField === 'trade_date') {
        const aVal = new Date(a.trade_date).getTime();
        const bVal = new Date(b.trade_date).getTime();
        cmp = bVal - aVal;
      } else {
        const aValue = (a as Record<string, unknown>)[sortField];
        const bValue = (b as Record<string, unknown>)[sortField];
        cmp = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
      if (cmp !== 0) return cmp;
      return (a.id ?? '').localeCompare(b.id ?? '');
    });
    return list;
  }, [trades, sortField]);

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg themed-header-icon-box shrink-0">
                <LayoutGrid className="h-4 w-4" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight line-clamp-1">
                {config.name}
              </h1>
            </div>
            {filterPills.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-2">
                {filterPills.map((pill) => (
                  <span
                    key={pill}
                    className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-200/70 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300"
                  >
                    {pill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">No filters — matches all trades</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 sm:mt-0.5">
          <button
            type="button"
            onClick={onBack}
            className="mt-0.5 inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 transition-colors cursor-pointer shrink-0 text-xs font-medium"
            aria-label="Back to Custom Stats"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Custom Stats</span>
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

        {/* Net P&L */}
        <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/40 shadow-lg shadow-slate-200/60 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-4 flex flex-col h-full">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Net P&amp;L
                </p>
                <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {currencySymbol}{roundToCents(netCumulativePnl).toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {netCumulativePnl >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                )}
                <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                  netCumulativePnl >= 0
                    ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                }`}>
                  {netCumulativePnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-[80px]">
              {!mounted ? (
                <div className="w-full h-full flex items-center justify-center">
                  <BouncePulse size="md" />
                </div>
              ) : !hasEquityData ? (
                <div className="w-full h-full flex items-center justify-center rounded-lg bg-slate-100/50 dark:bg-slate-800/30">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">No trades yet</p>
                </div>
              ) : (
                <EquityCurveChart
                  data={equityChartData}
                  currencySymbol={currencySymbol}
                  hasTrades={hasEquityData}
                  isLoading={false}
                  variant="card"
                  hideAxisLabels
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total Trades */}
        <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/40 shadow-lg shadow-slate-200/60 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-4 flex flex-col h-full">
            <div className="mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Total Trades
              </p>
            </div>
            <div className="flex-1 h-32 min-h-[7rem] w-full">
              {!mounted ? (
                <div className="w-full h-full flex items-center justify-center">
                  <BouncePulse size="md" />
                </div>
              ) : (
                <TotalTradesDonut
                  totalTrades={totalTrades}
                  wins={wins}
                  losses={losses}
                  beTrades={beTrades}
                  variant="compact"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Win Rate */}
        <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/40 shadow-lg shadow-slate-200/60 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-4 flex flex-col h-full">
            <div className="mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Win Rate
              </p>
            </div>
            <div className="flex-1 h-32 min-h-[7rem] relative w-full">
              {!mounted ? (
                <div className="w-full h-full flex items-center justify-center">
                  <BouncePulse size="md" />
                </div>
              ) : totalTrades === 0 ? (
                <div className="w-full h-full flex items-center justify-center rounded-lg bg-slate-100/50 dark:bg-slate-800/30">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">No trades yet</p>
                </div>
              ) : (
                <SummaryHalfGauge
                  variant="winRate"
                  valueNormalized={effectiveWinRate}
                  centerLabel={`${formatPercent(effectiveWinRate)}%`}
                  minLabel="0%"
                  maxLabel="100%"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Avg Drawdown */}
        <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/40 shadow-lg shadow-slate-200/60 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-4 flex flex-col h-full">
            <div className="mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Avg Drawdown
              </p>
            </div>
            <div className="flex-1 h-32 min-h-[7rem] relative w-full">
              {!mounted ? (
                <div className="w-full h-full flex items-center justify-center">
                  <BouncePulse size="md" />
                </div>
              ) : totalTrades === 0 ? (
                <div className="w-full h-full flex items-center justify-center rounded-lg bg-slate-100/50 dark:bg-slate-800/30">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">No trades yet</p>
                </div>
              ) : (
                <SummaryHalfGauge
                  variant="avgDrawdown"
                  valueNormalized={normalizedAverageDrawdown}
                  centerLabel={`${averageDrawdown.toFixed(2)}%`}
                  minLabel="0%"
                  maxLabel="20%"
                  rawValueForTooltip={averageDrawdown}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trade cards section */}
      <div className="mt-6 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Trades</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {totalTrades} trade{totalTrades !== 1 ? 's' : ''} matching these filters
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 whitespace-nowrap">
                Sort by:
              </span>
              <Select
                value={sortField}
                onValueChange={(value) => setSortField(value as 'trade_date' | 'market' | 'outcome')}
              >
                <SelectTrigger
                  className="flex w-32 h-8 text-xs rounded-xl border border-slate-200/70 dark:border-slate-700/50 !bg-slate-50/50 dark:!bg-slate-800/30 backdrop-blur-xl shadow-none themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
                  suppressHydrationWarning
                >
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent className="z-[100] rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg text-slate-900 dark:text-slate-50">
                  <SelectItem value="trade_date">Date</SelectItem>
                  <SelectItem value="market">Market</SelectItem>
                  <SelectItem value="outcome">Outcome</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 whitespace-nowrap">
              View:
            </span>
            <div className="inline-flex h-8 items-center rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-none p-0.5">
              <button
                type="button"
                onClick={() => setCardViewMode('grid-2')}
                className={cn(
                  'rounded-lg h-6 px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                  cardViewMode === 'grid-2'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                )}
                aria-label="2 cards per row"
                aria-pressed={cardViewMode === 'grid-2'}
              >
                <Columns2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCardViewMode('grid-4')}
                className={cn(
                  'rounded-lg h-6 px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                  cardViewMode === 'grid-4'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                )}
                aria-label="4 cards per row"
                aria-pressed={cardViewMode === 'grid-4'}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCardViewMode('split')}
                className={cn(
                  'rounded-lg h-6 px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                  cardViewMode === 'split'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                )}
                aria-label="Split view"
                aria-pressed={cardViewMode === 'split'}
              >
                <PanelLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCardViewMode('table')}
                className={cn(
                  'rounded-lg h-6 px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                  cardViewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                )}
                aria-label="Table view"
                aria-pressed={cardViewMode === 'table'}
              >
                Table
              </button>
            </div>
          </div>
        </div>
        <TradeCardsView
          trades={sortedTrades}
          resetKey={sortField}
          onTradeUpdated={() => {}}
          totalFilteredCount={trades.length}
          cardViewMode={cardViewMode}
          onCardViewModeChange={setCardViewMode}
          suppressHeaderControls
        />
      </div>
    </div>
  );
}
