import { DayStats, DirectionStats, IntervalStats, LiquidityStats, LocalHLStats, MarketStats, MssStats, NewsStats, SLSizeStats, TradeTypeStats } from '@/types/dashboard';
import { Trade } from '@/types/trade';

/**
 * Single source of truth for "liquidated" (local H/L = true).
 * Handles boolean, string, number, or null from API/DB so both calculateLocalHLStats
 * and computeStatsFromTrades (and any other consumer) categorize the same way.
 */
export function isLocalHighLowLiquidated(value: unknown): boolean {
  if (value === true) return true;
  if (value === false || value === null || value === undefined) return false;
  const s = String(value).toLowerCase();
  return s === 'true' || s === '1';
}

/**
 * Generic group statistics for trades.
 */
export interface GroupStats {
  /** Group label or key. */
  type: string;
  /** Total trades in group. */
  total: number;
  /** Winning trades. */
  wins: number;
  /** Losing trades. */
  losses: number;
  /** Win rate excluding BE trades (%). */
  winRate: number;
  /** Win rate including BE trades (%). */
  winRateWithBE: number;
  /** Of wins, how many were BE. */
  beWins: number;
  /** Of losses, how many were BE. */
  beLosses: number;
  /** Trade type. */
  tradeType: string;
}

/**
 * Time interval definition.
 */
