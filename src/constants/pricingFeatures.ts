import type { FeatureItem } from '@/components/pricing/PricingTable';

export const PRICING_FEATURES: FeatureItem[] = [
  { label: 'Stats Board', values: ['1', '2', 'Unlimited'] },
  { label: 'Accounts', values: ['1', '3', 'Unlimited'] },
  { label: 'Trades', values: ['50 / month', '250 / month', 'Unlimited'] },
  { label: 'Trading modes', values: ['Demo only', 'Demo, Live & Backtesting', 'Demo, Live & Backtesting'] },
  { label: 'Core Statistics', values: ['Basic', 'Basic', 'Full suite'] },
  { label: 'Trade Performance Analysis', values: ['Basic', 'Basic', 'Full suite'] },
  { label: 'Social Trading Feed', values: ['Basic', 'Basic', 'Full (attach trades, edit, channels)'] },
  { label: 'Extra Trade Performance Cards', values: ['Basic', 'Full suite', 'Full suite'] },
  { label: 'Export Trades', values: [true, true, true] },
  { label: 'Public Stats Sharing', values: [true, true, true] },
  { label: 'Equity Curve Chart', values: [true, true, true] },
  { label: 'Trades Calendar', values: [true, true, true] },
  { label: 'Custom Stats Builder', values: [false, false, true] },
  { label: 'AI Vision', values: [false, false, true] },
  { label: 'Future Equity', values: [false, false, true] },
  { label: 'Psychological Factors', values: [false, false, true] },
  { label: 'Consistency & Drawdown', values: [false, false, true] },
  { label: 'Performance Ratios', values: [false, false, true] },
  { label: 'Daily Journal', values: [false, false, true] },
  { label: 'Priority Support', values: [false, false, true] },
];
