export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // ─────────────────────────────────────────────────────────────
      // REQUIRED: account_settings (from your schema)
      account_settings: {
        Row: {
          id: string;
          user_id: string;
          account_balance: number;
          currency: string;
          created_at: string;
          updated_at: string;
          name: string;
          mode: 'live' | 'backtesting' | 'demo';
          is_active: boolean;
          is_dashboard_public: boolean | null;
          dashboard_hash: string | null;
          description: string | null;
        };
        Insert: Partial<Database['public']['Tables']['account_settings']['Row']> & {
          user_id: string;
          account_balance: number;
          name: string;
          mode: 'live' | 'backtesting' | 'demo';
        };
        Update: Partial<Database['public']['Tables']['account_settings']['Row']>;
        Relationships: never[];
      };

      // ─────────────────────────────────────────────────────────────
      // user_settings (saved filters, feature flags)
      user_settings: {
        Row: {
          user_id: string;
          saved_news: Json;
          saved_markets: Json;
          feature_flags: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          saved_news?: Json;
          saved_markets?: Json;
          feature_flags?: Json;
        };
        Update: Partial<Omit<Database['public']['Tables']['user_settings']['Row'], 'user_id'>>;
        Relationships: never[];
      };

      // ─────────────────────────────────────────────────────────────
      // Duplicated: live, backtesting, demo trades tables (identical structure)

      live_trades: {
        Row: {
          id: string;
          user_id: string;
          account_id: string | null;
          trade_screens: string[] | null;
          trade_screen_timeframes: string[] | null;
          trade_time: string; // time
          trade_date: string; // date
          day_of_week: string;
          market: string;
          setup_type: string;
          liquidity: string;
          sl_size: number; // numeric(10,2)
          direction: string; // 'Long' | 'Short';
          trade_outcome: string; // 'Win' | 'Lose';
          session: string | null; // 'Sydney' | 'Tokyo' | 'London' | 'New York'
          break_even: boolean | null;
          reentry: boolean | null;
          news_related: boolean | null;
          mss: string;
          risk_reward_ratio: number | null;
          risk_reward_ratio_long: number | null;
          local_high_low: boolean | null;
          created_at: string | null;
          updated_at: string | null;
          risk_per_trade: number | null;
          calculated_profit: number | null;
          mode: string | null;
          notes: string | null;
          pnl_percentage: number | null;
          quarter: string | null;
          evaluation: string | null;
          partials_taken: boolean | null;
          executed: boolean | null;
          launch_hour: boolean | null;
          strategy_id: string | null; // Added
          fvg_size: number | null; // e.g. 1, 1.5, 2, 2.5
          trend: string | null;
          confidence_at_entry: number | null; // 1–5 confidence at entry
          mind_state_at_entry: number | null; // 1–5 mind state at entry
          be_final_result: string | null; // When trade_outcome is BE: 'Win' | 'Lose' | null
          trade_executed_at: string | null; // UTC ISO for session bucketing (NY/UK/Asia)
          news_name: string | null;
          news_intensity: number | null; // 1 | 2 | 3
        };
        Insert: Partial<Database['public']['Tables']['live_trades']['Row']> & {
          user_id: string;
          trade_time: string;
          trade_date: string;
          day_of_week: string;
          market: string;
          setup_type: string;
          liquidity: string;
          sl_size: number;
          direction: string; // 'Long' | 'Short';
          trade_outcome: string; // 'Win' | 'Lose';
        };
        Update: Partial<Database['public']['Tables']['live_trades']['Row']>;
        Relationships: never[];
      };

      backtesting_trades: {
        Row: {
          id: string;
          user_id: string;
          account_id: string | null;
          trade_screens: string[] | null;
          trade_screen_timeframes: string[] | null;
          trade_time: string; // time
          trade_date: string; // date
          day_of_week: string;
          market: string;
          setup_type: string;
          liquidity: string;
          sl_size: number; // numeric(10,2)
          direction: string; // 'Long' | 'Short';
          trade_outcome: string; // 'Win' | 'Lose';
          session: string | null; // 'Sydney' | 'Tokyo' | 'London' | 'New York'
          break_even: boolean | null;
          reentry: boolean | null;
          news_related: boolean | null;
          mss: string;
          risk_reward_ratio: number | null;
          risk_reward_ratio_long: number | null;
          local_high_low: boolean | null;
          created_at: string | null;
          updated_at: string | null;
          risk_per_trade: number | null;
          calculated_profit: number | null;
          mode: string | null;
          notes: string | null;
          pnl_percentage: number | null;
          quarter: string | null;
          evaluation: string | null;
          partials_taken: boolean | null;
          executed: boolean | null;
          launch_hour: boolean | null;
          strategy_id: string | null; // Added
          fvg_size: number | null; // e.g. 1, 1.5, 2, 2.5
          trend: string | null;
          confidence_at_entry: number | null; // 1–5 confidence at entry
          mind_state_at_entry: number | null; // 1–5 mind state at entry
          be_final_result: string | null; // When trade_outcome is BE: 'Win' | 'Lose' | null
          trade_executed_at: string | null; // UTC ISO for session bucketing (NY/UK/Asia)
          news_name: string | null;
          news_intensity: number | null; // 1 | 2 | 3
        };
        Insert: Partial<Database['public']['Tables']['backtesting_trades']['Row']> & {
          user_id: string;
          trade_time: string;
          trade_date: string;
          day_of_week: string;
          market: string;
          setup_type: string;
          liquidity: string;
          sl_size: number;
          direction: string; // 'Long' | 'Short';
          trade_outcome: string; // 'Win' | 'Lose';
        };
        Update: Partial<Database['public']['Tables']['backtesting_trades']['Row']>;
        Relationships: never[];
      };

      demo_trades: {
        Row: {
          id: string;
          user_id: string;
          account_id: string | null;
          trade_screens: string[] | null;
          trade_screen_timeframes: string[] | null;
          trade_time: string; // time
          trade_date: string; // date
          day_of_week: string;
          market: string;
          setup_type: string;
          liquidity: string;
          sl_size: number; // numeric(10,2)
          direction: string; // 'Long' | 'Short';
          trade_outcome: string; // 'Win' | 'Lose';
          session: string | null; // 'Sydney' | 'Tokyo' | 'London' | 'New York'
          break_even: boolean | null;
          reentry: boolean | null;
          news_related: boolean | null;
          mss: string;
          risk_reward_ratio: number | null;
          risk_reward_ratio_long: number | null;
          local_high_low: boolean | null;
          created_at: string | null;
          updated_at: string | null;
          risk_per_trade: number | null;
          calculated_profit: number | null;
          mode: string | null;
          notes: string | null;
          pnl_percentage: number | null;
          quarter: string | null;
          evaluation: string | null;
          partials_taken: boolean | null;
          executed: boolean | null;
          launch_hour: boolean | null;
          strategy_id: string | null; // Added
          fvg_size: number | null; // e.g. 1, 1.5, 2, 2.5
          trend: string | null;
          confidence_at_entry: number | null; // 1–5 confidence at entry
          mind_state_at_entry: number | null; // 1–5 mind state at entry
          be_final_result: string | null; // When trade_outcome is BE: 'Win' | 'Lose' | null
          trade_executed_at: string | null; // UTC ISO for session bucketing (NY/UK/Asia)
          news_name: string | null;
          news_intensity: number | null; // 1 | 2 | 3
        };
        Insert: Partial<Database['public']['Tables']['demo_trades']['Row']> & {
          user_id: string;
          trade_time: string;
          trade_date: string;
          day_of_week: string;
          market: string;
          setup_type: string;
          liquidity: string;
          sl_size: number;
          direction: string; // 'Long' | 'Short';
          trade_outcome: string; // 'Win' | 'Lose';
        };
        Update: Partial<Database['public']['Tables']['demo_trades']['Row']>;
        Relationships: never[];
      };

      // ─────────────────────────────────────────────────────────────
      // Duplicated: strategies table (identical structure)
      strategies: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
          is_active: boolean;
          extra_cards: string[];
          saved_setup_types: string[];
          saved_liquidity_types: string[];
          saved_displacement_sizes: string[];
          saved_sl_sizes: string[];
          saved_risk_per_trades: string[];
          saved_rr_ratios: string[];
          /** Pinned/favourite items per combobox kind (setup, liquidity, market, news, …). Max 10 per kind. */
          saved_favourites: Record<string, string[]> | null;
        };
        Insert: {
          user_id: string;
          account_id: string;
          name: string;
          slug: string;
          is_active?: boolean;
          extra_cards?: string[];
          saved_setup_types?: string[];
          saved_liquidity_types?: string[];
          saved_displacement_sizes?: string[];
          saved_sl_sizes?: string[];
          saved_risk_per_trades?: string[];
          saved_rr_ratios?: string[];
          saved_favourites?: Record<string, string[]> | null;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          account_id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
          is_active: boolean;
          extra_cards: string[];
          saved_setup_types: string[];
          saved_liquidity_types: string[];
          saved_displacement_sizes: string[];
          saved_sl_sizes: string[];
          saved_risk_per_trades: string[];
          saved_rr_ratios: string[];
          saved_favourites: Record<string, string[]> | null;
        }>;
        Relationships: never[];
      };

      // ─────────────────────────────────────────────────────────────
      // Phase 3: pre-computed per-strategy stats (updated via DB triggers)
      strategy_stats_cache: {
        Row: {
          user_id:      string;
          account_id:   string;
          mode:         'live' | 'demo' | 'backtesting';
          strategy_id:  string;
          total_trades: number;
          win_rate:     number;
          avg_rr:       number;
          total_rr:     number;
          total_profit: number;
          equity_curve: Json; // EquityCurvePoint[] stored as JSONB
          updated_at:   string;
        };
        Insert: never;
        Update: never;
        Relationships: never[];
      };

      // ─────────────────────────────────────────────────────────────
      // Public share links for strategy analytics
      strategy_shares: {
        Row: {
          id: string;
          share_token: string;
          strategy_id: string;
          account_id: string;
          mode: 'live' | 'backtesting' | 'demo';
          start_date: string; // date
          end_date: string; // date
          created_by: string;
          created_at: string;
          active: boolean;
          expires_at: string; // timestamptz — DB default: now() + 90 days
        };
        Insert: Partial<Database['public']['Tables']['strategy_shares']['Row']> & {
          strategy_id: string;
          account_id: string;
          mode: 'live' | 'backtesting' | 'demo';
          start_date: string;
          end_date: string;
          created_by: string;
        };
        Update: Partial<Database['public']['Tables']['strategy_shares']['Row']>;
        Relationships: never[];
      };

      // ─────────────────────────────────────────────────────────────
      // Public share links for individual trades
      trade_shares: {
        Row: {
          id: string;
          share_token: string;
          trade_id: string;
          account_id: string;
          mode: 'live' | 'backtesting' | 'demo';
          strategy_id: string | null;
          created_by: string;
          created_at: string;
          active: boolean;
          expires_at: string; // timestamptz — DB default: now() + 90 days
          // Denormalized labels captured at creation time so the Settings list
          // never has to touch the mode-specific trade tables on render.
          trade_market: string | null;
          trade_direction: string | null;
          trade_date: string | null; // date
        };
        Insert: Partial<Database['public']['Tables']['trade_shares']['Row']> & {
          trade_id: string;
          account_id: string;
          mode: 'live' | 'backtesting' | 'demo';
          created_by: string;
        };
        Update: Partial<Database['public']['Tables']['trade_shares']['Row']>;
        Relationships: never[];
      };

      // ─────────────────────────────────────────────────────────────
      // Cache of precomputed analytics for a share link (one row per share)
      share_stats_cache: {
        Row: {
          share_id: string;
          stats: Record<string, unknown>;
          updated_at: string;
        };
        Insert: {
          share_id: string;
          stats: Record<string, unknown>;
          updated_at?: string;
        };
        Update: Partial<{
          share_id: string;
          stats: Record<string, unknown>;
          updated_at: string;
        }>;
        Relationships: never[];
      };

      // ─────────────────────────────────────────────────────────────
      // Subscription tiers
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          tier: 'starter' | 'starter_plus' | 'pro' | 'elite';
          status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'admin_granted' | 'refunded';
          billing_period: 'monthly' | 'annual' | null;
          provider: 'polar' | 'stripe' | 'paddle' | 'lemonsqueezy' | 'admin';
          provider_subscription_id: string | null;
          provider_customer_id: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          tier?: 'starter' | 'starter_plus' | 'pro' | 'elite';
          status?: 'active' | 'canceled' | 'past_due' | 'trialing' | 'admin_granted' | 'refunded';
          billing_period?: 'monthly' | 'annual' | null;
          provider?: 'polar' | 'stripe' | 'paddle' | 'lemonsqueezy' | 'admin';
          provider_subscription_id?: string | null;
          provider_customer_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          price_amount?: number | null;
          tax_amount?: number | null;
          currency?: string | null;
          updated_at?: string;
        };
        Update: Partial<{
          id: string; user_id: string; tier: 'starter' | 'starter_plus' | 'pro' | 'elite';
          status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'admin_granted' | 'refunded';
          billing_period: 'monthly' | 'annual' | null; provider: 'polar' | 'stripe' | 'paddle' | 'lemonsqueezy' | 'admin';
          provider_subscription_id: string | null; provider_customer_id: string | null;
          current_period_start: string | null; current_period_end: string | null;
          cancel_at_period_end: boolean; created_at: string; updated_at: string;
          price_amount: number | null; tax_amount: number | null; currency: string | null;
        }>;
        Relationships: never[];
      };

      // ─────────────────────────────────────────────────────────────
      // Super admin roles
      admin_roles: {
        Row: {
          user_id: string;
          role: 'super_admin';
          granted_by: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          role?: 'super_admin';
          granted_by?: string | null;
        };
        Update: Record<string, never>;
        Relationships: never[];
      };

      // ─────────────────────────────────────────────────────────────
      // Notes table
      notes: {
        Row: {
          id: string;
          user_id: string;
          strategy_id: string | null;
          title: string;
          content: string;
          created_at: string;
          updated_at: string;
          is_pinned: boolean | null;
          tags: string[] | null;
        };
        Insert: {
          user_id: string;
          strategy_id?: string | null;
          title: string;
          content: string;
          is_pinned?: boolean | null;
          tags?: string[] | null;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          strategy_id: string | null;
          title: string;
          content: string;
          created_at: string;
          updated_at: string;
          is_pinned: boolean | null;
          tags: string[] | null;
        }>;
        Relationships: never[];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
