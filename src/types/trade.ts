export interface Trade {
  id?: string;
  user_id?: string;
  account_id?: string;  // UUID of the associated account
  mode?: string;  // The trading mode (demo, live, backtesting)
  trade_link: string;
  liquidity_taken: string;
  trade_time: string;
  trade_date: string;
  day_of_week: string;
  market: string;
  setup_type: string;
  liquidity: string;
  sl_size: number;
  direction: 'Long' | 'Short';
  trade_outcome: 'Win' | 'Lose';
  break_even: boolean;
  reentry: boolean;
  news_related: boolean;
  mss: string;
  risk_reward_ratio: number;
  risk_reward_ratio_long: number;
  local_high_low: boolean;
  risk_per_trade: number;
  calculated_profit?: number;
  notes?: string;  // New field for trade notes
}