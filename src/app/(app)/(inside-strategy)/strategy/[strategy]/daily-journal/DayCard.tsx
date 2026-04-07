'use client';

import { ChevronRight, Crown, Infinity as InfinityIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, formatPercent } from '@/lib/utils';
import { CARD_BASE_CLASSES } from '@/constants/styles';
import { formatTradeTimeForDisplay } from '@/utils/formatTradeTime';
import { EquityCurveChart } from '@/components/dashboard/analytics/EquityCurveChart';
import { ScreensCarouselCell } from '@/components/trades/ScreensCarouselCell';
import { OutcomeChips } from '@/components/trades/OutcomeChips';
import type { Trade } from '@/types/trade';

export type DayGroup = {
  date: string;
  trades: Trade[];
  totalProfit: number;
  dayChartData: { date: string | Date; profit: number }[];
  totalTrades: number;
  winners: number;
  losers: number;
  breakEven: number;
  winRate: number;
  winRateWithBE: number;
  totalPnLPct: number;
  profitFactor: number;
  isValidProfitFactor: boolean;
  consistency: number;
  formattedDate: string;
};

interface DayCardProps {
  group: DayGroup;
  isOpen: boolean;
  isPro: boolean;
  currencySymbol: string;
  beCalcEnabled: boolean;
  mounted: boolean;
  onToggle: (date: string, isOpen: boolean) => void;
  onOpenTradeDetails: (trade: Trade) => void;
  onOpenNotes: (notes: string) => void;
}

