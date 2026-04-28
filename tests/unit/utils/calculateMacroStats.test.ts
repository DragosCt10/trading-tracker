import { describe, expect, it } from 'vitest';
import { calculateMacroStats } from '@/utils/calculateMacroStats';
import type { Trade } from '@/types/trade';

const baseFutures: Partial<Trade> = {
  trade_date: '2026-04-15',
  break_even: false,
  partials_taken: false,
};

describe('calculateMacroStats — futures branch reads stored calculated_profit', () => {
  it('returns profit factor matching stored profits, not re-derived from risk %', () => {
    const trades = [
      { ...baseFutures, id: '1', trade_outcome: 'Win', calculated_profit: 1000, risk_per_trade: undefined } as Trade,
      { ...baseFutures, id: '2', trade_outcome: 'Lose', calculated_profit: -500, risk_per_trade: undefined } as Trade,
      { ...baseFutures, id: '3', trade_outcome: 'Win', calculated_profit: 2000, risk_per_trade: undefined } as Trade,
    ];
    const r = calculateMacroStats(trades, 50000, 'futures');
    // grossProfit = 1000 + 2000 = 3000, grossLoss = 500 → PF = 6
    expect(r.profitFactor).toBe(6);
    // 2 winners out of 3 real trades
    expect(r.consistencyScore).toBeCloseTo(66.666, 1);
  });

  it('treats BE without partials as 0 P&L (excluded from PF)', () => {
    const trades = [
      { ...baseFutures, id: '1', trade_outcome: 'Win', calculated_profit: 1000 } as Trade,
      { ...baseFutures, id: '2', trade_outcome: 'BE', break_even: true, calculated_profit: 0 } as Trade,
    ];
    const r = calculateMacroStats(trades, 50000, 'futures');
    expect(r.profitFactor).toBe(0); // no losses
    // realTrades = [trade 1] (BE without partials excluded), 1 win
    expect(r.consistencyScore).toBe(100);
  });

  it('treats BE with partials as a win using stored profit', () => {
    const trades = [
      {
        ...baseFutures,
        id: '1',
        trade_outcome: 'BE',
        break_even: true,
        partials_taken: true,
        calculated_profit: 750, // already snapshotted as positive at write time
      } as Trade,
      { ...baseFutures, id: '2', trade_outcome: 'Lose', calculated_profit: -250 } as Trade,
    ];
    const r = calculateMacroStats(trades, 50000, 'futures');
    expect(r.profitFactor).toBe(3); // 750 / 250
  });

  it('NaN guard: treats non-finite calculated_profit as 0', () => {
    const trades = [
      { ...baseFutures, id: '1', trade_outcome: 'Win', calculated_profit: NaN } as Trade,
      { ...baseFutures, id: '2', trade_outcome: 'Win', calculated_profit: 100 } as Trade,
    ];
    const r = calculateMacroStats(trades, 50000, 'futures');
    expect(r.profitFactor).toBe(0); // grossProfit = 100, grossLoss = 0
  });
});

describe('calculateMacroStats — standard branch (preserved)', () => {
  it('still re-derives from risk × R:R × balance', () => {
    const trades = [
      {
        ...baseFutures,
        id: '1',
        trade_outcome: 'Win',
        risk_per_trade: 1, // 1% of 10000 = 100 at risk
        risk_reward_ratio: 2,
        calculated_profit: 999, // ignored on standard path
      } as Trade,
    ];
    // No accountType arg → defaults to 'standard'
    const r = calculateMacroStats(trades, 10000);
    // grossProfit = 100 × 2 = 200, grossLoss = 0
    expect(r.profitFactor).toBe(0); // no losses
    expect(r.consistencyScore).toBe(100);
  });
});
