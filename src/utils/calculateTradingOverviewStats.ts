import { Trade } from '@/types/trade';
import { calculateStreaks } from '@/utils/calculateStreaks';

export interface TradingOverviewStats {
  totalTrades: number;
  totalWins: number;
  totalLosses: number;
  wins: number;
  losses: number;
  beWins: number;
  beLosses: number;
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

  // For BE trades, use be_final_result when present to classify them
  const beWins = beTrades.filter((t) => t.be_final_result === 'Win').length;
  const beLosses = beTrades.filter((t) => t.be_final_result === 'Lose').length;

  const totalTrades = trades.length;
  const totalWins = wins + beWins;
  const totalLosses = losses + beLosses;

  const totalProfit = trades.reduce((sum, t) => sum + (t.calculated_profit || 0), 0);
  const averageProfit = totalTrades > 0 ? totalProfit / totalTrades : 0;

  // Win rate (excluding BE trades entirely)
  const nonBETotal = wins + losses;
  const winRate = nonBETotal > 0 ? (wins / nonBETotal) * 100 : 0;

  // Win rate including BE trades that have a final result
  const effectiveTotalWithBE = wins + losses + beWins + beLosses;
  const winRateWithBE =
    effectiveTotalWithBE > 0 ? ((wins + beWins) / effectiveTotalWithBE) * 100 : 0;

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
    beWins,
    beLosses,
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
