import { describe, it, expect, vi } from 'vitest';
import { constructCreateTradePayload, constructUpdateTradePayload } from '@/utils/constructTradePayload';
import type { Trade } from '@/types/trade';

// Mock dependencies
vi.mock('@/utils/validateMarket', () => ({
  normalizeMarket: (m: string) => m.trim().toUpperCase(),
}));

vi.mock('@/utils/helpers/tradePnlCalculator', () => ({
  calculateTradePnl: (_trade: unknown, balance: number) => ({
    pnl_percentage: balance > 0 ? 1.0 : 0,
    calculated_profit: balance > 0 ? 100 : 0,
  }),
}));

vi.mock('@/utils/tradeExecutedAt', () => ({
  tradeDateAndTimeToUtcISO: (date: string, time: string) =>
    date && time ? `${date}T${time}:00Z` : null,
}));

vi.mock('@/constants/analytics', () => ({
  getIntervalForTime: (time: string) =>
    time === '09:30' ? { start: '09:30', end: '10:00' } : null,
}));

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    trade_screens: ['', '', '', ''],
    trade_time: '09:30',
    trade_date: '2025-01-15',
    day_of_week: 'Wednesday',
    market: 'eurusd',
    setup_type: 'OTE',
    liquidity: 'HOD',
    direction: 'Long',
    trade_outcome: 'Win',
    session: 'London',
    break_even: false,
    reentry: false,
    news_related: false,
    mss: 'Bullish',
    local_high_low: false,
    notes: 'Test notes',
    quarter: 'Q1',
    evaluation: 'A',
    partials_taken: false,
    executed: true,
    launch_hour: false,
    trend: 'Trend-following',
    strategy_id: 'strat-1',
    risk_per_trade: 0.5,
    risk_reward_ratio: 2,
    risk_reward_ratio_long: 3,
    displacement_size: 10,
    sl_size: 5,
    fvg_size: 1.5,
    tags: ['setup-a', 'Reversal'],
    ...overrides,
  };
}

describe('constructCreateTradePayload', () => {
  it('normalizes market to uppercase', () => {
    const { tradePayload } = constructCreateTradePayload(makeTrade({ market: 'eurusd' }), 10000);
    expect(tradePayload.market).toBe('EURUSD');
  });

  it('computes P&L from account balance', () => {
    const { pnl_percentage, calculated_profit } = constructCreateTradePayload(makeTrade(), 10000);
    expect(pnl_percentage).toBe(1.0);
    expect(calculated_profit).toBe(100);
  });

  it('returns zero P&L for zero balance', () => {
    const { pnl_percentage, calculated_profit } = constructCreateTradePayload(makeTrade(), 0);
    expect(pnl_percentage).toBe(0);
    expect(calculated_profit).toBe(0);
  });

  it('strips id, user_id, account_id from payload', () => {
    const trade = makeTrade();
    trade.id = 'trade-123';
    trade.user_id = 'user-1';
    trade.account_id = 'acc-1';
    const { tradePayload } = constructCreateTradePayload(trade, 10000);
    expect(tradePayload).not.toHaveProperty('id');
    expect(tradePayload).not.toHaveProperty('user_id');
    expect(tradePayload).not.toHaveProperty('account_id');
  });

  it('defaults risk_reward_ratio_long to risk_reward_ratio for Win without selection', () => {
    const { tradePayload } = constructCreateTradePayload(
      makeTrade({ trade_outcome: 'Win', risk_reward_ratio: 2.5, risk_reward_ratio_long: undefined }),
      10000,
    );
    expect(tradePayload.risk_reward_ratio_long).toBe(2.5);
  });

  it('preserves risk_reward_ratio_long when explicitly set for Win', () => {
    const { tradePayload } = constructCreateTradePayload(
      makeTrade({ trade_outcome: 'Win', risk_reward_ratio_long: 4 }),
      10000,
    );
    expect(tradePayload.risk_reward_ratio_long).toBe(4);
  });

  it('sets trade_executed_at from date and time', () => {
    const { tradePayload } = constructCreateTradePayload(makeTrade(), 10000);
    expect(tradePayload.trade_executed_at).toBe('2025-01-15T09:30:00Z');
  });
});

describe('constructUpdateTradePayload', () => {
  it('normalizes market to uppercase', () => {
    const result = constructUpdateTradePayload(makeTrade({ market: 'gbpusd' }));
    expect(result.market).toBe('GBPUSD');
  });

  it('normalizes trade time via getIntervalForTime', () => {
    const result = constructUpdateTradePayload(makeTrade({ trade_time: '09:30' }));
    expect(result.trade_time).toBe('09:30');
  });

  it('sets risk_reward_ratio_long to 0 for Lose outcome', () => {
    const result = constructUpdateTradePayload(makeTrade({ trade_outcome: 'Lose', risk_reward_ratio_long: 5 }));
    expect(result.risk_reward_ratio_long).toBe(0);
  });

  it('sets risk_reward_ratio_long to 0 for BE outcome', () => {
    const result = constructUpdateTradePayload(makeTrade({ trade_outcome: 'BE' }));
    expect(result.risk_reward_ratio_long).toBe(0);
  });

  it('preserves risk_reward_ratio_long for Win outcome', () => {
    const result = constructUpdateTradePayload(makeTrade({ trade_outcome: 'Win', risk_reward_ratio_long: 4 }));
    expect(result.risk_reward_ratio_long).toBe(4);
  });

  it('clears news fields when news_related is false', () => {
    const result = constructUpdateTradePayload(makeTrade({ news_related: false, news_name: 'CPI', news_intensity: 3 }));
    expect(result.news_name).toBeNull();
    expect(result.news_intensity).toBeNull();
  });

  it('preserves news fields when news_related is true', () => {
    const result = constructUpdateTradePayload(makeTrade({ news_related: true, news_name: 'NFP', news_intensity: 2 }));
    expect(result.news_name).toBe('NFP');
    expect(result.news_intensity).toBe(2);
  });

  it('lowercases and trims tags', () => {
    const result = constructUpdateTradePayload(makeTrade({ tags: [' Setup-A ', 'REVERSAL'] }));
    expect(result.tags).toEqual(['setup-a', 'reversal']);
  });

  it('filters out empty tags', () => {
    const result = constructUpdateTradePayload(makeTrade({ tags: ['valid', '', '  '] }));
    expect(result.tags).toEqual(['valid']);
  });

  it('handles null tags gracefully', () => {
    const result = constructUpdateTradePayload(makeTrade({ tags: null }));
    expect(result.tags).toEqual([]);
  });

  it('includes trade_executed_at', () => {
    const result = constructUpdateTradePayload(makeTrade());
    expect(result.trade_executed_at).toBe('2025-01-15T09:30:00Z');
  });
});
