import { format } from 'date-fns';
import { Trade } from '@/types/trade';
import type { EquityPoint } from '@/components/dashboard/analytics/EquityCurveChart';

/** Normalize to YYYY-MM-DD for grouping by day */
function toDayKey(tradeDate: string): string {
  const d = new Date(tradeDate);
  return format(d, 'yyyy-MM-dd');
}

/** Aggregate P&L by day, then build cumulative equity (one data point per day). */
function buildDailyEquityChartData(trades: Trade[]): EquityPoint[] {
  const profitByDay = new Map<string, number>();
  for (const t of trades) {
    const day = toDayKey(t.trade_date);
    profitByDay.set(day, (profitByDay.get(day) ?? 0) + (t.calculated_profit ?? 0));
  }

  const sortedDays = Array.from(profitByDay.keys()).sort();
  let cumulative = 0;

  return sortedDays.map((date) => {
    cumulative += profitByDay.get(date) ?? 0;
    return {
      date,
      profit: cumulative,
    };
  });
}

/** Build cumulative equity using each trade (used when all trades are on a single day). */
function buildIntradayEquityChartData(trades: Trade[]): EquityPoint[] {
  const sortedTrades = [...trades].sort((a, b) => {
    const dateA = new Date(a.trade_date).getTime();
    const dateB = new Date(b.trade_date).getTime();
    return dateA - dateB;
  });

  let cumulative = 0;
  return sortedTrades.map((trade) => {
    cumulative += trade.calculated_profit ?? 0;
    return {
      date: trade.trade_date,
      profit: cumulative,
    };
  });
}

/** Build cumulative equity points from a Trade[] using standard card rules. */
export function buildEquityPointsFromTrades(trades: Trade[]): EquityPoint[] {
  if (trades.length === 0) return [];

  const uniqueDays = new Set(trades.map((t) => toDayKey(t.trade_date)));
  const isSingleDay = uniqueDays.size === 1;

  return isSingleDay ? buildIntradayEquityChartData(trades) : buildDailyEquityChartData(trades);
}
