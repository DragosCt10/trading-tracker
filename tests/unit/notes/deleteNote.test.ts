/**
 * Tests for deleteNote server action.
 *
 * Covers: auth guard, ownership check, successful deletion, DB errors,
 * and ensuring delete is not called when ownership check fails.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/server/session', () => ({ getCachedUserSession: vi.fn() }));
vi.mock('@/lib/server/trades', () => ({ getFullTradesByRefs: vi.fn() }));

import { createMockSupabaseClient } from '../_shared/supabaseMock';
import { MOCK_USER_ID, MOCK_OTHER_USER_ID, MOCK_NOTE_ID, MOCK_USER } from './_fixtures';

import { createClient } from '@/utils/supabase/server';
import { getCachedUserSession } from '@/lib/server/session';
import { deleteNote } from '@/lib/server/notes';

describe('deleteNote', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getCachedUserSession).mockResolvedValue({ user: MOCK_USER } as any);

    const mockClient = createMockSupabaseClient({
      notes: {
        singleData: { id: MOCK_NOTE_ID },
        deleteError: null,
      },
    });
    vi.mocked(createClient).mockResolvedValue(mockClient as any);
  });

  it('returns Unauthorized when no user session', async () => {
    vi.mocked(getCachedUserSession).mockResolvedValue({ user: null } as any);

    const result = await deleteNote(MOCK_NOTE_ID, MOCK_USER_ID);

    expect(result).toEqual({ error: { message: 'Unauthorized' } });
  });

  it('returns Unauthorized when user.id does not match', async () => {
    vi.mocked(getCachedUserSession).mockResolvedValue({
      user: { id: MOCK_OTHER_USER_ID, email: 'other@example.com' },
    } as any);

    const result = await deleteNote(MOCK_NOTE_ID, MOCK_USER_ID);

    expect(result).toEqual({ error: { message: 'Unauthorized' } });
  });

  it('returns Note not found when note does not belong to user', async () => {
    const mockClient = createMockSupabaseClient({
      notes: {
        singleData: null,
        deleteError: null,
      },
    });
    vi.mocked(createClient).mockResolvedValue(mockClient as any);

    const result = await deleteNote(MOCK_NOTE_ID, MOCK_USER_ID);

    expect(result).toEqual({ error: { message: 'Note not found' } });
  });

  it('deletes note and returns null error on success', async () => {
    const result = await deleteNote(MOCK_NOTE_ID, MOCK_USER_ID);

    expect(result).toEqual({ error: null });
  });

  it('returns error message when DB delete fails', async () => {
    const mockClient = createMockSupabaseClient({
      notes: {
        singleData: { id: MOCK_NOTE_ID },
        deleteError: { message: 'DB error', code: 'ERROR' },
      },
    });
    vi.mocked(createClient).mockResolvedValue(mockClient as any);

    const result = await deleteNote(MOCK_NOTE_ID, MOCK_USER_ID);

    expect(result).toEqual({ error: { message: 'DB error' } });
  });

  it('does not call delete when ownership check fails', async () => {
    const mockClient = createMockSupabaseClient({
      notes: {
        singleData: null,
        deleteError: null,
      },
    });
    vi.mocked(createClient).mockResolvedValue(mockClient as any);

    await deleteNote(MOCK_NOTE_ID, MOCK_USER_ID);

    expect(mockClient._deleteSpy).not.toHaveBeenCalled();
  });
});
