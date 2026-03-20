export interface CustomStatFilter {
  // Always available
  direction?: 'Long' | 'Short';
  market?: string;
  trade_time?: string;          // interval start value e.g. "00:00"
  trade_outcome?: 'Win' | 'Lose' | 'BE';
  day_of_week?: string;         // e.g. "Monday"
  quarter?: string;             // "Q1" | "Q2" | "Q3" | "Q4"
  news_related?: boolean;
  reentry?: boolean;
  partials_taken?: boolean;
  executed?: boolean;
  confidence_at_entry?: number; // 1-5
  mind_state_at_entry?: number; // 1-5
  // Conditional on strategy.extra_cards
  setup_type?: string;          // requires 'setup_stats'
  liquidity?: string;           // requires 'liquidity_stats'
  mss?: string;                 // requires 'mss_stats'
  session?: string;             // requires 'session_stats'
  evaluation?: string;          // requires 'evaluation_stats'
  trend?: string;               // requires 'trend_stats'
  local_high_low?: boolean;     // requires 'local_hl_stats'
  launch_hour?: boolean;        // requires 'launch_hour'
  fvg_size?: number;            // requires 'fvg_size'
}

export interface CustomStatConfig {
  id: string;
  name: string;
  filters: CustomStatFilter;
  created_at: string;
}
