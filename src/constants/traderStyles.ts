export const TRADER_STYLES = [
  'Scalper',
  'Day trader',
  'Swing trader',
  'Position trader',
  'Options trader',
  'Futures trader',
  'Forex trader',
  'Crypto trader',
  'Other',
] as const;

export type TraderStyle = (typeof TRADER_STYLES)[number];
