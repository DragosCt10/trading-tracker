'use client';

import {
  LayoutGrid,
  TrendingUp,
  Columns2,
  PanelLeft,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EquityCurveChart } from '@/components/dashboard/analytics/EquityCurveChart';
import { TotalTradesDonut } from '@/components/dashboard/analytics/TotalTradesChartCard';
import { SummaryHalfGauge } from '@/components/dashboard/analytics/SummaryHalfGauge';
import { AvgWinLossCard } from '@/components/dashboard/analytics/AvgWinLossCard';
import { ExpectancyCard } from '@/components/dashboard/analytics/ExpectancyCard';
import { RecoveryFactorChart } from '@/components/dashboard/analytics/RecoveryFactorChart';
import { TradeCard } from '@/components/trades/TradeCard';
import { MOCK_EQUITY, MOCK_DASHBOARD_TRADES, DASHBOARD_CARD_CLASS } from './mockData';

const noop = () => {};

export function DashboardMockup() {
  const netPnl = MOCK_DASHBOARD_TRADES.reduce((s, t) => s + (t.calculated_profit ?? 0), 0);
  const pnlPct = (netPnl / 50000) * 100;
  const wins = MOCK_DASHBOARD_TRADES.filter((t) => t.trade_outcome === 'Win').length;
  const losses = MOCK_DASHBOARD_TRADES.filter((t) => t.trade_outcome === 'Lose').length;
  const winRate = (wins / MOCK_DASHBOARD_TRADES.length) * 100;

  return (
    <div className="rounded-2xl border border-slate-700/50 backdrop-blur-sm shadow-md overflow-hidden">
      {/* Header */}
      <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-start gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg themed-header-icon-box shrink-0">
                <LayoutGrid className="h-4 w-4" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Long DAX Morning
              </h3>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {['Long', 'DAX', 'London', 'Win', 'Q1', 'Conf: 4', 'Executed'].map((pill) => (
                <span
                  key={pill}
                  className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-200/70 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300"
                >
                  {pill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="px-5 sm:px-6 py-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Net P&L */}
          <Card className={DASHBOARD_CARD_CLASS}>
            <CardContent className="p-4 flex flex-col h-full">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Net P&amp;L</p>
                  <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                    ${netPnl.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    +{pnlPct.toFixed(2)}%
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-[80px]">
                <EquityCurveChart
                  data={MOCK_EQUITY}
                  currencySymbol="$"
                  hasTrades
                  isLoading={false}
                  variant="card"
                  hideAxisLabels
                />
              </div>
            </CardContent>
          </Card>

          {/* Total Trades */}
          <Card className={DASHBOARD_CARD_CLASS}>
            <CardContent className="p-4 flex flex-col h-full">
              <div className="mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Total Trades</p>
              </div>
              <div className="flex-1 h-32 min-h-[7rem] w-full">
                <TotalTradesDonut
                  totalTrades={MOCK_DASHBOARD_TRADES.length}
                  wins={wins}
                  losses={losses}
                  beTrades={0}
                  variant="compact"
                />
              </div>
            </CardContent>
          </Card>

          {/* Win Rate */}
          <Card className={DASHBOARD_CARD_CLASS}>
            <CardContent className="p-4 flex flex-col h-full">
              <div className="mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Win Rate</p>
              </div>
              <div className="flex-1 h-32 min-h-[7rem] relative w-full">
                <SummaryHalfGauge
                  variant="winRate"
                  valueNormalized={winRate}
                  centerLabel={`${winRate.toFixed(0)}%`}
                  minLabel="0%"
                  maxLabel="100%"
                />
              </div>
            </CardContent>
          </Card>

          {/* Avg Drawdown */}
          <Card className={DASHBOARD_CARD_CLASS}>
            <CardContent className="p-4 flex flex-col h-full">
              <div className="mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Avg Drawdown</p>
              </div>
              <div className="flex-1 h-32 min-h-[7rem] relative w-full">
                <SummaryHalfGauge
                  variant="avgDrawdown"
                  valueNormalized={2.25}
                  centerLabel="0.45%"
                  minLabel="0%"
                  maxLabel="20%"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Second row */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
          <AvgWinLossCard trades={MOCK_DASHBOARD_TRADES} currencySymbol="$" isPro />
          <ExpectancyCard trades={MOCK_DASHBOARD_TRADES} currencySymbol="$" isPro />
          <RecoveryFactorChart recoveryFactor={4.8} isPro />
        </div>

        {/* Trades section -- exact same controls as CustomStatDetailView */}
        <div className="mt-6 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Trades</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {MOCK_DASHBOARD_TRADES.length} trades matching these filters
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 whitespace-nowrap">Sort by:</span>
                <span className="inline-flex items-center h-8 px-3 text-xs rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 text-slate-900 dark:text-slate-50">
                  Date
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 whitespace-nowrap">View:</span>
              <div className="inline-flex h-8 items-center rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-none p-0.5">
                <span className="rounded-lg h-6 px-2.5 py-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <Columns2 className="h-4 w-4" />
                </span>
                <span className="rounded-lg h-6 px-2.5 py-1 text-xs font-medium bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm">
                  <LayoutGrid className="h-4 w-4" />
                </span>
                <span className="rounded-lg h-6 px-2.5 py-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <PanelLeft className="h-4 w-4" />
                </span>
                <span className="rounded-lg h-6 px-2.5 py-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Table
                </span>
              </div>
            </div>
          </div>

          {/* Trade cards grid */}
          <div className="grid gap-4 items-stretch [&>*]:h-full grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {MOCK_DASHBOARD_TRADES.map((trade) => (
              <TradeCard
                key={trade.id}
                trade={trade}
                onOpenModal={noop}
                disableImageLink
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