export interface Interval {
  label: string;
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

/**
 * Simple helper: pad/normalize a time string to HH:MM.
 */
function normalizeTimeToHHMM(time: string): string {
  const [h = '0', m = '0'] = time.split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

/**
 * Check if a time is within [start, end] inclusive.
 */
function isTimeInInterval(time: string, start: string, end: string): boolean {
  const [hT, mT] = time.split(':').map(Number);
  const [hS, mS] = start.split(':').map(Number);
  const [hE, mE] = end.split(':').map(Number);
  const tM = hT * 60 + mT;
  const sM = hS * 60 + mS;
  const eM = hE * 60 + mE;
  return tM >= sM && tM <= eM;
}

/**
 * Build stats for a single labeled group of trades.
 * Processes all trades passed (tradesToUse already handles filtering).
 * All trades have Win/Lose outcomes, so we count all trades for total and wins/losses.
 */
function processGroup(label: string, trades: Trade[]): GroupStats {
  // Count ALL trades (all trades have outcomes, executed or not)
  const total = trades.length;

  // All trades have Win/Lose outcomes, so count directly from all trades
  const wins      = trades.filter(t => t.trade_outcome === 'Win').length;
  const losses    = trades.filter(t => t.trade_outcome === 'Lose').length;
  const beWins    = trades.filter(t => t.trade_outcome === 'Win'  && t.break_even).length;
  const beLosses  = trades.filter(t => t.trade_outcome === 'Lose' && t.break_even).length;

  // Non-BE counts
  const nonBEWins   = wins - beWins;
  const nonBELosses = losses - beLosses;
  const beCount     = beWins + beLosses;
  // Win Rate: non-BE wins / (non-BE wins + all losses) so BE losses count (1 win + 1 BE loss → 50%)
  const denomWinRate = nonBEWins + nonBELosses + beLosses;
  const winRate     = denomWinRate > 0
    ? (nonBEWins / denomWinRate) * 100
    : 0;
  // Win Rate (w/ BE): include BE trades in denominator
  const denomWithBE   = nonBEWins + nonBELosses + beCount;
  const winRateWithBE = denomWithBE > 0
    ? (nonBEWins / denomWithBE) * 100
    : 0;

  return {
    type: label,
    total,
    wins,
    losses,
    winRate,
    winRateWithBE,
    beWins,
    beLosses,
    tradeType: label,
  };
}

/**
 * Generic grouping by a string key extractor.
 * Processes all trades passed (tradesToUse already handles filtering).
 */
export function calculateGroupedStats(
  trades: Trade[],
  keyFn: (t: Trade) => string
): GroupStats[] {
  const groups: Record<string, Trade[]> = {};
  trades.forEach(t => {
    const key = keyFn(t) || 'Unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });
  return Object.entries(groups)
    .map(([label, ts]) => processGroup(label, ts))
    .sort((a, b) => b.total - a.total);
}

/**
 * Calculate stats for defined time intervals.
 */

export function calculateIntervalStats(
  trades: Trade[],
  intervals: readonly Interval[]
): IntervalStats[] {
  return intervals.map(({ label, start, end }) => {
    // pull out the trades in this bucket
    const bucket = trades.filter(t =>
      isTimeInInterval(normalizeTimeToHHMM(t.trade_time), start, end)
    );

    // now compute your GroupStats kind of logic in-line
    const wins      = bucket.filter(t => t.trade_outcome === 'Win').length;
    const losses    = bucket.filter(t => t.trade_outcome === 'Lose').length;
    const beWins    = bucket.filter(t => t.trade_outcome === 'Win'  && t.break_even).length;
    const beLosses  = bucket.filter(t => t.trade_outcome === 'Lose' && t.break_even).length;

    const nonBEWins   = wins  - beWins;
    const nonBELosses = losses - beLosses;
    const beCount     = beWins + beLosses;
    // Win Rate: non-BE wins / (non-BE wins + all losses) so BE losses count in denominator (1 win + 1 BE loss → 50%)
    const denomWinRate = nonBEWins + nonBELosses + beLosses;
    const denomWithBE  = nonBEWins + nonBELosses + beCount;

    const winRate       = denomWinRate > 0 ? (nonBEWins / denomWinRate) * 100 : 0;
    const winRateWithBE = denomWithBE   > 0 ? (nonBEWins / denomWithBE  ) * 100 : 0;

    return {
      label,
      wins,
      losses,
      beWins,
      beLosses,
      winRate,
      winRateWithBE
    };
  });
}
/**
 * SL size stats: average SL per market.
 */

export function calculateSLSizeStats(trades: Trade[]): SLSizeStats[] {
  if (trades.length === 0) return [];
  const acc: Record<string, number[]> = {};
  trades.forEach(t => {
    const market = t.market || 'Unknown';
    if (!acc[market]) acc[market] = [];
    if (typeof t.sl_size === 'number') acc[market].push(t.sl_size);
  });
  return Object.entries(acc)
    .map(([market, arr]) => ({
      market,
      averageSlSize: arr.length
        ? arr.reduce((a, b) => a + b, 0) / arr.length
        : 0
    }))
    .filter(s => s.averageSlSize > 0)
    .sort((a, b) => b.averageSlSize - a.averageSlSize);
}

/**
 * Convenience wrappers for all your category stats:
 */
export function calculateLiquidityStats(trades: Trade[]): LiquidityStats[] {
  if (trades.length === 0) return [];
  return calculateGroupedStats(trades, t => t.liquidity || 'Unknown')
    .map(g => ({
      liquidity:   g.type,
      total:       g.total,
      wins:        g.wins,
      losses:      g.losses,
      winRate:     g.winRate,
      winRateWithBE: g.winRateWithBE,
      beWins:      g.beWins,
      beLosses:    g.beLosses
    }));
}

export function calculateSetupStats(trades: Trade[]) {
  if (trades.length === 0) return [];
  return calculateGroupedStats(trades, t => t.setup_type || 'Unknown')
    .map(g => ({
      setup:       g.type,
      total:       g.total,
      wins:        g.wins,
      losses:      g.losses,
      winRate:     g.winRate,
      winRateWithBE: g.winRateWithBE,
      beWins:      g.beWins,
      beLosses:    g.beLosses
    }));
}
export function calculateDirectionStats(trades: Trade[]): DirectionStats[] {
  if (trades.length === 0) return [];
  return calculateGroupedStats(trades, t => t.direction || 'Unknown')
    .map(g => ({
      direction:   g.type,
      total:       g.total,
      wins:        g.wins,
      losses:      g.losses,
      winRate:     g.winRate,
      winRateWithBE: g.winRateWithBE,
      beWins:      g.beWins,
      beLosses:    g.beLosses
    }));
}
/** English keys for Local H/L stats (liquidated / not liquidated) */
export const LOCAL_HL_KEYS = {
  liquidated: 'liquidated',
  notLiquidated: 'notLiquidated',
} as const;

export function calculateLocalHLStats(trades: Trade[]): LocalHLStats {
  const ZERO: LocalHLStats = {
    liquidated:   { wins: 0, losses: 0, winRate: 0, winsWithBE: 0, lossesWithBE: 0, winRateWithBE: 0, total: 0 },
    notLiquidated: { wins: 0, losses: 0, winRate: 0, winsWithBE: 0, lossesWithBE: 0, winRateWithBE: 0, total: 0 },
  };

  // ← if no trades at all, immediately return the zero‐stats
  if (trades.length === 0) return ZERO;

  // Group ALL trades (including non-executed) - processGroup will handle counting correctly
  // Use isLocalHighLowLiquidated so we match computeStatsFromTrades (boolean/string/number from API)
  const groups = calculateGroupedStats(
    trades,
    t => (isLocalHighLowLiquidated(t.local_high_low) ? LOCAL_HL_KEYS.liquidated : LOCAL_HL_KEYS.notLiquidated)
  );

  return groups.reduce<LocalHLStats>((acc, g) => {
    acc[g.type] = {
      wins:           g.wins,
      losses:         g.losses,
      winRate:        g.winRate,
      winsWithBE:     g.beWins,
      lossesWithBE:   g.beLosses,
      winRateWithBE:  g.winRateWithBE,
      total:          g.total,
    };
    return acc;
  }, { ...ZERO });
}
export function calculateMssStats(trades: Trade[]): MssStats[] {
  if (trades.length === 0) return [];
  return calculateGroupedStats(trades, t => t.mss || 'Normal')
    .map(g => ({
      mss: g.type,
      total: g.total,
      wins: g.wins,
      losses: g.losses,
      winRate: g.winRate,
      winRateWithBE: g.winRateWithBE,
      beWins: g.beWins,
      beLosses: g.beLosses
    }));
}
export function calculateNewsStats(trades: Trade[]): NewsStats[] {
  if (trades.length === 0) return [];
  return calculateGroupedStats(
    trades,
    t => (t.news_related ? 'News' : 'No News')
  )
    .map(g => ({
      news: g.type,
      total: g.total,
      wins: g.wins,
      losses: g.losses,
      winRate: g.winRate,
      winRateWithBE: g.winRateWithBE,
      beWins: g.beWins,
      beLosses: g.beLosses
    }));
}

export function calculateDayStats(trades: Trade[]): DayStats[] {
  if (trades.length === 0) return [];
  return calculateGroupedStats(trades, t => t.day_of_week || 'Unknown')
    .map(g => ({
      day: g.type,
      total: g.total,
      wins: g.wins,
      losses: g.losses,
      winRate: g.winRate,
      winRateWithBE: g.winRateWithBE,
      beWins: g.beWins,
      beLosses: g.beLosses
    }));
}
export function calculateMarketStats(trades: Trade[], accountBalance: number): MarketStats[] {  
  if (trades.length === 0) return [];
  return calculateGroupedStats(trades, t => t.market || 'Unknown')
    .map(g => {
      const marketTrades = trades.filter(t => (t.market || 'Unknown') === g.type);

      // Use stored absolute P/L per trade (calculated_profit); ignore non-numeric entries
      const profit = marketTrades.reduce((sum, trade) => {
        const value = typeof trade.calculated_profit === 'number' ? trade.calculated_profit : 0;
        return sum + value;
      }, 0);

      const pnlPercentage = accountBalance > 0 ? (profit / accountBalance) * 100 : 0;
      return {
        market: g.type,
        total: g.total,
        wins: g.wins,
        losses: g.losses,
        winRate: g.winRate,
        winRateWithBE: g.winRateWithBE,
        beWins: g.beWins,
        beLosses: g.beLosses,
        nonBeWins: g.wins - g.beWins,
        nonBeLosses: g.losses - g.beLosses,
        profit,
        pnlPercentage,
        profitTaken: true
      };
    });
}

/**
 * Trade type stats: re-entry and break-even separate.
 * Processes all trades passed (tradesToUse already handles filtering).
 */
export function calculateReentryStats(trades: Trade[]): TradeTypeStats[] {
  if (trades.length === 0) return [];
  const re = trades.filter(t => t.reentry);
  return re.length ? [processGroup('ReEntry', re)] : []; 
}
export function calculateBreakEvenStats(trades: Trade[]): TradeTypeStats[] {
  if (trades.length === 0) return [];
  const be = trades.filter(t => t.break_even);
  if (!be.length) return [];
  const group = processGroup('Break Even', be);
  // Override winRate: simple win rate for BE group
  group.winRate = group.total > 0 ? (group.wins / group.total) * 100 : 0;
  return [group];
}

/** Trend stats: only trades with trend set; groups by Trend-following / Counter-trend. */
export function calculateTrendStats(trades: Trade[]): TradeTypeStats[] {
  if (trades.length === 0) return [];
  const TREND_VALUES = ['Trend-following', 'Counter-trend'] as const;
  const result: TradeTypeStats[] = [];
  for (const trendValue of TREND_VALUES) {
    const subset = trades.filter(t => (t.trend ?? '').trim() === trendValue);
    if (subset.length > 0) {
      const g = processGroup(trendValue, subset);
      result.push({
        tradeType: g.type,
        total: g.total,
        wins: g.wins,
        losses: g.losses,
        winRate: g.winRate,
        winRateWithBE: g.winRateWithBE,
        beWins: g.beWins,
        beLosses: g.beLosses,
      });
    }
  }
  return result.sort((a, b) => b.total - a.total);
}


