'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trade } from '@/types/trade';
import { cn } from '@/lib/utils';

// Import shadcn tooltip
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface WeeklyStat {
  totalProfit: number;
  wins: number;
  losses: number;
  beCount: number;
  weekLabel: string;
}

type Direction = 'prev' | 'next';

interface TradesCalendarCardProps {
  currentDate: Date;
  onMonthNavigate: (direction: Direction) => void;
  canNavigateMonth: (direction: Direction) => boolean;

  weeklyStats: WeeklyStat[];
  calendarMonthTrades: Trade[];
  selectedMarket: string;
  currencySymbol: string;
  accountBalance?: number | null;

  /** Function returning all Date objects for the visible month */
  getDaysInMonth: () => Date[];
}

export const TradesCalendarCard: React.FC<TradesCalendarCardProps> = ({
  currentDate,
  onMonthNavigate,
  canNavigateMonth,
  weeklyStats,
  calendarMonthTrades,
  selectedMarket,
  currencySymbol,
  accountBalance,
  getDaysInMonth,
}) => {
  const balance = accountBalance || 1;

  const daysInMonth = getDaysInMonth();
  const firstDay = daysInMonth[0];

  const firstDayOfWeek = firstDay.getDay(); // 0 = Sun
  const mondayBasedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const emptyCells = Array(mondayBasedFirstDay).fill(null);

  return (
    <Card className="shadow-none">
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous month"
          disabled={!canNavigateMonth('prev')}
          onClick={() => onMonthNavigate('prev')}
          className={cn(
            'h-9 w-9 rounded-md border border-transparent text-slate-800 shadow-none hover:bg-slate-800/5 hover:border-slate-800/5',
            !canNavigateMonth('prev') &&
              'cursor-not-allowed text-slate-400 hover:bg-transparent hover:border-transparent',
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <CardTitle className="text-xl font-medium text-slate-800">
          {format(currentDate, 'MMMM yyyy')}
        </CardTitle>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Next month"
          disabled={!canNavigateMonth('next')}
          onClick={() => onMonthNavigate('next')}
          className={cn(
            'h-9 w-9 rounded-md border border-transparent text-slate-800 shadow-none hover:bg-slate-800/5 hover:border-slate-800/5',
            !canNavigateMonth('next') &&
              'cursor-not-allowed text-slate-400 hover:bg-transparent hover:border-transparent',
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent>
        {/* Weekly summary row */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {weeklyStats.map((week, idx) => {
            const pnlPercent = ((week.totalProfit / balance) * 100) || 0;

            return (
              <div
                key={idx}
                className="flex flex-col rounded-xl border px-5 py-4 shadow-none mb-4"
              >
                {/* Header: Week + trades pill */}
                <div className="flex items-start justify-between">
                  <div className="text-sm font-medium text-slate-800">
                    {`Week ${idx + 1}`}
                  </div>
                  <span className="inline-flex items-center rounded-full bg-slate-100/70 px-3 py-1 text-xs font-medium text-slate-600">
                    {(week.wins + week.losses + week.beCount)} trades
                  </span>
                </div>

                {/* Body rows – same structure as Risk card */}
                <div className="mt-4 space-y-2">
                  {/* Profit row */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Profit</span>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        week.totalProfit >= 0 ? "text-emerald-500" : "text-red-500"
                      )}
                    >
                      {currencySymbol}
                      {week.totalProfit.toFixed(2)}
                    </span>
                  </div>

                  {/* Wins / Losses / BE row */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Results</span>
                    <span className="text-sm font-medium text-slate-500">
                      <span className="text-emerald-500">W: {week.wins}</span>
                      <span className="mx-1.5 text-slate-500">·</span>
                      <span className="text-red-500">L: {week.losses}</span>
                      <span className="mx-1.5 text-slate-500">·</span>
                      <span className="text-slate-500">BE: {week.beCount}</span>
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="mt-2 border-t border-slate-200" />

                  {/* P&L % row – styled like Win Rate in the Risk card */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-slate-500">P&amp;L</span>
                    <span className="text-sm font-medium text-slate-800">
                      {pnlPercent.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Week label (date range) */}
                <div className="mt-3 text-center text-xs font-medium text-slate-400">
                  {week.weekLabel}
                </div>
              </div>
            );
          })}
        </div>

        {/* TooltipProvider wraps grid for day cell tooltips */}
        <TooltipProvider>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div
                key={day}
                className="p-2 text-center text-sm font-medium text-slate-500"
              >
                {day}
              </div>
            ))}

            {[...emptyCells, ...daysInMonth].map((date, index) => {
              if (!date) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-[80px] rounded-lg border border-slate-100 bg-slate-50 p-3"
                  />
                );
              }

              // All trades on this day
              const dayTrades = calendarMonthTrades.filter((trade) => {
                const tradeDate = new Date(trade.trade_date);
                return (
                  format(tradeDate, 'yyyy-MM-dd') ===
                  format(date, 'yyyy-MM-dd')
                );
              });

              const filteredDayTrades =
                selectedMarket === 'all'
                  ? dayTrades
                  : dayTrades.filter((trade) => trade.market === selectedMarket);

              // Non-BE trades + BE with partials
              const realDayTrades = filteredDayTrades.filter(
                (trade) =>
                  !trade.break_even ||
                  (trade.break_even && trade.partials_taken),
              );

              const beTrades = filteredDayTrades.filter(
                (trade) => trade.break_even,
              );
              const hasBE = beTrades.length > 0;
              const beOutcome =
                beTrades.length > 0 ? beTrades[0].trade_outcome : null;

              const totalPnLPercentage = filteredDayTrades.reduce((sum, trade) => {
                if (trade.break_even) {
                  // completely skip BE trades
                  return sum;
                }

                return (
                  sum +
                  (typeof trade.pnl_percentage === 'number'
                    ? trade.pnl_percentage
                    : 0)
                );
              }, 0);

              const displayProfit = realDayTrades.reduce((sum, trade) => {
                if (trade.break_even && !trade.partials_taken) return sum;
                return sum + (trade.calculated_profit || 0);
              }, 0);

              const baseColor =
                displayProfit > 0
                  ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                  : displayProfit < 0
                  ? 'bg-red-50 border-red-200 hover:bg-red-100'
                  : hasBE && beOutcome === 'Win'
                  ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                  : hasBE && beOutcome === 'Lose'
                  ? 'bg-red-50 border-red-200 hover:bg-red-100'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100';

              const dayCellContent = (
                <>
                  <div className="mb-1 text-sm font-medium text-slate-800">
                    {format(date, 'd')}
                  </div>

                  {hasBE && (
                    <div className="absolute right-2.5 top-3.5 px-1 text-xs font-medium text-slate-800">
                      {beTrades.length} BE
                    </div>
                  )}

                  {filteredDayTrades.length > 0 && (
                    <>
                      {/* --- CELL CONTENT --- */}
                      <div className="text-xs space-y-1">
                        {/* Always visible on all breakpoints */}
                        <div className="font-medium text-slate-800">
                          {filteredDayTrades.length} trade
                          {filteredDayTrades.length !== 1 ? 's' : ''}
                        </div>

                        {/* Profit + P&L only visible from md and up */}
                        <div className="hidden md:flex md:flex-col md:space-y-0.5">
                          <div
                            className={cn(
                              'font-medium',
                              displayProfit >= 0 ? 'text-emerald-500' : 'text-red-500',
                            )}
                          >
                            {currencySymbol}
                            {displayProfit.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Bottom-right P&L badge – only md+ */}
                      <div className="hidden md:block absolute bottom-3 right-3 text-xs font-medium">
                        <span
                          className={
                            totalPnLPercentage >= 0 ? 'text-emerald-500' : 'text-red-500'
                          }
                        >
                          {totalPnLPercentage >= 0 ? '+' : ''}
                          {totalPnLPercentage.toFixed(2)}%
                        </span>
                      </div>
                    </>
                  )}
                </>
              );

              // Only use tooltip if there are trades
              if (filteredDayTrades.length > 0) {
                return (
                  <Tooltip key={date.toString()} delayDuration={160}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'group relative min-h-[80px] rounded-lg border p-3 transition-all duration-200 cursor-pointer',
                          baseColor,
                        )}
                        tabIndex={0}
                        // Accessibility: make cell focusable for keyboard users
                      >
                        {dayCellContent}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      align="center"
                      className={cn(
                        'w-48 p-3 text-xs bg-white border border-slate-200 shadow-none space-y-1'
                      )}
                    >
                      {/* Existing list of trades (all breakpoints) */}
                      {filteredDayTrades.map((trade, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between"
                        >
                          <span className="font-medium text-slate-800">
                            {trade.market}
                          </span>
                          <span
                            className={cn(
                              'font-medium',
                              trade.break_even
                                ? 'text-slate-500'
                                : trade.calculated_profit &&
                                  trade.calculated_profit >= 0
                                ? 'text-emerald-500'
                                : 'text-red-500',
                            )}
                          >
                            {trade.break_even
                              ? trade.trade_outcome === 'Win'
                                ? 'W (BE)'
                                : 'L (BE)'
                              : trade.trade_outcome === 'Win'
                              ? 'W'
                              : 'L'}
                            {!trade.break_even &&
                              trade.pnl_percentage &&
                              ` (${trade.pnl_percentage.toFixed(2)}%)`}
                          </span>
                        </div>
                      ))}

                      <div className="my-2 border-t border-slate-100 md:hidden" />

                      {/* Summary rows visible only on small screens */}
                      <div className="flex items-center justify-between md:hidden">
                        <span className="font-medium text-slate-800">Profit</span>
                        <span
                          className={cn(
                            'font-medium',
                            displayProfit >= 0 ? 'text-emerald-500' : 'text-red-500',
                          )}
                        >
                          {currencySymbol}
                          {displayProfit.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between md:hidden">
                        <span className="font-medium text-slate-700">P&amp;L</span>
                        <span
                          className={cn(
                            'font-medium',
                            totalPnLPercentage >= 0 ? 'text-emerald-500' : 'text-red-500',
                          )}
                        >
                          {totalPnLPercentage >= 0 ? '+' : ''}
                          {totalPnLPercentage.toFixed(2)}%
                        </span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              // No trades - no tooltip
              return (
                <div
                  key={date.toString()}
                  className={cn(
                    'group relative min-h-[80px] rounded-lg border p-3 transition-all duration-200',
                    baseColor,
                  )}
                >
                  {dayCellContent}
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};
