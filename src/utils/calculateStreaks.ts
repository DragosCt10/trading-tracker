import { Trade } from '@/types/trade';

export interface StreakStats {
  currentStreak: number;
  maxWinningStreak: number;
  maxLosingStreak: number;
}

export function calculateStreaks(trades: Trade[]): StreakStats {
  if (!trades.length) {
    return {
      currentStreak: 0,
      maxWinningStreak: 0,
      maxLosingStreak: 0
    };
  }

  // Sort trades by date in ascending order to calculate streaks chronologically
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
  );

  let currentStreak = 0;
  let maxWinningStreak = 0;
  let maxLosingStreak = 0;
  let currentWinningStreak = 0;
  let currentLosingStreak = 0;

  sortedTrades.forEach((trade) => {
    // Skip BE trades
    if (trade.break_even) {
      return;
    }

    const isWin = trade.trade_outcome === 'Win';
    const isLoss = trade.trade_outcome === 'Lose';

    if (isWin) {
      currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
      currentWinningStreak++;
      currentLosingStreak = 0;
      maxWinningStreak = Math.max(maxWinningStreak, currentWinningStreak);
    } else if (isLoss) {
      currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
      currentLosingStreak++;
      currentWinningStreak = 0;
      maxLosingStreak = Math.max(maxLosingStreak, currentLosingStreak);
    }
  });

  return {
    currentStreak,
    maxWinningStreak,
    maxLosingStreak
  };
}