export function DayCard({
  group,
  isOpen,
  isPro,
  currencySymbol,
  beCalcEnabled,
  mounted,
  onToggle,
  onOpenTradeDetails,
  onOpenNotes,
}: DayCardProps) {
  const hasTrades = group.totalTrades > 0;

  const cardContent = (
    <Card className={cn(CARD_BASE_CLASSES, 'overflow-hidden')}>
      {!isPro && (
        <>
          <span className="absolute right-4 top-4 z-20 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
            <Crown className="w-3 h-3" /> PRO
          </span>
          <div className="pointer-events-none absolute inset-0 z-10 bg-white/10 dark:bg-slate-950/10 backdrop-blur-[2px]" />
        </>
      )}

      <div
        className={cn(
          'relative',
          !isPro && 'blur-[3px] opacity-70 pointer-events-none select-none'
        )}
      >
        {/* Day header */}
        <div className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors">
          <div className="flex items-center gap-3">
            <ChevronRight
              className={cn(
                'h-4 w-4 text-slate-500 dark:text-slate-400 transition-transform duration-200',
                isOpen ? 'rotate-90' : 'rotate-0'
              )}
            />
            <div className="gap-1 flex flex-col">
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {group.formattedDate}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {group.trades.length} trades • P&L:{' '}
                <span className={group.totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                  <strong>
                    {currencySymbol}
                    {formatPercent(group.totalProfit)}
                  </strong>
                </span>
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              onToggle(group.date, isOpen);
            }}
            className="h-8 rounded-xl px-3 text-xs cursor-pointer transition-colors duration-200 border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 font-medium"
          >
            {isOpen ? 'Collapse' : 'Expand'}
          </Button>
        </div>

        {/* Equity curve + header stats */}
        <div className="px-5 py-4">
          <div className="flex flex-col gap-10 md:flex-row md:items-center">
            <div className="md:w-1/3 h-32 flex items-center">
              <EquityCurveChart
                data={group.dayChartData}
                currencySymbol={currencySymbol}
                hasTrades={hasTrades}
                isLoading={!mounted}
                variant="card"
                hideAxisLabels
              />
            </div>
            <div className="flex-1 md:flex md:items-center">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-20 gap-y-6 text-xs sm:text-sm w-full">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Total Trades
                  </p>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {group.totalTrades}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Wins
                  </p>
                  <p className="text-base font-semibold text-emerald-500">
                    {group.winners}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Losses
                  </p>
                  <p className="text-base font-semibold text-rose-500">
                    {group.losers}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    BE
                  </p>
                  <p className="text-base font-semibold text-slate-600 dark:text-slate-300">
                    {group.breakEven}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    P&L %
                  </p>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {formatPercent(group.totalPnLPct)}%
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Winrate
                  </p>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {formatPercent(beCalcEnabled ? group.winRateWithBE : group.winRate)}%
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Profit Factor
                  </p>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {group.isValidProfitFactor ? (
                      group.profitFactor.toFixed(2)
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <InfinityIcon className="h-4 w-4" aria-label="Infinite profit factor" />
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Consistency
                  </p>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {formatPercent(group.consistency)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible trade table — CSS Grid animation */}
        <div
          className={cn(
            'border-t border-slate-200/70 dark:border-slate-700/60 grid transition-[grid-template-rows] duration-300 ease-in-out',
            isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          )}
        >
          <div className="overflow-hidden">
            <div className="px-5 py-4">
              <div className="relative overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200/30 dark:divide-slate-700/30">
                  <thead className="bg-transparent border-b border-slate-200/70 dark:border-slate-700/70">
                    <tr>
                      <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Screens
                      </th>
                      <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Market
                      </th>
                      <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        P&L
                      </th>
                      <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Direction
                      </th>
                      <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        RR
                      </th>
                      <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Outcome
                      </th>
                      <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Risk
                      </th>
                      <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Notes
                      </th>
                      <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-transparent divide-y divide-slate-200/30 dark:divide-slate-700/30">
                    {group.trades.map((trade, index) => {
                      const profit = trade.calculated_profit ?? 0;
                      return (
                        <tr
                          key={
                            trade.id
                              ? `${trade.id}-${index}`
                              : `${group.date}-${trade.trade_time}-${trade.market}-${index}`
                          }
                        >
                          <td className="px-3 py-3 whitespace-nowrap align-middle">
                            <ScreensCarouselCell trade={trade} />
                          </td>
                          <td
                            className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm text-slate-700 dark:text-slate-300"
                            suppressHydrationWarning
                          >
                            {formatTradeTimeForDisplay(trade.trade_time)}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100">
                            {trade.market}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                            <span
                              className={
                                profit >= 0 ? 'text-emerald-500 font-semibold' : 'text-rose-500 font-semibold'
                              }
                            >
                              {currencySymbol}
                              {profit.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                            {trade.direction === 'Long' ? (
                              <span className="inline-flex items-center gap-1">
                                <span className="text-emerald-500 dark:text-emerald-400 text-[11px]">↑</span>
                                <span>Long</span>
                              </span>
                            ) : trade.direction === 'Short' ? (
                              <span className="inline-flex items-center gap-1">
                                <span className="text-rose-500 dark:text-rose-400 text-[11px]">↓</span>
                                <span>Short</span>
                              </span>
                            ) : (
                              <span>{trade.direction ?? '—'}</span>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                            {typeof trade.risk_reward_ratio === 'number' && !Number.isNaN(trade.risk_reward_ratio) ? (
                              <span>
                                {trade.risk_reward_ratio.toFixed(2)}
                                <span className="ml-0.5 text-[10px] text-slate-400 dark:text-slate-500">R</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                            <OutcomeChips trade={trade} />
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100">
                            {trade.risk_per_trade}%
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                            {trade.notes ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  onOpenNotes(trade.notes || '');
                                }}
                                className="cursor-pointer text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 underline font-medium transition-colors"
                              >
                                View Notes
                              </button>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">
                                No notes
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                onOpenTradeDetails(trade);
                              }}
                              className="cursor-pointer text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 underline font-medium transition-colors"
                            >
                              Trade Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  if (!isPro) {
    return (
      <Tooltip delayDuration={120}>
        <TooltipTrigger asChild>
          {cardContent}
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          sideOffset={8}
          className="max-w-sm text-xs rounded-2xl p-3 border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50"
        >
          The data shown under the blur card is fictive and for demo purposes only.
        </TooltipContent>
      </Tooltip>
    );
  }

  return cardContent;
}
