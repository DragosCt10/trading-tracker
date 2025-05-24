export interface AccountSettings {
  id: string;
  user_id: string;
  account_balance: number;
  currency: Currency;
  created_at: string;
  updated_at: string;
  name: string;
  mode: TradingMode;
  is_active: boolean;
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

export type Currency = typeof AVAILABLE_CURRENCIES[number];

export const TRADING_MODES = [
  'live',
  'demo',
  'backtesting',
] as const;

export type TradingMode = typeof TRADING_MODES[number];