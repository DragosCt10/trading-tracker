import { describe, it, expect } from 'vitest';
import { buildRunningBalance } from '@/utils/tradeLedger/buildRunningBalance';
import type { Trade } from '@/types/trade';

function mkTrade(over: Partial<Trade>): Trade {
  return {
    trade_screens: ['', '', '', ''],
    trade_time: '10:00',
    trade_date: '2026-04-01',
    day_of_week: 'Wednesday',
    market: 'EURUSD',
    setup_type: 'BOS',
    liquidity: 'Internal',
    sl_size: 0,
    direction: 'Long',
    trade_outcome: 'Win',
    session: 'London',
    break_even: false,
    reentry: false,
    news_related: false,
    mss: 'Normal',
    local_high_low: false,
    quarter: 'Q2',
    evaluation: 'A',
    partials_taken: false,
    executed: true,
    launch_hour: false,
    trend: null,
    calculated_profit: 0,
    ...over,
  };
}

describe('buildRunningBalance', () => {
  it('returns empty rows and equal opening/closing for zero trades', () => {
    const res = buildRunningBalance([], 10_000);
    expect(res.rows).toEqual([]);
    expect(res.totals.openingBalance).toBe(10_000);
    expect(res.totals.closingBalance).toBe(10_000);
    expect(res.totals.realizedPnL).toBe(0);
    expect(res.totals.tradeCount).toBe(0);
  });

  it('walks trades chronologically and accumulates running balance', () => {
    const trades: Trade[] = [
      mkTrade({ id: 't-a', trade_date: '2026-04-01', calculated_profit: 100 }),
      mkTrade({ id: 't-b', trade_date: '2026-04-02', calculated_profit: -30 }),
      mkTrade({ id: 't-c', trade_date: '2026-04-03', calculated_profit: 50 }),
    ];
    const { rows, totals } = buildRunningBalance(trades, 1_000);
    expect(rows.map((r) => r.runningBalance)).toEqual([1_100, 1_070, 1_120]);
    expect(totals.realizedPnL).toBe(120);
    expect(totals.closingBalance).toBe(1_120);
    expect(totals.tradeCount).toBe(3);
  });

  it('sorts trades chronologically regardless of input order', () => {
    const trades: Trade[] = [
      mkTrade({ id: 't-c', trade_date: '2026-04-03', calculated_profit: 50 }),
      mkTrade({ id: 't-a', trade_date: '2026-04-01', calculated_profit: 100 }),
      mkTrade({ id: 't-b', trade_date: '2026-04-02', calculated_profit: -30 }),
    ];
    const { rows } = buildRunningBalance(trades, 1_000);
    expect(rows.map((r) => r.trade.id)).toEqual(['t-a', 't-b', 't-c']);
  });

  it('excludes non-executed trades', () => {
    const trades: Trade[] = [
      mkTrade({ id: 't-a', calculated_profit: 100 }),
      mkTrade({ id: 't-b', calculated_profit: 200, executed: false }),
    ];
    const { rows, totals } = buildRunningBalance(trades, 1_000);
    expect(rows).toHaveLength(1);
    expect(totals.realizedPnL).toBe(100);
  });

  it('breaks same-day ties with trade_time then id', () => {
    const trades: Trade[] = [
      mkTrade({ id: 't-b', trade_date: '2026-04-01', trade_time: '11:00', calculated_profit: 10 }),
      mkTrade({ id: 't-a', trade_date: '2026-04-01', trade_time: '09:00', calculated_profit: 20 }),
    ];
    const { rows } = buildRunningBalance(trades, 0);
    expect(rows.map((r) => r.trade.id)).toEqual(['t-a', 't-b']);
  });

  it('treats missing calculated_profit as 0', () => {
    const trades: Trade[] = [
      mkTrade({ id: 't-a', calculated_profit: undefined }),
      mkTrade({ id: 't-b', calculated_profit: 50 }),
    ];
    const { totals } = buildRunningBalance(trades, 500);
    expect(totals.realizedPnL).toBe(50);
    expect(totals.closingBalance).toBe(550);
  });
});
