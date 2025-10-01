export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      trades: {
        Row: {
          id: string
          user_id: string
          trade_link: string | null
          liquidity_taken: string | null
          trade_time: string // time (HH:MM:SS)
          trade_date: string // date (YYYY-MM-DD)
          day_of_week: string
          market: string
          setup_type: string
          liquidity: string
          sl_size: string // numeric(10,2) as string
          direction: 'Long' | 'Short'
          trade_outcome: 'Win' | 'Lose'
          break_even: boolean | null
          reentry: boolean | null
          news_related: boolean | null
          mss: string
          risk_reward_ratio: string | null // numeric(10,2) as string
          risk_reward_ratio_long: string | null // numeric(10,2) as string
          local_high_low: boolean | null
          created_at: string | null // timestamp with time zone
          updated_at: string | null // timestamp with time zone
          risk_per_trade: string | null // numeric as string
          calculated_profit: string | null // numeric as string
          account_id: string | null
          mode: string | null
          notes: string | null
          pnl_percentage: string | null // numeric as string
          quarter: string | null
          evaluation: string | null
          rr_hit_1_4: boolean | null
          partials_taken: boolean | null
          executed: boolean | null
          launch_hour: boolean | null
        }
        Insert: {
          id?: string
          user_id: string
          trade_link?: string | null
          liquidity_taken?: string | null
          trade_time: string
          trade_date: string
          day_of_week: string
          market: string
          setup_type: string
          liquidity: string
          sl_size?: string // numeric(10,2) as string
          direction: 'Long' | 'Short'
          trade_outcome: 'Win' | 'Lose'
          break_even?: boolean | null
          reentry?: boolean | null
          news_related?: boolean | null
          mss: string
          risk_reward_ratio?: string | null
          risk_reward_ratio_long?: string | null
          local_high_low?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          risk_per_trade?: string | null
          calculated_profit?: string | null
          account_id?: string | null
          mode?: string | null
          notes?: string | null
          pnl_percentage?: string | null
          quarter?: string | null
          evaluation?: string | null
          rr_hit_1_4?: boolean | null
          partials_taken?: boolean | null
          executed?: boolean | null
          launch_hour?: boolean | null
        }
        Update: {
          id?: string
          user_id?: string
          trade_link?: string | null
          liquidity_taken?: string | null
          trade_time?: string
          trade_date?: string
          day_of_week?: string
          market?: string
          setup_type?: string
          liquidity?: string
          sl_size?: string
          direction?: 'Long' | 'Short'
          trade_outcome?: 'Win' | 'Lose'
          break_even?: boolean | null
          reentry?: boolean | null
          news_related?: boolean | null
          mss?: string
          risk_reward_ratio?: string | null
          risk_reward_ratio_long?: string | null
          local_high_low?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          risk_per_trade?: string | null
          calculated_profit?: string | null
          account_id?: string | null
          mode?: string | null
          notes?: string | null
          pnl_percentage?: string | null
          quarter?: string | null
          evaluation?: string | null
          rr_hit_1_4?: boolean | null
          partials_taken?: boolean | null
          executed?: boolean | null
          launch_hour?: boolean | null
        }
        Relationships: [] 
      }
      account_settings: {
        Row: {
          id: string
          user_id: string
          account_balance: number
          currency: string
          created_at: string
          updated_at: string
          name: string
          mode: string
          is_active: boolean
          is_dashboard_public: boolean | null
          dashboard_hash: string | null
          description: string | null
        }
        Insert: {
          id?: string
          user_id: string
          account_balance: number
          currency?: string
          created_at?: string
          updated_at?: string
          name?: string
          mode?: string
          is_active?: boolean
          is_dashboard_public?: boolean | null
          dashboard_hash?: string | null
          description?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          account_balance?: number
          currency?: string
          created_at?: string
          updated_at?: string
          name?: string
          mode?: string
          is_active?: boolean
          is_dashboard_public?: boolean | null
          dashboard_hash?: string | null
          description?: string | null
        }
        Relationships: [] 
      }
      live_trades: {
        Row: Database['public']['Tables']['trades']['Row']
        Insert: Database['public']['Tables']['trades']['Insert']
        Update: Database['public']['Tables']['trades']['Update']
        Relationships: []
      }
      demo_trades: {
        Row: Database['public']['Tables']['trades']['Row']
        Insert: Database['public']['Tables']['trades']['Insert']
        Update: Database['public']['Tables']['trades']['Update']
        Relationships: []
      }
      backtesting_trades: {
        Row: Database['public']['Tables']['trades']['Row']
        Insert: Database['public']['Tables']['trades']['Insert']
        Update: Database['public']['Tables']['trades']['Update']
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export const tableMap = {
  live: "live_trades",
  demo: "demo_trades",
  backtesting: "backtesting_trades",
} as const

export type Mode = keyof typeof tableMap
export type TradeTable = typeof tableMap[Mode]