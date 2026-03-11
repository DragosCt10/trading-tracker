/**
 * TypeScript types for the get_dashboard_aggregates Supabase RPC response.
 * Mirrors the JSONB shape returned by the SQL function.
 */

// ── Shared base shape ────────────────────────────────────────────────────────

export interface RpcBaseStats {
  total: number;
  wins: number;
  losses: number;
  breakEven: number;
  winRate: number;
  winRateWithBE: number;
}

// ── Core stats ───────────────────────────────────────────────────────────────

export interface RpcCore {
  totalTrades: number;
  totalWins: number;
  beWins: number;
  totalLosses: number;
  beLosses: number;
  winRate: number;
  winRateWithBE: number;
  totalProfit: number;
  averageProfit: number;
  averagePnLPercentage: number;
  multipleR: number;
  averageDaysBetweenTrades: number;
}

// ── Partial trades ───────────────────────────────────────────────────────────

export interface RpcPartials {
  partialWinningTrades: number;
  partialLosingTrades: number;
  partialBETrades: number;
  totalPartialTradesCount: number;
  totalPartialsBECount: number;
}

// ── Macro stats (profitFactor, consistency) ──────────────────────────────────

export interface RpcMacro {
  profitFactor: number;
  consistencyScore: number;
  consistencyScoreWithBE: number;
  // sharpeWithBE and tradeQualityIndex computed in Layer 2 from series
}

// ── Monthly data ─────────────────────────────────────────────────────────────

export interface RpcMonthStats {
  wins: number;
  losses: number;
  beWins: number;
  beLosses: number;
  profit: number;
  winRate: number;
  winRateWithBE: number;
}

export interface RpcBestWorstMonth {
  month: string;
  stats: RpcMonthStats;
}

// ── Evaluation stats ─────────────────────────────────────────────────────────

export interface RpcEvaluationStat {
  grade: string;
  total: number;
  wins: number;
  losses: number;
  beTradesCount: number;
  breakEven: number;
  winRate: number;
  winRateWithBE: number;
}

// ── Risk analysis ────────────────────────────────────────────────────────────

export interface RpcRiskStats {
  total: number;
  wins: number;
  losses: number;
  breakEven: number;
  beWins: number;
  beLosses: number;
  winrate: number;
  winrateWithBE: number;
}

// ── Category stats ───────────────────────────────────────────────────────────

export interface RpcSetupStat extends RpcBaseStats { setup: string; }
export interface RpcLiquidityStat extends RpcBaseStats { liquidity: string; }
export interface RpcDirectionStat extends RpcBaseStats { direction: string; }
export interface RpcMssStat extends RpcBaseStats { mss: string; }
export interface RpcNewsStat extends RpcBaseStats { news: string; }
export interface RpcDayStat extends RpcBaseStats { day: string; }
export interface RpcMarketStat extends RpcBaseStats {
  market: string;
  profit: number;
  pnlPercentage: number;
  profitTaken: boolean;
}
export interface RpcIntervalStat extends RpcBaseStats { label: string; }
export interface RpcSLSizeStat { market: string; averageSlSize: number; }

export interface RpcLocalHLBucket {
  wins: number;
  losses: number;
  breakEven: number;
  total: number;
  beWins: number;
  beLosses: number;
  beWinRate?: number;
  winRate: number;
  winRateWithBE: number;
}

export interface RpcLocalHLStats {
  liquidated: RpcLocalHLBucket;
  notLiquidated: RpcLocalHLBucket;
}

// ── Reentry / break-even / trend stats (computed in DB, no compact_trades needed) ─

export interface RpcReentryStat extends RpcBaseStats {
  grp: string;        // 'Reentry' | 'No Reentry'
}

export interface RpcBreakEvenStats {
  nonBeWins: number;
  nonBeLosses: number;
  beCount: number;
  total: number;
}

export interface RpcTrendStat extends RpcBaseStats {
  tradeType: string;  // 'Trend-following' | 'Counter-trend'
}

// ── Ordered series for Layer 2 (maxDrawdown, streaks, Sharpe, TQI) ──────────

