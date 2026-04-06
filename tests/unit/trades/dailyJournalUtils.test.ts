import { describe, it, expect } from 'vitest';
import { buildDayChartData, buildDayGroup } from '@/app/(app)/(inside-strategy)/strategy/[strategy]/daily-journal/dailyJournalUtils';
import type { Trade } from '@/types/trade';

/** Minimal trade factory — only populate fields the functions actually read. */
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

// ---------------------------------------------------------------------------
// buildDayChartData
// ---------------------------------------------------------------------------
describe('buildDayChartData', () => {
  it('returns empty array for no trades', () => {
    expect(buildDayChartData([])).toEqual([]);
  });

  it('returns baseline + one point for a single trade', () => {
    const trades = [makeTrade({ trade_date: '2025-06-15', calculated_profit: 50 })];
    const result = buildDayChartData(trades);

    expect(result).toHaveLength(2);
    // baseline
    expect(result[0].profit).toBe(0);
    expect(result[0].date).toEqual(new Date('2025-06-15'));
    // cumulative after trade
    expect(result[1].profit).toBe(50);
  });

  it('accumulates profit cumulatively across multiple trades', () => {
    const trades = [
      makeTrade({ calculated_profit: 100 }),
      makeTrade({ calculated_profit: -30 }),
      makeTrade({ calculated_profit: 50 }),
    ];
    const result = buildDayChartData(trades);

    expect(result).toHaveLength(4); // baseline + 3 trades
    expect(result[0].profit).toBe(0);
    expect(result[1].profit).toBe(100);
    expect(result[2].profit).toBe(70);  // 100 - 30
    expect(result[3].profit).toBe(120); // 100 - 30 + 50
  });

  it('treats null calculated_profit as 0', () => {
    const trades = [
      makeTrade({ calculated_profit: 100 }),
      makeTrade({ calculated_profit: undefined }),
      makeTrade({ calculated_profit: 50 }),
    ];
    const result = buildDayChartData(trades);

    expect(result[1].profit).toBe(100);
    expect(result[2].profit).toBe(100); // undefined → 0
    expect(result[3].profit).toBe(150);
  });
});

// ---------------------------------------------------------------------------
// buildDayGroup
// ---------------------------------------------------------------------------
describe('buildDayGroup', () => {
  it('computes correct stats for mixed trades', () => {
    const trades = [
      makeTrade({ trade_time: '10:00', trade_outcome: 'Win', calculated_profit: 200, break_even: false }),
      makeTrade({ trade_time: '09:00', trade_outcome: 'Lose', calculated_profit: -100, break_even: false }),
      makeTrade({ trade_time: '11:00', trade_outcome: 'Win', calculated_profit: 150, break_even: false }),
    ];
    const group = buildDayGroup('2025-06-15', trades, 10000);

    expect(group.date).toBe('2025-06-15');
    expect(group.totalTrades).toBe(3);
    expect(group.winners).toBe(2);
    expect(group.losers).toBe(1);
    expect(group.breakEven).toBe(0);
    expect(group.totalProfit).toBe(250); // 200 - 100 + 150
    expect(group.isValidProfitFactor).toBe(true);
    expect(group.profitFactor).toBeCloseTo(3.5, 1); // 350/100
  });

  it('sorts trades by trade_time', () => {
    const trades = [
      makeTrade({ trade_time: '14:00', market: 'GBPUSD' }),
      makeTrade({ trade_time: '09:00', market: 'EURUSD' }),
      makeTrade({ trade_time: '11:00', market: 'USDJPY' }),
    ];
    const group = buildDayGroup('2025-06-15', trades, null);

    expect(group.trades[0].market).toBe('EURUSD');
    expect(group.trades[1].market).toBe('USDJPY');
    expect(group.trades[2].market).toBe('GBPUSD');
  });

  it('handles all winners — infinite profit factor', () => {
    const trades = [
      makeTrade({ trade_outcome: 'Win', calculated_profit: 100 }),
      makeTrade({ trade_outcome: 'Win', calculated_profit: 200 }),
    ];
    const group = buildDayGroup('2025-06-15', trades, 10000);

    expect(group.winners).toBe(2);
    expect(group.losers).toBe(0);
    expect(group.profitFactor).toBe(Infinity);
    expect(group.isValidProfitFactor).toBe(false);
  });

  it('handles all losers — zero profit factor', () => {
    const trades = [
      makeTrade({ trade_outcome: 'Lose', calculated_profit: -100 }),
      makeTrade({ trade_outcome: 'Lose', calculated_profit: -50 }),
    ];
    const group = buildDayGroup('2025-06-15', trades, 10000);

    expect(group.winners).toBe(0);
    expect(group.losers).toBe(2);
    expect(group.profitFactor).toBe(0);
    expect(group.isValidProfitFactor).toBe(true);
    expect(group.totalProfit).toBe(-150);
  });

  it('handles all break-even trades', () => {
    const trades = [
      makeTrade({ trade_outcome: 'BE', break_even: true, calculated_profit: 0 }),
      makeTrade({ trade_outcome: 'BE', break_even: true, calculated_profit: 0 }),
    ];
    const group = buildDayGroup('2025-06-15', trades, 10000);

    expect(group.winners).toBe(0);
    expect(group.losers).toBe(0);
    expect(group.breakEven).toBe(2);
    expect(group.totalProfit).toBe(0);
    expect(group.consistency).toBe(0);
  });

  it('counts BE with partials as profitable for consistency', () => {
    const trades = [
      makeTrade({ trade_outcome: 'Win', break_even: false, calculated_profit: 100 }),
      makeTrade({ trade_outcome: 'BE', break_even: true, partials_taken: true, calculated_profit: 20 }),
      makeTrade({ trade_outcome: 'Lose', break_even: false, calculated_profit: -50 }),
    ];
    const group = buildDayGroup('2025-06-15', trades, 10000);

    // realTrades: Win (non-BE) + BE with partials + Lose = 3
    // profitable: Win + BE with partials = 2
    // consistency = 2/3 * 100
    expect(group.consistency).toBeCloseTo(66.67, 1);
  });

  it('handles single trade', () => {
    const trades = [makeTrade({ calculated_profit: 75 })];
    const group = buildDayGroup('2025-06-15', trades, 5000);

    expect(group.totalTrades).toBe(1);
    expect(group.totalProfit).toBe(75);
    expect(group.dayChartData).toHaveLength(2); // baseline + 1 point
  });

  it('formats date correctly', () => {
    const trades = [makeTrade()];
    const group = buildDayGroup('2025-06-15', trades, null);

    expect(group.formattedDate).toBe('Sun, Jun 15, 2025');
  });

  it('computes P&L percentage against account balance', () => {
    const trades = [
      makeTrade({ trade_outcome: 'Win', calculated_profit: 500 }),
    ];
    const group = buildDayGroup('2025-06-15', trades, 10000);

    // 500 / 10000 * 100 = 5%
    expect(group.totalPnLPct).toBeCloseTo(5, 1);
  });

  it('handles null account balance gracefully', () => {
    const trades = [makeTrade({ calculated_profit: 100 })];
    const group = buildDayGroup('2025-06-15', trades, null);

    expect(group.totalPnLPct).toBe(0); // can't compute % without balance
  });
});
