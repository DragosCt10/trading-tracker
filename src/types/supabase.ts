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
          direction: string; // 'Long' | 'Short';
          trade_outcome: string; // 'Win' | 'Lose';
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
          direction: string; // 'Long' | 'Short';
          trade_outcome: string; // 'Win' | 'Lose';
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
          direction: string; // 'Long' | 'Short';
          trade_outcome: string; // 'Win' | 'Lose';
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
          is_active: boolean;
        };
        Insert: {
          user_id: string;
          name: string;
          slug: string;
          is_active?: boolean;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
          is_active: boolean;
        }>;
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
