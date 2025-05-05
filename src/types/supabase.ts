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
          created_at: string
          trade_link: string
          liquidity_taken: string
          time: string
          date: string
          day: string
          market: string
          setup: string
          liquidity: string
          sl_size: number
          position_type: 'Long' | 'Short'
          result: 'Win' | 'Lose' | 'BE'
          reentry: boolean
          news: string
          mss: string
          rr: number
          rr_long: number
          local_hl: string
          pnl: number
          user_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          trade_link: string
          liquidity_taken: string
          time: string
          date: string
          day: string
          market: string
          setup: string
          liquidity: string
          sl_size: number
          position_type: 'Long' | 'Short'
          result: 'Win' | 'Lose' | 'BE'
          reentry: boolean
          news: string
          mss: string
          rr: number
          rr_long: number
          local_hl: string
          pnl: number
          user_id: string
        }
        Update: {
          id?: string
          created_at?: string
          trade_link?: string
          liquidity_taken?: string
          time?: string
          date?: string
          day?: string
          market?: string
          setup?: string
          liquidity?: string
          sl_size?: number
          position_type?: 'Long' | 'Short'
          result?: 'Win' | 'Lose' | 'BE'
          reentry?: boolean
          news?: string
          mss?: string
          rr?: number
          rr_long?: number
          local_hl?: string
          pnl?: number
          user_id?: string
        }
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