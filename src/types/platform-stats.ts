/** Shape of the JSONB returned by get_platform_stats() RPC */
export interface PlatformStatsRpcResponse {
  /** Total registered users (auth.users). */
  traders_count: number;
  /** Users with at least one trade across live/demo/backtesting. */
  active_traders_count: number;
  trades_count: number;
  stats_boards_count: number;
  live_trades_count: number;
  demo_trades_count: number;
  backtesting_trades_count: number;
  prev_traders_count?: number;
  prev_active_traders_count?: number;
  prev_trades_count?: number;
  prev_stats_boards_count?: number;
  prev_live_trades_count?: number;
  prev_demo_trades_count?: number;
  prev_backtesting_trades_count?: number;
}

export interface PlatformStats {
  tradersCount: number;
  tradesCount: number;
  statsBoardsCount: number;
}

export interface TradesByMode {
  live: number;
  demo: number;
  backtesting: number;
}

export interface AdminPlatformStats {
  /** Total registered users. */
  tradersCount: number;
  /** Users with at least one trade. */
  activeTradersCount: number;
  tradesCount: number;
  statsBoardsCount: number;
  /** Count of real (paying) subscriptions — excludes admin_granted grants. */
  subscriptionsCount: number;
  tradesByMode: TradesByMode;
  prev?: {
    tradersCount: number;
    activeTradersCount: number;
    tradesCount: number;
    statsBoardsCount: number;
    tradesByMode: TradesByMode;
  };
}

export type ComparisonPeriod = '1w' | '1m' | '3m' | '6m' | '1y';

export interface PlatformStatConfig {
  key: keyof Omit<AdminPlatformStats, 'prev' | 'tradesByMode'>;
  label: string;
  format: (n: number) => string;
}
