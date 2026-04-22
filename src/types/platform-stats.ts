/** Shape of the JSONB returned by get_platform_stats() RPC */
export interface PlatformStatsRpcResponse {
  traders_count: number;
  trades_count: number;
  stats_boards_count: number;
  prev_traders_count?: number;
  prev_trades_count?: number;
  prev_stats_boards_count?: number;
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
  tradersCount: number;
  tradesCount: number;
  statsBoardsCount: number;
  /** Count of real (paying) subscriptions — excludes admin_granted grants. */
  subscriptionsCount: number;
  tradesByMode: TradesByMode;
  prev?: {
    tradersCount: number;
    tradesCount: number;
    statsBoardsCount: number;
  };
}

export type ComparisonPeriod = '1w' | '1m' | '3m' | '6m' | '1y';

export interface PlatformStatConfig {
  key: keyof Omit<AdminPlatformStats, 'prev' | 'tradesByMode'>;
  label: string;
  format: (n: number) => string;
}
