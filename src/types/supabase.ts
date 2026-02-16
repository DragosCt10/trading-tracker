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
      };

      // ─────────────────────────────────────────────────────────────
      // Duplicated: live, backtesting, demo trades tables (identical structure)

      live_trades: {
        Row: {
          id: string;
          user_id: string;
          account_id: string | null;
          trade_link: string | null;
          liquidity_taken: string | null;
          trade_time: string; // time
          trade_date: string; // date
          day_of_week: string;
          market: string;
          setup_type: string;
          liquidity: string;
          sl_size: number; // numeric(10,2)
          direction: 'Long' | 'Short';
          trade_outcome: 'Win' | 'Lose';
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
          rr_hit_1_4: boolean | null;
          partials_taken: boolean | null;
          executed: boolean | null;
          launch_hour: boolean | null;
          strategy_id: string | null; // Added
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
          direction: 'Long' | 'Short';
          trade_outcome: 'Win' | 'Lose';
        };
        Update: Partial<Database['public']['Tables']['live_trades']['Row']>;
      };

      backtesting_trades: {
        Row: {
          id: string;
          user_id: string;
          account_id: string | null;
          trade_link: string | null;
          liquidity_taken: string | null;
          trade_time: string; // time
          trade_date: string; // date
          day_of_week: string;
          market: string;
          setup_type: string;
          liquidity: string;
          sl_size: number; // numeric(10,2)
          direction: 'Long' | 'Short';
          trade_outcome: 'Win' | 'Lose';
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
          rr_hit_1_4: boolean | null;
          partials_taken: boolean | null;
          executed: boolean | null;
          launch_hour: boolean | null;
          strategy_id: string | null; // Added
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
          direction: 'Long' | 'Short';
          trade_outcome: 'Win' | 'Lose';
        };
        Update: Partial<Database['public']['Tables']['backtesting_trades']['Row']>;
      };

      demo_trades: {
        Row: {
          id: string;
          user_id: string;
          account_id: string | null;
          trade_link: string | null;
          liquidity_taken: string | null;
          trade_time: string; // time
          trade_date: string; // date
          day_of_week: string;
          market: string;
          setup_type: string;
          liquidity: string;
          sl_size: number; // numeric(10,2)
          direction: 'Long' | 'Short';
          trade_outcome: 'Win' | 'Lose';
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
          rr_hit_1_4: boolean | null;
          partials_taken: boolean | null;
          executed: boolean | null;
          launch_hour: boolean | null;
          strategy_id: string | null; // Added
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
          direction: 'Long' | 'Short';
          trade_outcome: 'Win' | 'Lose';
        };
        Update: Partial<Database['public']['Tables']['demo_trades']['Row']>;
      };

      // ─────────────────────────────────────────────────────────────
      // Duplicated: strategies table (identical structure)
      strategies: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          slug: string;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        }>;
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
