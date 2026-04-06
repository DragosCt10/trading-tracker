import { format } from 'date-fns';
import type { Trade } from '@/types/trade';
import type { DayGroup } from './DayCard';
import { calculateProfitFactor, calculateAveragePnLPercentage, calculateDailyConsistency } from '@/utils/analyticsCalculations';
import { calculateWinRates } from '@/utils/calculateWinRates';

/**
 * Per-day equity curve data (one series per day).
 * Expects trades already sorted by trade_time.
 */
export function buildDayChartData(trades: Trade[]) {
  if (!trades.length) return [];

  const dayDate = trades[0].trade_date;
  let cumulative = 0;
  const points = [];

  // Start-of-day baseline so the curve is visible even for a single trade.
  points.push({
    date: new Date(dayDate),
    profit: 0,
  });

  for (const trade of trades) {
    cumulative += trade.calculated_profit ?? 0;
    points.push({
      date: trade.trade_date,
      profit: cumulative,
    });
  }

  return points;
}

export function buildDayGroup(date: string, trades: Trade[], accountBalance: number | null): DayGroup {
  const sortedTrades = trades.slice().sort((a: Trade, b: Trade) => a.trade_time.localeCompare(b.trade_time));
  const totalProfit = sortedTrades.reduce((sum: number, t: Trade) => sum + (t.calculated_profit ?? 0), 0);
  const totalTrades = sortedTrades.length;
  const winners = sortedTrades.filter((t) => !t.break_even && t.trade_outcome === 'Win').length;
  const losers = sortedTrades.filter((t) => !t.break_even && t.trade_outcome === 'Lose').length;
  const breakEven = sortedTrades.filter((t) => t.break_even || t.trade_outcome === 'BE').length;
  const { winRate, winRateWithBE } = calculateWinRates(sortedTrades);
  const totalPnLPct = calculateAveragePnLPercentage(sortedTrades, accountBalance);
  const profitFactor = calculateProfitFactor(sortedTrades, winners, losers);
  const isValidProfitFactor =
    Number.isFinite(profitFactor) && !Number.isNaN(profitFactor);
  const consistency = calculateDailyConsistency(sortedTrades);

  return {
    date,
    trades: sortedTrades,
    totalProfit,
    dayChartData: buildDayChartData(sortedTrades),
    totalTrades,
    winners,
    losers,
    breakEven,
    winRate,
    winRateWithBE,
    totalPnLPct,
    profitFactor,
    isValidProfitFactor,
    consistency,
    formattedDate: format(new Date(date), 'EEE, MMM d, yyyy'),
  };
}
