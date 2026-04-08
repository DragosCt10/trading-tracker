import type { FeatureItem } from '@/components/pricing/PricingTable';

export const PRICING_FEATURES: FeatureItem[] = [
  { label: 'Stats Board', values: ['1', 'Unlimited'] },
  { label: 'Accounts', values: ['1', 'Unlimited'] },
  { label: 'Trades', values: ['50 / month', 'Unlimited'] },
  { label: 'Trading modes', values: ['Demo only', 'Demo, Live & Backtesting'] },
  { label: 'Core Statistics', values: ['Basic', 'Full suite'] },
  { label: 'Trade Performance Analysis', values: ['Basic', 'Full suite'] },
  { label: 'Social Trading Feed', values: ['Basic', 'Full (attach trades, edit, channels)'] },
  { label: 'Extra Trade Performance Cards', values: ['Basic', 'Full suite'] },
  { label: 'Public Stats Sharing', values: [true, true] },
  { label: 'Equity Curve Chart', values: [true, true] },
  { label: 'Trades Calendar', values: [true, true] },
  { label: 'Custom Stats Builder', values: [false, true] },
  { label: 'AI Vision', values: [false, true] },
  { label: 'Future Equity', values: [false, true] },
  { label: 'Psychological Factors', values: [false, true] },
  { label: 'Consistency & Drawdown', values: [false, true] },
  { label: 'Performance Ratios', values: [false, true] },
  { label: 'Daily Journal', values: [false, true] },
  { label: 'Export Trades', values: [false, true] },
  { label: 'Priority Support', values: [false, true] },
];
