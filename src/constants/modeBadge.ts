import type { TradingMode } from '@/types/trade';

/** CSS class map for mode badges (live / demo / backtesting). */
export const MODE_BADGE: Record<TradingMode, string> = {
  live: 'themed-badge-live',
  demo: 'themed-badge-demo',
  backtesting: 'themed-badge-backtesting',
};
