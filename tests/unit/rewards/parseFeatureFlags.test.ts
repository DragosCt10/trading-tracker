import { describe, it, expect, vi } from 'vitest';
import { parseFeatureFlags } from '@/types/featureFlags';

describe('parseFeatureFlags', () => {
  it('returns {} for null input', () => {
    expect(parseFeatureFlags(null)).toEqual({});
  });

  it('returns {} for undefined input', () => {
    expect(parseFeatureFlags(undefined)).toEqual({});
  });

  it('parses a valid trade_badge', () => {
    const input = {
      trade_badge: { id: 'skilled_trader', totalTrades: 500, achievedAt: '2026-03-15T00:00:00Z' },
    };
    const result = parseFeatureFlags(input);
    expect(result.trade_badge?.id).toBe('skilled_trader');
    expect(result.trade_badge?.totalTrades).toBe(500);
  });

  it('warns and returns {} for invalid trade_badge type', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const input = { trade_badge: 'not-an-object' };
    const result = parseFeatureFlags(input);
    expect(result).toEqual({});
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toContain('[parseFeatureFlags]');
    warnSpy.mockRestore();
  });

  it('preserves extra unknown keys via passthrough', () => {
    const input = { future_feature: { enabled: true }, trade_badge: { id: 'x', totalTrades: 1, achievedAt: '2026-01-01' } };
    const result = parseFeatureFlags(input);
    expect((result as Record<string, unknown>).future_feature).toEqual({ enabled: true });
    expect(result.trade_badge?.id).toBe('x');
  });

  it('parses an empty object', () => {
    const result = parseFeatureFlags({});
    expect(result).toEqual({});
  });

  it('ignores legacy discount fields via passthrough (no validation, no error)', () => {
    // Legacy fields from pre-SC3 feature_flags JSONB. parseFeatureFlags should not
    // crash if they're still present in the DB — passthrough lets them through
    // without being exposed as typed fields.
    const input = {
      available_discounts: [{ milestoneId: 'rookie_trader', discountPct: 5, used: false }],
      pro_retention_discount: { used: false },
      trade_badge: { id: 'rookie_trader', totalTrades: 100, achievedAt: '2026-01-01' },
    };
    const result = parseFeatureFlags(input);
    expect(result.trade_badge?.id).toBe('rookie_trader');
    // Legacy fields are preserved via passthrough
    expect((result as Record<string, unknown>).available_discounts).toBeDefined();
  });
});
