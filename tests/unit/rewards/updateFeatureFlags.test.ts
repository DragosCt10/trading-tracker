/**
 * Tests for updateFeatureFlags in settings.ts.
 *
 * After SC3, feature_flags only contains `trade_badge` (discounts moved to user_discounts).
 * The optimistic locking retry loop was replaced with a plain upsert since trade_badge is
 * always a full overwrite (idempotent concurrent writes).
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/lib/server/supabaseAdmin');

import { createAdminClient } from '@/lib/server/supabaseAdmin';
import { updateFeatureFlags } from '@/lib/server/settings';

const mockedCreateAdminClient = vi.mocked(createAdminClient);

describe('updateFeatureFlags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upserts the feature_flags row', async () => {
    const upsertFn = vi.fn().mockResolvedValue({ error: null });
    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ upsert: upsertFn }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const flags = { trade_badge: { id: 'rookie_trader', totalTrades: 100, achievedAt: '2026-01-01T00:00:00Z' } };
    await updateFeatureFlags('user-1', flags);

    expect(upsertFn).toHaveBeenCalledOnce();
    expect(upsertFn).toHaveBeenCalledWith(
      { user_id: 'user-1', feature_flags: flags },
      { onConflict: 'user_id' },
    );
  });

  it('throws when upsert fails', async () => {
    const upsertFn = vi.fn().mockResolvedValue({ error: { message: 'DB error', code: '42501' } });
    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ upsert: upsertFn }),
    } as unknown as ReturnType<typeof createAdminClient>);

    await expect(updateFeatureFlags('user-1', {})).rejects.toThrow('upsert failed');
  });

  it('no-ops when userId is empty', async () => {
    await updateFeatureFlags('', {});
    expect(mockedCreateAdminClient).not.toHaveBeenCalled();
  });

  it('passes through unknown passthrough keys in flags', async () => {
    const upsertFn = vi.fn().mockResolvedValue({ error: null });
    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ upsert: upsertFn }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const flags = { trade_badge: { id: 'rookie_trader', totalTrades: 100, achievedAt: '2026-01-01' }, future_feature: true } as never;
    await updateFeatureFlags('user-1', flags);

    expect(upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ feature_flags: flags }),
      { onConflict: 'user_id' },
    );
  });
});
