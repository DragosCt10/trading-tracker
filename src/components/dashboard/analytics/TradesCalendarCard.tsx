'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trade } from '@/types/trade';
import { cn } from '@/lib/utils';

/**
 * Parse trade_date string to a local Date object, avoiding timezone issues
 * Handles both ISO strings and date-only strings (YYYY-MM-DD)
 */
function parseTradeDate(tradeDate: string | Date): Date {
  if (tradeDate instanceof Date) {
    return tradeDate;
  }
  
  // If it's a date-only string (YYYY-MM-DD), parse it as local date
  if (typeof tradeDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(tradeDate)) {
    const [year, month, day] = tradeDate.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  
  // For ISO strings with time, parse normally
  return new Date(tradeDate);
}

/* ---------------------------------------------------------
 * Constants & helpers
 * ------------------------------------------------------ */

export function getDaysInMonthForDate(date: Date): Date[] {
  return eachDayOfInterval({
    start: startOfMonth(date),
    end: endOfMonth(date),
  });
}

export function splitMonthIntoFourRanges(date: Date): Date[][] {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const daysInMonth = eachDayOfInterval({ start, end });
  const totalDays = daysInMonth.length;

  const ranges: Date[][] = [];
  const baseSize = Math.floor(totalDays / 4);
  let remainder = totalDays % 4;
  let currentIndex = 0;

  for (let i = 0; i < 4; i++) {
    const size = baseSize + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    ranges.push(daysInMonth.slice(currentIndex, currentIndex + size));
    currentIndex += size;
  }

  return ranges;
}

export function buildWeeklyStats(
  currentDate: Date,
  calendarMonthTrades: Trade[],
  selectedMarket: string,
  accountBalance: number
) {
  const weekRanges = splitMonthIntoFourRanges(currentDate);

  return weekRanges.map((days, idx) => {
    const trades = days.flatMap((day) =>
      calendarMonthTrades.filter(
        (trade) =>
          format(parseTradeDate(trade.trade_date), 'yyyy-MM-dd') ===
          format(day, 'yyyy-MM-dd')
      )
    );

    const filteredTrades =
      selectedMarket === 'all'
        ? trades
        : trades.filter((t) => t.market === selectedMarket);

    const nonBETrades = filteredTrades.filter((t) => !t.break_even);
    const beTrades = filteredTrades.filter((t) => t.break_even);

    const totalProfit = nonBETrades.reduce(
      (sum, trade) => sum + (trade.calculated_profit || 0),
      0
    );

    const wins = nonBETrades.filter(
      (t) => t.trade_outcome === 'Win'
    ).length;

    const losses = nonBETrades.filter(
      (t) => t.trade_outcome === 'Lose'
    ).length;

    const beCount = beTrades.length;

    const weekLabel = `${format(days[0], 'd MMM')} - ${format(
      days[days.length - 1],
      'd MMM'
    )}`;

    const pnlPercent =
      accountBalance > 0 ? (totalProfit / accountBalance) * 100 : 0;

    return {
      totalProfit,
      wins,
      losses,
      beCount,
      weekLabel,
      pnlPercent,
      index: idx,
    };
  });
}

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

  /** Called when user clicks to view a trade's details (e.g. open TradeDetailsModal) */
  onTradeClick?: (trade: Trade) => void;
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
  onTradeClick,
}) => {
  const balance = accountBalance || 1;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const daysInMonth = getDaysInMonth();
  const firstDay = daysInMonth[0];

  const firstDayOfWeek = firstDay.getDay(); // 0 = Sun
  const mondayBasedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const emptyCells = Array(mondayBasedFirstDay).fill(null);

  return (
    <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous month"
          disabled={!canNavigateMonth('prev')}
          onClick={() => onMonthNavigate('prev')}
          className={cn(
            'h-9 w-9 rounded-xl border border-slate-200/70 dark:border-slate-700/70 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-200/80 dark:hover:bg-slate-700/60 hover:border-slate-300/80 dark:hover:border-slate-600/80 transition-all duration-200',
            !canNavigateMonth('prev') &&
              'cursor-not-allowed text-slate-400 dark:text-slate-600 hover:bg-slate-100/60 dark:hover:bg-slate-900/40 hover:border-slate-200/70 dark:hover:border-slate-700/70',
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <CardTitle className="text-xl font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
          {format(currentDate, 'MMMM yyyy')}
        </CardTitle>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Next month"
          disabled={!canNavigateMonth('next')}
          onClick={() => onMonthNavigate('next')}
          className={cn(
            'h-9 w-9 rounded-xl border border-slate-200/70 dark:border-slate-700/70 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-200/80 dark:hover:bg-slate-700/60 hover:border-slate-300/80 dark:hover:border-slate-600/80 transition-all duration-200',
            !canNavigateMonth('next') &&
              'cursor-not-allowed text-slate-400 dark:text-slate-600 hover:bg-slate-100/60 dark:hover:bg-slate-900/40 hover:border-slate-200/70 dark:hover:border-slate-700/70',
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
                className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/40 backdrop-blur-sm px-5 py-4 flex flex-col justify-between shadow-none rounded-2xl mb-4"
              >
                {/* Header: Week + trades pill */}
                <div className="flex items-start justify-between">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {`Week ${idx + 1}`}
                  </div>
                  <span className="inline-flex items-center rounded-full bg-slate-100/80 dark:bg-slate-700/50 border border-slate-200/60 dark:border-slate-600/50 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                    {mounted ? (week.wins + week.losses + week.beCount) : '\u2014'} trades
                  </span>
                </div>

                {/* Body rows – same structure as Risk card; defer values until mounted to avoid hydration mismatch */}
                <div className="mt-4 space-y-2">
                  {/* Profit row */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Profit</span>
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        mounted && week.totalProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : mounted && week.totalProfit < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"
                      )}
                    >
                      {mounted ? `${currencySymbol}${week.totalProfit.toFixed(2)}` : '\u2014'}
                    </span>
                  </div>

                  {/* Wins / Losses / BE row */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Results</span>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      <span className="text-emerald-600 dark:text-emerald-400">W: {mounted ? week.wins : '\u2014'}</span>
                      <span className="mx-1.5 text-slate-400 dark:text-slate-600">·</span>
                      <span className="text-rose-600 dark:text-rose-400">L: {mounted ? week.losses : '\u2014'}</span>
                      <span className="mx-1.5 text-slate-400 dark:text-slate-600">·</span>
                      <span className="text-slate-500 dark:text-slate-400">BE: {mounted ? week.beCount : '\u2014'}</span>
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="mt-2 border-t border-slate-200/60 dark:border-slate-700/50" />

                  {/* P&L % row – styled like Win Rate in the Risk card */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-slate-500 dark:text-slate-400">P&amp;L</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {mounted ? `${pnlPercent.toFixed(2)}%` : '\u2014'}
                    </span>
                  </div>
                </div>

                {/* Week label (date range) */}
                <div className="mt-3 text-center text-xs font-medium text-slate-400 dark:text-slate-500">
                  {mounted ? week.weekLabel : '\u2014'}
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
                className="p-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide"
              >
                {day}
              </div>
            ))}

            {[...emptyCells, ...daysInMonth].map((date, index) => {
              if (!date) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-[80px] rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/20 p-3"
                  />
                );
              }

              // All trades on this day
              const dayTrades = calendarMonthTrades.filter((trade) => {
                const tradeDate = parseTradeDate(trade.trade_date);
                const tradeDateStr = format(tradeDate, 'yyyy-MM-dd');
                const dateStr = format(date, 'yyyy-MM-dd');
                const matches = tradeDateStr === dateStr;
                
                return matches;
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

              // Filter out all pure BE trades
              const validTradesForPNL = filteredDayTrades.filter(
                (trade) => !trade.break_even // ignore all BE completely
              );

              // Profit (€)
              const displayProfit = validTradesForPNL.reduce((sum, trade) => {
                return sum + (trade.calculated_profit || 0);
              }, 0);

              // Percentage (only non-BE %)
              const totalPnLPercentage = validTradesForPNL.reduce((sum, trade) => {
                return sum +
                  (typeof trade.pnl_percentage === 'number'
                    ? trade.pnl_percentage
                    : 0);
              }, 0);

              const baseColor =
                displayProfit > 0
                  ? 'bg-emerald-50/80 dark:bg-emerald-900/20 border border-emerald-200/80 dark:border-emerald-700/50 hover:bg-emerald-100/90 dark:hover:bg-emerald-900/30 hover:border-emerald-300/80 dark:hover:border-emerald-600/60'
                  : displayProfit < 0
                  ? 'bg-rose-50/80 dark:bg-rose-900/20 border border-rose-200/80 dark:border-rose-700/50 hover:bg-rose-100/90 dark:hover:bg-rose-900/30 hover:border-rose-300/80 dark:hover:border-rose-600/60'
                  : hasBE && beOutcome === 'Win'
                  ? 'bg-emerald-50/80 dark:bg-emerald-900/20 border border-emerald-200/80 dark:border-emerald-700/50 hover:bg-emerald-100/90 dark:hover:bg-emerald-900/30 hover:border-emerald-300/80 dark:hover:border-emerald-600/60'
                  : hasBE && beOutcome === 'Lose'
                  ? 'bg-rose-50/80 dark:bg-rose-900/20 border border-rose-200/80 dark:border-rose-700/50 hover:bg-rose-100/90 dark:hover:bg-rose-900/30 hover:border-rose-300/80 dark:hover:border-rose-600/60'
                  : 'bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200/60 dark:border-slate-700/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/30 hover:border-slate-300/80 dark:hover:border-slate-600/60';

              const dayCellContent = (
                <>
                  <div className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {format(date, 'd')}
                  </div>

                  {mounted && hasBE && (
                    <div className="absolute right-2.5 top-3.5 px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700/60 border border-slate-300/60 dark:border-slate-600/50 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {beTrades.length} BE
                    </div>
                  )}

                  {filteredDayTrades.length > 0 && (
                    <>
                      {/* --- CELL CONTENT --- */}
                      <div className="text-xs space-y-1">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {filteredDayTrades.length} trade
                          {filteredDayTrades.length !== 1 ? 's' : ''}
                        </div>
                        <div className="hidden md:flex md:flex-col md:space-y-0.5">
                          <div
                            className={cn(
                              'font-semibold',
                              displayProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                            )}
                          >
                            {currencySymbol}
                            {displayProfit.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="hidden md:block absolute bottom-3 right-3 text-xs font-semibold">
                        <span
                          className={
                            totalPnLPercentage >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
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

              const cellDiv = (
                <div
                  className={cn(
                    'group relative min-h-[80px] rounded-xl p-3 transition-all duration-200',
                    !mounted ? 'bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200/60 dark:border-slate-700/50' : [filteredDayTrades.length > 0 && 'cursor-pointer', baseColor],
                  )}
                  {...(mounted && filteredDayTrades.length > 0 ? { tabIndex: 0 } : {})}
                >
                  {!mounted ? (
                    <><div className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{format(date, 'd')}</div><div className="text-xs font-medium text-slate-500 dark:text-slate-400">—</div></>
                  ) : (
                    dayCellContent
                  )}
                </div>
              );

              if (!mounted) {
                return <React.Fragment key={date.toString()}>{cellDiv}</React.Fragment>;
              }

              if (filteredDayTrades.length > 0) {
                return (
                  <Tooltip key={date.toString()} delayDuration={160}>
                    <TooltipTrigger asChild>
                      {cellDiv}
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      align="center"
                      className={cn(
                        'w-48 p-4 text-xs bg-white/95 dark:bg-slate-800/98 border border-slate-200/60 dark:border-slate-600/50 text-slate-900 dark:text-slate-100 shadow-2xl dark:shadow-slate-900/50 rounded-2xl backdrop-blur-xl space-y-1.5'
                      )}
                      sideOffset={6}
                    >
                      {/* Existing list of trades (all breakpoints) */}
                      {filteredDayTrades.map((trade, i) => (
                        <button
                          key={trade.id ?? i}
                          type="button"
                          onClick={
                            onTradeClick
                              ? (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onTradeClick(trade);
                                }
                              : undefined
                          }
                          disabled={!onTradeClick}
                          className={cn(
                            'flex w-full cursor-pointer items-center gap-2 rounded-lg py-1.5 px-1 -mx-1 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 focus:ring-offset-1',
                            onTradeClick &&
                              'hover:bg-slate-100/80 dark:hover:bg-slate-700/40',
                            !onTradeClick && 'cursor-default'
                          )}
                          title={onTradeClick ? 'View trade details' : undefined}
                          aria-label={onTradeClick ? `View details for ${trade.market} trade` : undefined}
                        >
                          {onTradeClick && (
                            <Eye className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
                          )}
                          <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900 dark:text-slate-50 truncate">
                              {trade.market}
                            </span>
                            <span
                              className={cn(
                                'font-semibold shrink-0',
                                trade.break_even
                                  ? 'text-slate-500 dark:text-slate-400'
                                  : trade.calculated_profit &&
                                    trade.calculated_profit >= 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400',
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
                        </button>
                      ))}

                      <div className="my-2.5 border-t border-slate-200/60 dark:border-slate-600/40 md:hidden" />

                      {/* Summary rows visible only on small screens */}
                      <div className="flex items-center justify-between md:hidden pt-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">Profit</span>
                        <span
                          className={cn(
                            'font-semibold',
                            displayProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                          )}
                        >
                          {currencySymbol}
                          {displayProfit.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between md:hidden pt-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">P&amp;L</span>
                        <span
                          className={cn(
                            'font-semibold',
                            totalPnLPercentage >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
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

              // No trades - no tooltip (same cell div, no tabIndex)
              return <React.Fragment key={date.toString()}>{cellDiv}</React.Fragment>;
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};
