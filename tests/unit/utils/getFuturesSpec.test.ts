import { describe, expect, it } from 'vitest';
import {
  FUTURES_SPECS,
  getFuturesSpec,
  normalizeFuturesSymbol,
  validateCustomFuturesSpec,
} from '@/constants/futuresSpecs';
import type { CustomFuturesSpec } from '@/types/account-settings';

const customMES: CustomFuturesSpec = {
  symbol: 'MES',
  label: 'Micro E-mini S&P (custom)',
  dollarPerSlUnit: 5,
  slUnitLabel: 'point',
  createdAt: '2026-01-01T00:00:00Z',
};

describe('normalizeFuturesSymbol', () => {
  it('trims + uppercases', () => {
    expect(normalizeFuturesSymbol(' es ')).toBe('ES');
    expect(normalizeFuturesSymbol('zb')).toBe('ZB');
    expect(normalizeFuturesSymbol('6e')).toBe('6E');
  });

  it('returns empty string for null/undefined', () => {
    expect(normalizeFuturesSymbol(null)).toBe('');
    expect(normalizeFuturesSymbol(undefined)).toBe('');
    expect(normalizeFuturesSymbol('')).toBe('');
  });
});

describe('getFuturesSpec — tier 1 (hardcoded)', () => {
  it('resolves ES with full spec', () => {
    const r = getFuturesSpec('ES');
    expect(r).not.toBeNull();
    expect(r!.source).toBe('hardcoded');
    expect(r!.spec.symbol).toBe('ES');
    // Equity-index futures track SL in points: ES is $50/point.
    expect(r!.spec.dollarPerSlUnit).toBe(50);
    expect(r!.spec.slUnitLabel).toBe('point');
  });

  it('resolves case-insensitively', () => {
    expect(getFuturesSpec('es')!.spec.symbol).toBe('ES');
    expect(getFuturesSpec('  Nq  ')!.spec.symbol).toBe('NQ');
  });

  it('resolves grain markets in cents', () => {
    expect(getFuturesSpec('ZC')!.spec.dollarPerSlUnit).toBe(50);
    expect(getFuturesSpec('ZW')!.spec.slUnitLabel).toBe('cent');
  });

  it('resolves treasury markets in 32nds/64ths', () => {
    expect(getFuturesSpec('ZB')!.spec.dollarPerSlUnit).toBe(31.25);
    expect(getFuturesSpec('ZN')!.spec.dollarPerSlUnit).toBe(15.625);
  });
});

describe('getFuturesSpec — tier 2 (custom)', () => {
  it('falls through to user-saved spec when not hardcoded', () => {
    // Pick a symbol that does NOT exist in FUTURES_SPECS.
    const exotic: CustomFuturesSpec = {
      symbol: 'XYZ',
      dollarPerSlUnit: 7,
      slUnitLabel: 'point',
      createdAt: '2026-01-01T00:00:00Z',
    };
    const r = getFuturesSpec('XYZ', [exotic]);
    expect(r).not.toBeNull();
    expect(r!.source).toBe('custom');
    expect(r!.spec.dollarPerSlUnit).toBe(7);
  });

  it('hardcoded wins over custom for the same symbol (precedence)', () => {
    // User has a custom MES with $99 — but MES is in FUTURES_SPECS already.
    const malicious: CustomFuturesSpec = {
      ...customMES,
      symbol: 'MES',
      dollarPerSlUnit: 999,
    };
    if (FUTURES_SPECS['MES']) {
      const r = getFuturesSpec('MES', [malicious]);
      expect(r!.source).toBe('hardcoded');
      expect(r!.spec.dollarPerSlUnit).toBe(FUTURES_SPECS['MES'].dollarPerSlUnit);
    }
  });

  it('returns null when all tiers miss', () => {
    expect(getFuturesSpec('UNKNOWN_SYMBOL_XYZ123')).toBeNull();
    expect(getFuturesSpec('UNKNOWN_SYMBOL_XYZ123', [])).toBeNull();
    expect(getFuturesSpec('', [customMES])).toBeNull();
  });

  it('normalizes custom spec lookup case', () => {
    const exotic: CustomFuturesSpec = {
      symbol: 'foobar',
      dollarPerSlUnit: 1,
      slUnitLabel: 'point',
      createdAt: '2026-01-01T00:00:00Z',
    };
    const r = getFuturesSpec('FoObAr', [exotic]);
    expect(r).not.toBeNull();
    expect(r!.spec.symbol).toBe('FOOBAR');
  });
});

describe('validateCustomFuturesSpec', () => {
  const valid = {
    symbol: 'MES2',
    dollarPerSlUnit: 5,
    slUnitLabel: 'point',
  };

  it('accepts a valid spec', () => {
    expect(validateCustomFuturesSpec(valid)).toBeNull();
  });

  it('rejects empty / invalid symbols', () => {
    expect(validateCustomFuturesSpec({ ...valid, symbol: '' })).toContain('Symbol');
    expect(validateCustomFuturesSpec({ ...valid, symbol: 'a b c' })).toContain('alphanumeric');
    expect(validateCustomFuturesSpec({ ...valid, symbol: 'X'.repeat(20) })).toContain('1-16');
    expect(
      validateCustomFuturesSpec({ ...valid, symbol: 'foo;DROP' }),
    ).toContain('alphanumeric');
  });

  it('rejects collision with hardcoded symbols', () => {
    const err = validateCustomFuturesSpec({ ...valid, symbol: 'ES' });
    expect(err).toContain('already in the catalog');
  });

  it('rejects NaN, Infinity, negative, zero pointValue', () => {
    expect(validateCustomFuturesSpec({ ...valid, dollarPerSlUnit: NaN })).toContain('positive');
    expect(validateCustomFuturesSpec({ ...valid, dollarPerSlUnit: Infinity })).toContain('positive');
    expect(validateCustomFuturesSpec({ ...valid, dollarPerSlUnit: -1 })).toContain('positive');
    expect(validateCustomFuturesSpec({ ...valid, dollarPerSlUnit: 0 })).toContain('positive');
  });

  it('rejects empty unit label', () => {
    expect(validateCustomFuturesSpec({ ...valid, slUnitLabel: '' })).toContain('Unit label');
    expect(validateCustomFuturesSpec({ ...valid, slUnitLabel: '   ' })).toContain('Unit label');
  });

  it('rejects oversized label', () => {
    expect(
      validateCustomFuturesSpec({ ...valid, label: 'X'.repeat(81) }),
    ).toContain('80 characters');
  });
});
