import { describe, it, expect } from 'vitest';
import { calculateDailyConsistency } from '@/utils/analyticsCalculations';
import type { Trade } from '@/types/trade';

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    trade_screens: [],
    trade_time: '09:00',
    trade_date: '2025-06-15',
    day_of_week: 'Mon',
    market: 'EURUSD',
    setup_type: 'breakout',
    liquidity: 'high',
    sl_size: 10,
    direction: 'Long',
    trade_outcome: 'Win',
    session: 'London',
    break_even: false,
    reentry: false,
    news_related: false,
    mss: 'bullish',
    risk_reward_ratio: 2,
    risk_reward_ratio_long: 2,
    local_high_low: false,
    risk_per_trade: 1,
    calculated_profit: 100,
    quarter: 'Q2',
    evaluation: 'good',
    partials_taken: false,
    executed: true,
    launch_hour: false,
    displacement_size: 1,
    trend: 'up',
    ...overrides,
  };
}

describe('calculateDailyConsistency', () => {
  it('returns 0 for empty trades', () => {
    expect(calculateDailyConsistency([])).toBe(0);
  });

  it('returns 100 for all winners', () => {
    const trades = [
      makeTrade({ trade_outcome: 'Win', break_even: false }),
      makeTrade({ trade_outcome: 'Win', break_even: false }),
    ];
    expect(calculateDailyConsistency(trades)).toBe(100);
  });

  it('returns 0 for all losers', () => {
    const trades = [
      makeTrade({ trade_outcome: 'Lose', break_even: false }),
      makeTrade({ trade_outcome: 'Lose', break_even: false }),
    ];
    expect(calculateDailyConsistency(trades)).toBe(0);
  });

  it('returns 0 for all BE without partials', () => {
    const trades = [
      makeTrade({ trade_outcome: 'BE', break_even: true, partials_taken: false }),
      makeTrade({ trade_outcome: 'BE', break_even: true, partials_taken: false }),
    ];
    // No "real" trades (BE without partials are excluded from real trades count)
    expect(calculateDailyConsistency(trades)).toBe(0);
  });

  it('counts BE with partials as both real and profitable', () => {
    const trades = [
      makeTrade({ trade_outcome: 'BE', break_even: true, partials_taken: true }),
    ];
    // 1 real trade (BE with partials), 1 profitable → 100%
    expect(calculateDailyConsistency(trades)).toBe(100);
  });

  it('computes correctly for mixed trades', () => {
    const trades = [
      makeTrade({ trade_outcome: 'Win', break_even: false }),   // real + profitable
      makeTrade({ trade_outcome: 'Lose', break_even: false }),  // real + not profitable
      makeTrade({ trade_outcome: 'BE', break_even: true, partials_taken: true }),  // real + profitable
      makeTrade({ trade_outcome: 'BE', break_even: true, partials_taken: false }), // excluded
    ];
    // real trades: Win + Lose + BE(partials) = 3
    // profitable: Win + BE(partials) = 2
    // consistency = 2/3 * 100 ≈ 66.67
    expect(calculateDailyConsistency(trades)).toBeCloseTo(66.67, 1);
  });

  it('excludes pure BE from denominator', () => {
    const trades = [
      makeTrade({ trade_outcome: 'Win', break_even: false }),
      makeTrade({ trade_outcome: 'BE', break_even: true, partials_taken: false }),
    ];
    // Only 1 real trade (the Win). 1 profitable. 100%.
    expect(calculateDailyConsistency(trades)).toBe(100);
  });
});