export interface RpcSeriesRow {
  trade_date: string;           // 'YYYY-MM-DD'
  trade_time: string;           // 'HH:MM'
  trade_outcome: string;        // 'Win' | 'Lose' | 'BE'
  break_even: boolean;
  partials_taken: boolean;
  calculated_profit: number;
  risk_per_trade: number;       // already COALESCE'd to 0.5
  risk_reward_ratio: number;    // already COALESCE'd to 2.0
  // Phase 2: added to replace compact_trades for always-on components
  market: string;
  executed: boolean;
  confidence_at_entry: number | null;
  mind_state_at_entry: number | null;
  news_name: string | null;
}

// ── Compact trade for Layer 3 Web Worker ────────────────────────────────────

export interface CompactTrade {
  id: string;
  trade_date: string;
  trade_time: string;
  trade_outcome: string;
  break_even: boolean;
  partials_taken: boolean;
  executed: boolean;
  market: string;
  setup_type: string;
  liquidity: string;
  direction: string;
  calculated_profit: number;
  risk_per_trade: number;
  risk_reward_ratio: number;
  mss: string;
  news_related: boolean;
  news_name: string | null;
  day_of_week: string;
  sl_size: number;
  local_high_low: boolean;
  be_final_result: string;
  evaluation: string;
  reentry: boolean;
  trend: string;
  // Extra-card fields
  displacement_size: number | null;
  fvg_size: number | null;
  launch_hour: boolean;
  confidence_at_entry: number | null;
  mind_state_at_entry: number | null;
  news_intensity: number | null;
  risk_reward_ratio_long: number | null;
}

// ── Full RPC response ────────────────────────────────────────────────────────

export interface DashboardRpcResult {
  core: RpcCore;
  partials: RpcPartials;
  macro: RpcMacro;
  evaluation_stats: RpcEvaluationStat[];
  risk_analysis: Record<string, RpcRiskStats>;
  monthly_data: Record<string, RpcMonthStats>;
  best_month: RpcBestWorstMonth | null;
  worst_month: RpcBestWorstMonth | null;
  setup_stats: RpcSetupStat[];
  liquidity_stats: RpcLiquidityStat[];
  direction_stats: RpcDirectionStat[];
  mss_stats: RpcMssStat[];
  news_stats: RpcNewsStat[];
  day_stats: RpcDayStat[];
  market_stats: RpcMarketStat[];
  local_hl_stats: RpcLocalHLStats;
  interval_stats: RpcIntervalStat[];
  sl_size_stats: RpcSLSizeStat[];
  series: RpcSeriesRow[];
  compact_trades: CompactTrade[];
  reentry_stats: RpcReentryStat[];
  break_even_stats: RpcBreakEvenStats;
  trend_stats: RpcTrendStat[];
  /** 'YYYY-MM' strings for calendar month navigation — computed in DB, no compact_trades needed */
  trade_months: string[];
  /** Earliest trade date in the queried range (YYYY-MM-DD) — computed in DB */
  earliest_trade_date: string | null;
}

// ── Full API route response (L2 merged with time-series) ────────────────────

export interface DashboardApiResponse extends DashboardRpcResult {
  /** maxDrawdown computed in Layer 2 from series (%) */
  maxDrawdown: number;
  /** Current streak: positive = win streak, negative = lose streak */
  currentStreak: number;
  maxWinningStreak: number;
  maxLosingStreak: number;
  /** Sample Sharpe ratio from per-trade returns (BE without partials = 0) */
  sharpeWithBE: number;
  /** Trade Quality Index in [0, 1] */
  tradeQualityIndex: number;
  /** multipleR (sum of R-values) — also in core but repeated for convenience */
  multipleR: number;
  /** Non-executed trades stats (second parallel RPC call) */
  nonExecutedStats: DashboardRpcResult;
  /** Non-executed total trade count */
  nonExecutedTotalTradesCount: number;
  /** Earliest trade date in the filtered range (YYYY-MM-DD) */
  earliestTradeDate: string | null;
  /** YYYY-MM strings for calendar month navigation */
  tradeMonths: string[];
}
