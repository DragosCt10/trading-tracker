export interface AccountSettings {
  id: string;                         // uuid
  user_id: string;                    // uuid
  account_balance: number;            // numeric(15, 2)
  currency: Currency;                 // string, max 10 chars
  created_at: string;                 // ISO timestamp string
  updated_at: string;                 // ISO timestamp string
  name: string;                       // max 255 chars
  mode: TradingMode;                  // max 50 chars
  is_active: boolean;
  description: string | null;
}

export const AVAILABLE_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'AUD',
  'CAD',
  'CHF',
  'CNY',
  'HKD',
  'NZD'
] as const;

export type Currency = typeof AVAILABLE_CURRENCIES[number] | string; // support custom/unknown future currencies

export const TRADING_MODES = [
  'live',
  'demo',
  'backtesting',
] as const;

export type TradingMode = typeof TRADING_MODES[number] | string; // string fallback for DB/new/unlisted values