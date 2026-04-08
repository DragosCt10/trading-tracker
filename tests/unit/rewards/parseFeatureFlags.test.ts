import { describe, it, expect, vi } from 'vitest';
import { parseFeatureFlags } from '@/types/featureFlags';

describe('parseFeatureFlags', () => {
  it('returns {} for null input', () => {
    expect(parseFeatureFlags(null)).toEqual({});
  });

  it('returns {} for undefined input', () => {
    expect(parseFeatureFlags(undefined)).toEqual({});
  });

  it('parses a valid complete object', () => {
    const input = {
      available_discounts: [
        { milestoneId: 'rookie_trader', discountPct: 5, used: false, couponCode: 'ROOKIE123', expiresAt: '2026-05-01T00:00:00Z' },
      ],
      pro_retention_discount: { used: true, couponCode: 'PROLOYALTY456' },
      activity_rank_up_discount: { used: false },
      trade_badge: { id: 'skilled_trader', totalTrades: 500, achievedAt: '2026-03-15T00:00:00Z' },
      pending_variant_revert: {
        subscriptionId: 'sub_123',
        normalVariantId: 'var_normal',
        discountedVariantId: 'var_discount',
        discountPct: 10,
        discountId: 'retention',
        appliedAt: '2026-04-01T00:00:00Z',
        revertAttempts: 1,
      },
    };
    const result = parseFeatureFlags(input);
    expect(result.available_discounts).toHaveLength(1);
    expect(result.available_discounts![0].milestoneId).toBe('rookie_trader');
    expect(result.pro_retention_discount?.used).toBe(true);
    expect(result.trade_badge?.id).toBe('skilled_trader');
    expect(result.pending_variant_revert?.subscriptionId).toBe('sub_123');
    expect(result.pending_variant_revert?.revertAttempts).toBe(1);
  });

  it('parses a valid partial object (only trade_badge)', () => {
    const input = { trade_badge: { id: 'rookie_trader', totalTrades: 100, achievedAt: '2026-01-01T00:00:00Z' } };
    const result = parseFeatureFlags(input);
    expect(result.trade_badge?.id).toBe('rookie_trader');
    expect(result.available_discounts).toBeUndefined();
    expect(result.pro_retention_discount).toBeUndefined();
    expect(result.pending_variant_revert).toBeUndefined();
  });

  it('warns and returns {} for invalid field type', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const input = { available_discounts: 'not-an-array' };
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

  it('handles pending_variant_revert set to null', () => {
    const input = { pending_variant_revert: null };
    const result = parseFeatureFlags(input);
    expect(result.pending_variant_revert).toBeNull();
  });
});
