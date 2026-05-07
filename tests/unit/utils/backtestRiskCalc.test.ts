import { describe, it, expect } from 'vitest';
import { calculateBacktestRisk } from '@/utils/backtestRiskCalc';

describe('calculateBacktestRisk', () => {
  const baseInputs = {
    entryPrice: 18000,
    slPrice: 17900,
    tpPrice: 18200,
    riskPct: 1,
    balance: 10000,
  };

  it('long: derives direction, distance, RR, and dollar risk', () => {
    const r = calculateBacktestRisk(baseInputs);
    expect(r.direction).toBe('long');
    expect(r.slDistance).toBe(100);
    expect(r.rr).toBe(2);
    expect(r.riskDollars).toBe(100);
    expect(r.projectedPnlDollars).toBe(200);
    expect(r.isValid).toBe(true);
  });

  it('short: SL above entry flips direction', () => {
    const r = calculateBacktestRisk({
      ...baseInputs,
      entryPrice: 18000,
      slPrice: 18100,
      tpPrice: 17800,
    });
    expect(r.direction).toBe('short');
    expect(r.slDistance).toBe(100);
    expect(r.rr).toBeCloseTo(2, 10);
    expect(r.projectedPnlDollars).toBeCloseTo(200, 10);
    expect(r.isValid).toBe(true);
  });

  it('TP on the wrong side of entry yields RR=0 (still valid risk)', () => {
    // Long setup but TP placed below entry — chart UX would normally prevent
    // this, but the calc must not produce a negative RR.
    const r = calculateBacktestRisk({
      ...baseInputs,
      slPrice: 17900,
      tpPrice: 17800,
    });
    expect(r.direction).toBe('long');
    expect(r.rr).toBe(0);
    expect(r.projectedPnlDollars).toBe(0);
    expect(r.isValid).toBe(true);
  });

  it('TP not set: returns risk but zero RR/PnL', () => {
    const r = calculateBacktestRisk({ ...baseInputs, tpPrice: null });
    expect(r.rr).toBe(0);
    expect(r.projectedPnlDollars).toBe(0);
    expect(r.riskDollars).toBe(100);
    expect(r.isValid).toBe(true);
  });

  it('entry equals SL: zero everything (degenerate placement)', () => {
    const r = calculateBacktestRisk({ ...baseInputs, slPrice: 18000 });
    expect(r.direction).toBe('flat');
    expect(r.slDistance).toBe(0);
    expect(r.isValid).toBe(false);
  });

  it('entry not set: zero everything', () => {
    const r = calculateBacktestRisk({ ...baseInputs, entryPrice: null });
    expect(r.isValid).toBe(false);
    expect(r.riskDollars).toBe(0);
  });

  it('zero balance: distance + direction still computed but risk-$ zero', () => {
    const r = calculateBacktestRisk({ ...baseInputs, balance: 0 });
    expect(r.direction).toBe('long');
    expect(r.slDistance).toBe(100);
    expect(r.rr).toBe(2);
    expect(r.riskDollars).toBe(0);
    expect(r.isValid).toBe(false);
  });

  it('negative riskPct: clamped to 0 risk-$', () => {
    const r = calculateBacktestRisk({ ...baseInputs, riskPct: -1 });
    expect(r.riskDollars).toBe(0);
    expect(r.isValid).toBe(false);
  });

  it('NaN inputs: gracefully degrades to zero', () => {
    const r = calculateBacktestRisk({
      entryPrice: Number.NaN,
      slPrice: 10,
      tpPrice: 20,
      riskPct: 1,
      balance: 1000,
    });
    expect(r.isValid).toBe(false);
    expect(r.direction).toBe('flat');
  });

  it('asymmetric RR (e.g. 1:3) computes correctly', () => {
    const r = calculateBacktestRisk({
      entryPrice: 18000,
      slPrice: 17950,  // 50-pt risk
      tpPrice: 18150,  // 150-pt reward
      riskPct: 0.5,
      balance: 50000,
    });
    expect(r.rr).toBeCloseTo(3, 10);
    expect(r.riskDollars).toBe(250);
    expect(r.projectedPnlDollars).toBe(750);
  });
});
