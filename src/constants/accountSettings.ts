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
  'NZD',
] as const;

export const TRADING_MODES = [
  'live',
  'demo',
  'backtesting',
] as const;

export const ACCOUNT_TYPES = ['standard', 'futures'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];
