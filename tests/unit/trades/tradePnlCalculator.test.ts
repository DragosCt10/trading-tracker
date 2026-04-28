import { describe, expect, it } from 'vitest';
import {
  calculateTradePnl,
  MissingFuturesSpecError,
} from '@/utils/helpers/tradePnlCalculator';
import type { CustomFuturesSpec } from '@/types/account-settings';
import type { Trade } from '@/types/trade';

const baseTrade: Pick<Trade, 'trade_outcome' | 'risk_per_trade' | 'risk_reward_ratio' | 'break_even'> = {
  trade_outcome: 'Win',
  risk_per_trade: 1,
  risk_reward_ratio: 2,
  break_even: false,
};

describe('calculateTradePnl — standard branch (preserved)', () => {
  it('Win → risk × RR × balance / 100', () => {
    const r = calculateTradePnl(baseTrade, 10000);
    expect(r.pnl_percentage).toBe(2);
    expect(r.calculated_profit).toBe(200);
    expect(r.calculated_risk_dollars).toBeNull();
    expect(r.spec_source).toBeNull();
  });

  it('Lose → -risk × balance / 100', () => {
    const r = calculateTradePnl({ ...baseTrade, trade_outcome: 'Lose' }, 10000);
    expect(r.pnl_percentage).toBe(-1);
    expect(r.calculated_profit).toBe(-100);
  });

  it('Break-even → 0', () => {
    const r = calculateTradePnl({ ...baseTrade, break_even: true }, 10000);
    expect(r.pnl_percentage).toBe(0);
    expect(r.calculated_profit).toBe(0);
  });

  it('Zero balance → 0', () => {
    const r = calculateTradePnl(baseTrade, 0);
    expect(r.calculated_profit).toBe(0);
  });

  it('object form with type=undefined treats as standard', () => {
    const r = calculateTradePnl(baseTrade, { balance: 10000 });
    expect(r.calculated_profit).toBe(200);
  });
});

describe('calculateTradePnl — futures branch', () => {
  // ES: $50 per point. Test trade: 5 contracts × 5 points × $50 = $1250 risk.
  const esWin: Pick<Trade, 'trade_outcome' | 'risk_reward_ratio' | 'break_even' | 'partials_taken' | 'market' | 'sl_size' | 'num_contracts'> = {
    trade_outcome: 'Win',
    risk_reward_ratio: 2,
    break_even: false,
    partials_taken: false,
    market: 'ES',
    sl_size: 5,
    num_contracts: 5,
  };

  it('Win → contracts × sl × $/unit × RR', () => {
    const r = calculateTradePnl(esWin, { balance: 50000, type: 'futures' });
    expect(r.calculated_risk_dollars).toBe(1250); // 5 × 5 × 50
    expect(r.calculated_profit).toBe(2500); // 1250 × 2
    expect(r.pnl_percentage).toBeCloseTo(5);
    expect(r.spec_source).toBe('hardcoded');
  });

  it('Lose → -(contracts × sl × $/unit)', () => {
    const r = calculateTradePnl({ ...esWin, trade_outcome: 'Lose' }, { balance: 50000, type: 'futures' });
    expect(r.calculated_profit).toBe(-1250);
    expect(r.calculated_risk_dollars).toBe(1250);
  });

  it('BE without partials → 0 P&L but risk_dollars still recorded', () => {
    const r = calculateTradePnl(
      { ...esWin, trade_outcome: 'BE', break_even: true },
      { balance: 50000, type: 'futures' },
    );
    expect(r.calculated_profit).toBe(0);
    expect(r.calculated_risk_dollars).toBe(1250);
  });

  it('BE with partials → counts as Win formula (positive)', () => {
    const r = calculateTradePnl(
      { ...esWin, trade_outcome: 'BE', break_even: true, partials_taken: true },
      { balance: 50000, type: 'futures' },
    );
    expect(r.calculated_profit).toBe(2500); // win formula, mirrors macroStats expectation
  });

  it('zero contracts or zero sl → zero everything', () => {
    expect(
      calculateTradePnl({ ...esWin, num_contracts: 0 }, { balance: 50000, type: 'futures' }).calculated_profit,
    ).toBe(0);
    expect(
      calculateTradePnl({ ...esWin, sl_size: 0 }, { balance: 50000, type: 'futures' }).calculated_profit,
    ).toBe(0);
  });

  it('throws MissingFuturesSpecError when symbol unknown and override absent', () => {
    expect(() =>
      calculateTradePnl(
        { ...esWin, market: 'NEVERHEARDOF' },
        { balance: 50000, type: 'futures' },
      ),
    ).toThrow(MissingFuturesSpecError);
  });

  it('falls through to per-trade override (tier 3)', () => {
    const r = calculateTradePnl(
      { ...esWin, market: 'NEVERHEARDOF', dollar_per_sl_unit_override: 10 },
      { balance: 50000, type: 'futures' },
    );
    // 5 × 5 × 10 = 250, win × 2 = 500.
    expect(r.calculated_risk_dollars).toBe(250);
    expect(r.calculated_profit).toBe(500);
    expect(r.spec_source).toBe('override');
  });

  it('uses tier 2 (custom spec) when symbol absent from canonical catalog', () => {
    const customSpecs: CustomFuturesSpec[] = [
      {
        symbol: 'NEVERHEARDOF',
        dollarPerSlUnit: 7,
        slUnitLabel: 'point',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];
    const r = calculateTradePnl(
      { ...esWin, market: 'NEVERHEARDOF' },
      { balance: 50000, type: 'futures' },
      customSpecs,
    );
    expect(r.calculated_risk_dollars).toBe(175); // 5 × 5 × 7
    expect(r.spec_source).toBe('custom');
  });

  it('uppercases symbol before lookup', () => {
    const r = calculateTradePnl({ ...esWin, market: 'es' }, { balance: 50000, type: 'futures' });
    expect(r.spec_source).toBe('hardcoded');
    expect(r.calculated_risk_dollars).toBe(1250);
  });
});
