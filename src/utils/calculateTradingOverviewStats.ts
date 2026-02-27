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

export function calculateTradingOverviewStats(trades: Trade[]): TradingOverviewStats {
  // Calculate all stats from trades
  const nonBETrades = trades.filter((t) => !t.break_even);
  const beTrades = trades.filter((t) => t.break_even);

  // Base wins/losses from non-BE trades
  const wins = nonBETrades.filter((t) => t.trade_outcome === 'Win').length;
  const losses = nonBETrades.filter((t) => t.trade_outcome === 'Lose').length;

  // BE trades: single bucket
  const beTradesCount = beTrades.length;

  const totalTrades = trades.length;
  const totalWins = wins;
  const totalLosses = losses;

  const totalProfit = trades.reduce((sum, t) => sum + (t.calculated_profit || 0), 0);
  const averageProfit = totalTrades > 0 ? totalProfit / totalTrades : 0;

  // Win rate (excluding BE trades entirely)
  const nonBETotal = wins + losses;
  const winRate = nonBETotal > 0 ? (wins / nonBETotal) * 100 : 0;

  // Win rate with BE: wins as % of all trades
  const winRateWithBE = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

  // Streaks: use only non-BE trades so BE (with or without final result) never affects streaks
  const { currentStreak, maxWinningStreak, maxLosingStreak } = calculateStreaks(nonBETrades);
  
  // Calculate average days between trades
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
  );
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
