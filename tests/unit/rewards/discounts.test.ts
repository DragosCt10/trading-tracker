/**
 * Tests for the user_discounts data access layer (src/lib/server/discounts.ts).
 *
 * These tests verify the atomic SQL operations that replaced the JSONB
 * read-modify-write cycles. The key architectural guarantees are:
 * - `claimDiscount` uses `WHERE coupon_code IS NULL` for idempotent claim
 * - `setPendingRevert` uses conditional WHERE for TOCTOU-free apply
 * - `upsertMilestoneDiscount` uses INSERT ON CONFLICT DO NOTHING
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/lib/server/supabaseAdmin');

import { createAdminClient } from '@/lib/server/supabaseAdmin';
import {
  getUserDiscounts,
  getDiscountByTypeAndMilestone,
  getPendingRevertBySubscription,
  upsertMilestoneDiscount,
  upsertNonMilestoneDiscount,
  claimDiscount,
  markDiscountUsed,
  setPendingRevert,
} from '@/lib/server/discounts';

const mockedCreateAdminClient = vi.mocked(createAdminClient);

// ── Mock row factory (raw DB shape) ──────────────────────────────────────────

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'row-1',
    user_id: 'user-1',
    discount_type: 'milestone',
    milestone_id: 'rookie_trader',
    discount_pct: 5,
    used: false,
    coupon_code: null,
    generated_at: null,
    expires_at: null,
    achieved_at: '2026-01-01T00:00:00Z',
    revert_subscription_id: null,
    revert_normal_variant_id: null,
    revert_discounted_variant_id: null,
    revert_applied_at: null,
    revert_attempts: 0,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// getUserDiscounts
// ─────────────────────────────────────────────────────────────────────────────

describe('getUserDiscounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array for empty userId', async () => {
    const result = await getUserDiscounts('');
    expect(result).toEqual([]);
    expect(mockedCreateAdminClient).not.toHaveBeenCalled();
  });

  it('returns all discount rows for a user, mapped to camelCase', async () => {
    const eqFn = vi.fn().mockResolvedValue({
      data: [makeRow({ milestone_id: 'rookie_trader' }), makeRow({ id: 'row-2', milestone_id: 'skilled_trader' })],
      error: null,
    });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ select: selectFn }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const result = await getUserDiscounts('user-1');

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'row-1',
      userId: 'user-1',
      milestoneId: 'rookie_trader',
      discountType: 'milestone',
      discountPct: 5,
    });
    expect(eqFn).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('returns empty array on DB error', async () => {
    const eqFn = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: eqFn }) }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await getUserDiscounts('user-1');
    expect(result).toEqual([]);
    errorSpy.mockRestore();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getDiscountByTypeAndMilestone
// ─────────────────────────────────────────────────────────────────────────────

describe('getDiscountByTypeAndMilestone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('looks up milestone discount with exact match', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: makeRow({ milestone_id: 'rookie_trader' }), error: null });
    const eq3 = vi.fn().mockReturnValue({ maybeSingle });
    const eq2 = vi.fn().mockReturnValue({ eq: eq3 });
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    const select = vi.fn().mockReturnValue({ eq: eq1 });
    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ select }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const result = await getDiscountByTypeAndMilestone('user-1', 'milestone', 'rookie_trader');

    expect(result?.milestoneId).toBe('rookie_trader');
    expect(eq1).toHaveBeenCalledWith('user_id', 'user-1');
    expect(eq2).toHaveBeenCalledWith('discount_type', 'milestone');
    expect(eq3).toHaveBeenCalledWith('milestone_id', 'rookie_trader');
  });

  it('uses __none__ sentinel for activity/retention by default', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq3 = vi.fn().mockReturnValue({ maybeSingle });
    const eq2 = vi.fn().mockReturnValue({ eq: eq3 });
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: eq1 }) }),
    } as unknown as ReturnType<typeof createAdminClient>);

    await getDiscountByTypeAndMilestone('user-1', 'activity');

    expect(eq3).toHaveBeenCalledWith('milestone_id', '__none__');
  });

  it('returns null when no row exists', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq3 = vi.fn().mockReturnValue({ maybeSingle });
    const eq2 = vi.fn().mockReturnValue({ eq: eq3 });
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: eq1 }) }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const result = await getDiscountByTypeAndMilestone('user-1', 'milestone', 'rookie_trader');
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPendingRevertBySubscription
// ─────────────────────────────────────────────────────────────────────────────

describe('getPendingRevertBySubscription', () => {
  beforeEach(() => vi.clearAllMocks());

  it('queries by user_id and revert_subscription_id', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: makeRow({ revert_subscription_id: 'sub-abc' }),
      error: null,
    });
    const limit = vi.fn().mockReturnValue({ maybeSingle });
    const eq2 = vi.fn().mockReturnValue({ limit });
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: eq1 }) }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const result = await getPendingRevertBySubscription('user-1', 'sub-abc');

    expect(result?.revertSubscriptionId).toBe('sub-abc');
    expect(eq1).toHaveBeenCalledWith('user_id', 'user-1');
    expect(eq2).toHaveBeenCalledWith('revert_subscription_id', 'sub-abc');
  });

  it('returns null when no pending revert exists', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const limit = vi.fn().mockReturnValue({ maybeSingle });
    const eq2 = vi.fn().mockReturnValue({ limit });
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: eq1 }) }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const result = await getPendingRevertBySubscription('user-1', 'sub-abc');
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// upsertMilestoneDiscount
// ─────────────────────────────────────────────────────────────────────────────

describe('upsertMilestoneDiscount', () => {
  beforeEach(() => vi.clearAllMocks());

  it('upserts with ignoreDuplicates (INSERT ON CONFLICT DO NOTHING)', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ upsert }),
    } as unknown as ReturnType<typeof createAdminClient>);

    await upsertMilestoneDiscount('user-1', 'rookie_trader', 5);

    expect(upsert).toHaveBeenCalledOnce();
    const [payload, options] = upsert.mock.calls[0];
    expect(payload).toMatchObject({
      user_id: 'user-1',
      discount_type: 'milestone',
      milestone_id: 'rookie_trader',
      discount_pct: 5,
      used: false,
    });
    expect(options).toMatchObject({
      onConflict: 'user_id,discount_type,milestone_id',
      ignoreDuplicates: true,
    });
  });

  it('no-ops when userId or milestoneId is empty', async () => {
    await upsertMilestoneDiscount('', 'rookie_trader', 5);
    await upsertMilestoneDiscount('user-1', '', 5);
    expect(mockedCreateAdminClient).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// upsertNonMilestoneDiscount
// ─────────────────────────────────────────────────────────────────────────────

describe('upsertNonMilestoneDiscount', () => {
  beforeEach(() => vi.clearAllMocks());

  it('upserts activity discount with __none__ sentinel', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ upsert }),
    } as unknown as ReturnType<typeof createAdminClient>);

    await upsertNonMilestoneDiscount('user-1', 'activity', 15);

    const [payload] = upsert.mock.calls[0];
    expect(payload).toMatchObject({
      user_id: 'user-1',
      discount_type: 'activity',
      milestone_id: '__none__',
      discount_pct: 15,
    });
  });

  it('upserts retention discount with __none__ sentinel', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ upsert }),
    } as unknown as ReturnType<typeof createAdminClient>);

    await upsertNonMilestoneDiscount('user-1', 'retention', 10);

    const [payload] = upsert.mock.calls[0];
    expect(payload).toMatchObject({
      discount_type: 'retention',
      milestone_id: '__none__',
      discount_pct: 10,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// claimDiscount
// ─────────────────────────────────────────────────────────────────────────────

describe('claimDiscount', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns true when UPDATE matches a row with NULL coupon_code', async () => {
    const select = vi.fn().mockResolvedValue({ data: [{ id: 'row-1' }], error: null });
    const is = vi.fn().mockReturnValue({ select });
    const eq = vi.fn().mockReturnValue({ is });
    const update = vi.fn().mockReturnValue({ eq });
    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ update }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const result = await claimDiscount('row-1', 'COUPON-123', '2026-05-01T00:00:00Z');

    expect(result).toBe(true);
    // The critical atomicity guard: WHERE coupon_code IS NULL
    expect(is).toHaveBeenCalledWith('coupon_code', null);
    expect(eq).toHaveBeenCalledWith('id', 'row-1');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        coupon_code: 'COUPON-123',
        expires_at: '2026-05-01T00:00:00Z',
      }),
    );
  });

  it('returns false when UPDATE matches 0 rows (already claimed)', async () => {
    const select = vi.fn().mockResolvedValue({ data: [], error: null });
    const is = vi.fn().mockReturnValue({ select });
    const eq = vi.fn().mockReturnValue({ is });
    const update = vi.fn().mockReturnValue({ eq });
    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ update }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const result = await claimDiscount('row-1', 'COUPON-123', '2026-05-01T00:00:00Z');
    expect(result).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// markDiscountUsed
// ─────────────────────────────────────────────────────────────────────────────

describe('markDiscountUsed', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets used=true and clears all revert columns in one UPDATE', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ update }),
    } as unknown as ReturnType<typeof createAdminClient>);

    await markDiscountUsed('row-1');

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        used: true,
        revert_subscription_id: null,
        revert_normal_variant_id: null,
        revert_discounted_variant_id: null,
        revert_applied_at: null,
        revert_attempts: 0,
      }),
    );
    expect(eq).toHaveBeenCalledWith('id', 'row-1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// setPendingRevert — the TOCTOU-safe atomic UPDATE
// ─────────────────────────────────────────────────────────────────────────────

describe('setPendingRevert', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns true on successful atomic conditional UPDATE', async () => {
    const select = vi.fn().mockResolvedValue({ data: [{ id: 'row-1' }], error: null });
    const orFn = vi.fn().mockReturnValue({ select });
    const is = vi.fn().mockReturnValue({ or: orFn });
    const eq2 = vi.fn().mockReturnValue({ is });
    const not = vi.fn().mockReturnValue({ eq: eq2 });
    const eq1 = vi.fn().mockReturnValue({ not });
    const update = vi.fn().mockReturnValue({ eq: eq1 });
    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ update }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const result = await setPendingRevert('row-1', {
      subscriptionId: 'sub-abc',
      normalVariantId: 'NORMAL',
      discountedVariantId: 'DISC',
    });

    expect(result).toBe(true);
    // All validation happens in the WHERE clause — this is the TOCTOU-free pattern
    expect(eq1).toHaveBeenCalledWith('id', 'row-1');
    expect(not).toHaveBeenCalledWith('coupon_code', 'is', null);
    expect(eq2).toHaveBeenCalledWith('used', false);
    expect(is).toHaveBeenCalledWith('revert_subscription_id', null);
    // or() includes the expiry check
    expect(orFn).toHaveBeenCalledWith(expect.stringContaining('expires_at.is.null'));
  });

  it('returns false when 0 rows updated (TOCTOU race or already applied)', async () => {
    const select = vi.fn().mockResolvedValue({ data: [], error: null });
    const orFn = vi.fn().mockReturnValue({ select });
    const is = vi.fn().mockReturnValue({ or: orFn });
    const eq2 = vi.fn().mockReturnValue({ is });
    const not = vi.fn().mockReturnValue({ eq: eq2 });
    const eq1 = vi.fn().mockReturnValue({ not });
    const update = vi.fn().mockReturnValue({ eq: eq1 });
    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ update }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const result = await setPendingRevert('row-1', {
      subscriptionId: 'sub-abc',
      normalVariantId: 'NORMAL',
      discountedVariantId: 'DISC',
    });

    expect(result).toBe(false);
  });
});
