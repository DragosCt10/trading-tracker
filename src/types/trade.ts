export type TradingMode = 'live' | 'demo' | 'backtesting';

export interface Trade {
  id?: string;
  user_id?: string;
  account_id?: string;  // UUID of the associated account
  mode?: TradingMode;
  trade_screens: string[];
  /** Optional timeframe label per screen slot (same index as trade_screens). */
  trade_screen_timeframes?: string[];
  trade_time: string;
  trade_date: string;
  day_of_week: string;
  market: string;
  setup_type: string;
  liquidity: string;
  sl_size?: number;
  direction: string;
  trade_outcome: string;
  /** Manual market session tag (Sydney/Tokyo/London/New York). */
  session: string;
  /** When trade_outcome is BE, optional final result: did it end as Win or Lose. */
  be_final_result?: string | null;
  break_even: boolean;
  reentry: boolean;
  news_related: boolean;
  /** Name of the specific news event (e.g. "CPI", "NFP"). Set when news_related is true. */
  news_name?: string | null;
  /** News impact rating: 1 = Low, 2 = Medium, 3 = High. Set when news_related is true. */
  news_intensity?: number | null;
  mss: string;
  risk_reward_ratio?: number;
  risk_reward_ratio_long?: number;
  local_high_low: boolean;
  risk_per_trade?: number;
  calculated_profit?: number;
  notes?: string;  // New field for trade notes
  pnl_percentage?: number;
  quarter: string;
  evaluation: string;
  partials_taken: boolean;  // New field to track if partials were taken at 1.4RR
  executed: boolean;
  launch_hour: boolean;  // Indicates if the trade was executed during the launch hour
  displacement_size?: number;
  strategy_id?: string | null;
  trend: string | null;
  fvg_size?: number | null;  // e.g. 1, 1.5, 2, 2.5
  /** Confidence at entry (1–5): 1=very low, 5=very confident. Optional. */
  confidence_at_entry?: number | null;
  /** Mind state at entry (1–5): 1=very poor, 5=very good. Optional. */
  mind_state_at_entry?: number | null;
  /** UTC ISO timestamp for session bucketing (NY/UK/Asia); derived from trade_date + trade_time (local). */
  trade_executed_at?: string | null;
  /** Free-form tags attached to this trade (lowercase, trimmed). */
  tags?: string[] | null;

  // — Futures account fields (only populated when the parent account has account_type='futures'). —
  /** Number of contracts traded. */
  num_contracts?: number | null;
  /** Per-trade `$ per SL-unit` override used when the symbol is not in FUTURES_SPECS or user.custom_futures_specs. */
  dollar_per_sl_unit_override?: number | null;
  /** Snapshot of the dollar risk computed at write time (num_contracts × sl_size × multiplier). Persisted so stats stay correct if catalog changes later. */
  calculated_risk_dollars?: number | null;
  /** Provenance of the multiplier used: 'hardcoded' | 'custom' | 'override'. Debug metadata only. */
  spec_source?: 'hardcoded' | 'custom' | 'override' | null;
}