import { Trade } from '@/types/trade';

export interface StreakStats {
  currentStreak: number;
  maxWinningStreak: number;
  maxLosingStreak: number;
}

export interface StreakOptions {
  /** If true, break-even trades are not counted in streaks (default: false) */
  excludeBreakEven?: boolean;
  /** If true, sort by date+time; if false, sort by date only (default: false) */
  sortByTime?: boolean;
  /** If true, trades that are not Win or Lose count as loss for streak (default: false) */
  countNonOutcomeAsLoss?: boolean;
}

/**
 * Shared streak calculation used by dashboard, overview stats, and filtered strategy stats.
 * Options control whether BE trades count, sort order, and how non-outcome trades are treated.
 */
export function calculateStreaksFromTrades(
  trades: Trade[],
  options: StreakOptions = {}
): StreakStats {
  const {
    excludeBreakEven = false,
    sortByTime = false,
    countNonOutcomeAsLoss = false,
  } = options;

  if (!trades.length) {
    return {
      currentStreak: 0,
      maxWinningStreak: 0,
      maxLosingStreak: 0,
    };
  }

  // ISO YYYY-MM-DD (and HH:MM:SS) strings sort correctly lexicographically.
  // Avoids creating ~450k Date objects for the O(n log n) sort at 30k trades.
  const sortedTrades = [...trades].sort((a, b) => {
    if (sortByTime) {
      const at = `${a.trade_date ?? ''}T${a.trade_time || '00:00:00'}`;
      const bt = `${b.trade_date ?? ''}T${b.trade_time || '00:00:00'}`;
      return at < bt ? -1 : at > bt ? 1 : 0;
    }
    const da = a.trade_date ?? '';
    const db = b.trade_date ?? '';
    return da < db ? -1 : da > db ? 1 : 0;
  });

  let maxWinningStreak = 0;
  let maxLosingStreak = 0;
  let currentWinningStreak = 0;
  let currentLosingStreak = 0;
  let lastCountedOutcome: 'Win' | 'Lose' | null = null;

  sortedTrades.forEach((trade) => {
    if (excludeBreakEven && trade.break_even) {
      return;
    }

    const isWin = trade.trade_outcome === 'Win';
    const isLoss = trade.trade_outcome === 'Lose';

    if (isWin) {
      currentWinningStreak++;
      currentLosingStreak = 0;
      maxWinningStreak = Math.max(maxWinningStreak, currentWinningStreak);
      lastCountedOutcome = 'Win';
    } else if (isLoss) {
      currentLosingStreak++;
      currentWinningStreak = 0;
      maxLosingStreak = Math.max(maxLosingStreak, currentLosingStreak);
      lastCountedOutcome = 'Lose';
    } else if (countNonOutcomeAsLoss) {
      currentLosingStreak++;
      currentWinningStreak = 0;
      maxLosingStreak = Math.max(maxLosingStreak, currentLosingStreak);
      lastCountedOutcome = 'Lose';
    }
  });

  let currentStreak = 0;
  if (lastCountedOutcome === 'Win') {
    currentStreak = currentWinningStreak;
  } else if (lastCountedOutcome === 'Lose') {
    currentStreak = -currentLosingStreak;
  }

  return {
    currentStreak,
    maxWinningStreak,
    maxLosingStreak,
  };
}

/** Dashboard use: exclude BE, sort by date+time, only Win/Lose count. */
export function calculateStreaks(trades: Trade[]): StreakStats {
  return calculateStreaksFromTrades(trades, {
    excludeBreakEven: true,
    sortByTime: true,
    countNonOutcomeAsLoss: false,
  });
}
