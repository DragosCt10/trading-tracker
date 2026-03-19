import type { Trade } from '@/types/trade';

/**
 * Shared preview trade builder used for locked (non-Pro) preview UIs.
 * Keep defaults stable so multiple cards can render consistent placeholders.
 */
export function buildPreviewTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    trade_screens: ['', '', '', ''],
    trade_time: '00:00 - 03:59',
    trade_date: '2026-01-01',
    day_of_week: 'Monday',
    market: 'Preview',
    setup_type: '—',
    liquidity: '—',
    sl_size: 0,
    direction: 'Long',
    trade_outcome: 'Win',
    session: 'London',
    break_even: false,
    reentry: false,
    news_related: false,
    mss: '—',
    risk_reward_ratio: 2,
    risk_reward_ratio_long: 2,
    local_high_low: false,
    risk_per_trade: 1,
    calculated_profit: 0,
    pnl_percentage: 0,
    quarter: 'Q1',
    evaluation: '—',
    partials_taken: false,
    executed: true,
    launch_hour: false,
    displacement_size: 0,
    trend: null,
    ...overrides,
  };
}

