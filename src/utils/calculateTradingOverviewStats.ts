import { Trade } from '@/types/trade';
import { calculateStreaks } from '@/utils/calculateStreaks';

export interface TradingOverviewStats {
  totalTrades: number;
  totalWins: number;
  totalLosses: number;
  wins: number;
  losses: number;
  /** Count of trades with outcome BE (break_even). */
  beTradesCount: number;
  totalProfit: number;
  averageProfit: number;
  winRate: number;
  winRateWithBE: number;
  currentStreak: number;
  maxWinningStreak: number;
  maxLosingStreak: number;
  averageDaysBetweenTrades: number;
}

export function calculateTradingOverviewStats(
  trades: Trade[],
  totalProfitFromOverview?: number
): TradingOverviewStats {
  // Single pass: count wins/losses/BE and sum profit simultaneously.
  // Replaces 4 separate filter/reduce passes over the trades array.
  let wins = 0, losses = 0, beTradesCount = 0, totalProfit = 0;
  const nonBETrades: typeof trades = [];
  for (const t of trades) {
    totalProfit += (t.calculated_profit as number) || 0;
    if (t.break_even) {
      beTradesCount++;
    } else {
      nonBETrades.push(t);
      if (t.trade_outcome === 'Win') wins++;
      else if (t.trade_outcome === 'Lose') losses++;
    }
  }

  const totalTrades = trades.length;
  const totalWins = wins;
  const totalLosses = losses;
  const totalProfitToShow = totalProfitFromOverview ?? totalProfit;
  const averageProfit =
    totalProfitFromOverview !== undefined && trades.length > 0
      ? totalProfitToShow / trades.length
      : totalTrades > 0
        ? totalProfit / totalTrades
        : 0;

  // Win rate (excluding BE trades entirely)
  const nonBETotal = wins + losses;
  const winRate = nonBETotal > 0 ? (wins / nonBETotal) * 100 : 0;

  // Win rate with BE: wins as % of all trades
  const winRateWithBE = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

  // Streaks: use only non-BE trades so BE (with or without final result) never affects streaks
  const { currentStreak, maxWinningStreak, maxLosingStreak } = calculateStreaks(nonBETrades);
  
  // Calculate average days between trades.
  // ISO YYYY-MM-DD strings sort lexicographically — no Date() in comparator needed.
  const sortedTrades = [...trades].sort((a, b) => {
    const da = a.trade_date ?? '';
    const db = b.trade_date ?? '';
    return da < db ? -1 : da > db ? 1 : 0;
  });
  let averageDaysBetweenTrades = 0;
  if (sortedTrades.length > 1) {
    const daysBetween: number[] = [];
    for (let i = 1; i < sortedTrades.length; i++) {
      const prevDate = new Date(sortedTrades[i - 1].trade_date);
      const currDate = new Date(sortedTrades[i].trade_date);
      const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      daysBetween.push(diffDays);
    }
    averageDaysBetweenTrades = daysBetween.length > 0
      ? daysBetween.reduce((sum, days) => sum + days, 0) / daysBetween.length
      : 0;
  }

  return {
    totalTrades,
    totalWins,
    totalLosses,
    wins,
    losses,
    beTradesCount,
    totalProfit,
    averageProfit,
    winRate,
    winRateWithBE,
    currentStreak,
    maxWinningStreak,
    maxLosingStreak,
    averageDaysBetweenTrades,
  };
}
