'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  LayoutGrid,
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
import { buildEquityPointsFromTrades } from '@/utils/equityPoints';
import { TotalTradesDonut } from '@/components/dashboard/analytics/TotalTradesChartCard';
import { SummaryHalfGauge } from '@/components/dashboard/analytics/SummaryHalfGauge';
import { TradeCardsView } from '@/components/trades/TradeCardsView';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import { calculateWinRates } from '@/utils/calculateWinRates';
import { calculateAverageDrawdown, calculateMaxDrawdown, calculateAveragePnLPercentage, computeRecoveryFactorAndDrawdownCount } from '@/utils/analyticsCalculations';
import { useBECalc } from '@/contexts/BECalcContext';
import { AvgWinLossCard } from '@/components/dashboard/analytics/AvgWinLossCard';
import { ExpectancyCard } from '@/components/dashboard/analytics/ExpectancyCard';
import { RecoveryFactorChart } from '@/components/dashboard/analytics/RecoveryFactorChart';
import { useDarkMode } from '@/hooks/useDarkMode';
import { cn, formatPercent, roundToCents } from '@/lib/utils';
import { CARD_BASE_CLASSES } from '@/constants/styles';
import type { Trade } from '@/types/trade';
import type { CustomStatConfig } from '@/types/customStats';
import { FilterPillList } from '@/components/shared/FilterPillList';
import { PnLBadge } from '@/components/shared/PnLBadge';
import type { SavedTag } from '@/types/saved-tag';

type CardViewMode = 'grid-4' | 'grid-2' | 'split' | 'table';

interface CustomStatDetailViewProps {
  config: CustomStatConfig;
  trades: Trade[];
  currencySymbol: string;
  accountBalance: number | null;
  savedTags?: SavedTag[];
  onBack: () => void;
}

export function CustomStatDetailView({
  config,
  trades,
  currencySymbol,
  accountBalance,
  savedTags = [],
  onBack,
}: CustomStatDetailViewProps) {
  const { beCalcEnabled } = useBECalc();
  const { mounted } = useDarkMode();
  const [sortField, setSortField] = useState<'trade_date' | 'market' | 'outcome'>('trade_date');
  const [cardViewMode, setCardViewMode] = useState<CardViewMode>('grid-4');

  const hasFilters = useMemo(
    () => Object.values(config.filters).some((v) => v !== undefined && v !== null && v !== ''),
    [config.filters]
  );

  const netCumulativePnl = useMemo(
    () => trades.reduce((sum, trade) => sum + (trade.calculated_profit ?? 0), 0),
    [trades]
  );
  const pnlPercent = useMemo(() => {
    const base = accountBalance || 1;
    return (netCumulativePnl / base) * 100;
  }, [netCumulativePnl, accountBalance]);

  const equityChartData = useMemo(() => buildEquityPointsFromTrades(trades), [trades]);
  const hasEquityData = equityChartData.length > 0;

  const { totalTrades, wins, losses, beTrades } = useMemo(() => {
    let winsCount = 0;
    let lossesCount = 0;
    let beCount = 0;

    for (const trade of trades) {
      if (trade.break_even || trade.trade_outcome === 'BE') {
        beCount += 1;
      } else if (trade.trade_outcome === 'Win') {
        winsCount += 1;
      } else if (trade.trade_outcome === 'Lose') {
        lossesCount += 1;
      }
    }

    return {
      totalTrades: trades.length,
      wins: winsCount,
      losses: lossesCount,
      beTrades: beCount,
    };
  }, [trades]);

  const { winRate, winRateWithBE } = useMemo(() => calculateWinRates(trades), [trades]);
  const effectiveWinRate = beCalcEnabled ? winRateWithBE : winRate;

  const tradesForDrawdown = useMemo(() => trades.filter((t) => t.executed === true), [trades]);
  const averageDrawdown = useMemo(
    () => calculateAverageDrawdown(tradesForDrawdown, accountBalance || 0),
    [tradesForDrawdown, accountBalance]
  );
  const normalizedAverageDrawdown = useMemo(() => {
    const capped = Math.max(0, Math.min(averageDrawdown, 20));
    return (capped / 20) * 100;
  }, [averageDrawdown]);

  const recoveryFactor = useMemo(() => {
    const pnlPct = calculateAveragePnLPercentage(trades, accountBalance);
    const maxDD = calculateMaxDrawdown(trades, accountBalance ?? 0);
    return computeRecoveryFactorAndDrawdownCount({ averagePnLPercentage: pnlPct, maxDrawdown: maxDD }).recoveryFactor;
  }, [trades, accountBalance]);

  const sortedTrades = useMemo(() => {
    const list = [...trades];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'outcome') {
        const aV = (a.break_even || a.trade_outcome === 'BE') ? 'BE' : (a.trade_outcome ?? '');
        const bV = (b.break_even || b.trade_outcome === 'BE') ? 'BE' : (b.trade_outcome ?? '');
        cmp = aV.localeCompare(bV);
      } else if (sortField === 'trade_date') {
        cmp = b.trade_date.localeCompare(a.trade_date);
      } else {
        // Remaining case: sortField === 'market'
        const aValue = a.market ?? '';
        const bValue = b.market ?? '';
        cmp = aValue.localeCompare(bValue);
      }
      if (cmp !== 0) return cmp;
      return (a.id ?? '').localeCompare(b.id ?? '');
    });
    return list;
  }, [trades, sortField]);

  const handleTradeUpdated = useCallback(() => {}, []);

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
            {hasFilters ? (
              <div className="mt-2">
                <FilterPillList filters={config.filters} savedTags={savedTags} />
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
            className="mt-0.5 inline-flex items-center gap-1.5 h-8 px-3 rounded-xl themed-btn-primary cursor-pointer relative overflow-hidden text-white font-semibold border-0 text-xs group [&_svg]:text-white"
            aria-label="Back to Custom Stats"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Custom Stats</span>
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

        {/* Net P&L */}
        <Card className={cn(CARD_BASE_CLASSES, 'relative overflow-hidden')}>
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
              <PnLBadge value={pnlPercent} size="sm" />
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
        <Card className={cn(CARD_BASE_CLASSES, 'relative overflow-hidden')}>
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
        <Card className={cn(CARD_BASE_CLASSES, 'relative overflow-hidden')}>
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
        <Card className={cn(CARD_BASE_CLASSES, 'relative overflow-hidden')}>
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

      {/* Second row: Avg Win/Loss, Expectancy, Recovery Factor */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
        <AvgWinLossCard trades={trades} currencySymbol={currencySymbol} isPro />
        <ExpectancyCard trades={trades} currencySymbol={currencySymbol} isPro />
        <RecoveryFactorChart recoveryFactor={recoveryFactor} isPro />
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
          onTradeUpdated={handleTradeUpdated}
          totalFilteredCount={trades.length}
          cardViewMode={cardViewMode}
          onCardViewModeChange={setCardViewMode}
          suppressHeaderControls
          savedTags={savedTags}
        />
      </div>
    </div>
  );
}
