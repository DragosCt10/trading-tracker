/**
 * Tests for updateFeatureFlags optimistic locking in settings.ts
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/lib/server/supabaseAdmin');

import { createAdminClient } from '@/lib/server/supabaseAdmin';
import { updateFeatureFlags } from '@/lib/server/settings';

const mockedCreateAdminClient = vi.mocked(createAdminClient);

function buildSelectMock(existing: { version: number } | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: existing, error: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  return { select };
}

function buildUpdateMock(rowsAffected: number) {
  const select = vi.fn().mockResolvedValue({ data: rowsAffected > 0 ? [{ user_id: 'u1' }] : [], error: null });
  const eq2 = vi.fn().mockReturnValue({ select });
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
  const update = vi.fn().mockReturnValue({ eq: eq1 });
  return { update };
}

describe('updateFeatureFlags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts a new row when user_settings does not exist', async () => {
    const insertFn = vi.fn().mockResolvedValue({ error: null });
    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        ...buildSelectMock(null),
        insert: insertFn,
      }),
    } as unknown as ReturnType<typeof createAdminClient>);

    await updateFeatureFlags('user-1', { trade_badge: { id: 'rookie' } });

    expect(insertFn).toHaveBeenCalledOnce();
    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      version: 1,
      feature_flags: { trade_badge: { id: 'rookie' } },
    }));
  });

  it('throws when insert fails with non-conflict error', async () => {
    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        ...buildSelectMock(null),
        insert: vi.fn().mockResolvedValue({ error: { message: 'DB error', code: '42501' } }),
      }),
    } as unknown as ReturnType<typeof createAdminClient>);

    await expect(updateFeatureFlags('user-1', {})).rejects.toThrow('failed');
  });

  it('updates with incremented version when row exists', async () => {
    const updateFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [{ user_id: 'user-1' }], error: null }),
        }),
      }),
    });
    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        ...buildSelectMock({ version: 5 }),
        update: updateFn,
      }),
    } as unknown as ReturnType<typeof createAdminClient>);

    await updateFeatureFlags('user-1', { foo: 'bar' });

    expect(updateFn).toHaveBeenCalledOnce();
    expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({ version: 6, feature_flags: { foo: 'bar' } }));
  });

  it('throws after exhausting retries on persistent version conflict', async () => {
    // Simulates another writer always winning — update always returns 0 rows
    const updateFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [], error: null }), // 0 rows = version mismatch
        }),
      }),
    });
    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { version: 1 }, error: null }),
          }),
        }),
        update: updateFn,
      })),
    } as unknown as ReturnType<typeof createAdminClient>);

    await expect(updateFeatureFlags('user-1', {})).rejects.toThrow('persistent conflict');
  });

  it('no-ops when userId is empty', async () => {
    await updateFeatureFlags('', {});
    expect(mockedCreateAdminClient).not.toHaveBeenCalled();
  });
});
