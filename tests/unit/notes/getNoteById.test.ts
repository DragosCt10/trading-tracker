/**
 * Tests for getNoteById server action.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Mocks (hoisted) ─────────────────────────────────────────────────────

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/server/session', () => ({ getCachedUserSession: vi.fn() }));
vi.mock('@/lib/server/trades', () => ({ getFullTradesByRefs: vi.fn() }));

import { createMockSupabaseClient } from '../_shared/supabaseMock';
import {
  MOCK_USER_ID,
  MOCK_OTHER_USER_ID,
  MOCK_NOTE_ID,
  MOCK_USER,
  MOCK_STRATEGY_ID,
  makeNoteRow,
  makeStrategy,
  makeTradeRef,
} from './_fixtures';
import { createClient } from '@/utils/supabase/server';
import { getCachedUserSession } from '@/lib/server/session';
import { getFullTradesByRefs } from '@/lib/server/trades';
import { getNoteById } from '@/lib/server/notes';

const mockedGetCachedUserSession = vi.mocked(getCachedUserSession);
const mockedCreateClient = vi.mocked(createClient);
const mockedGetFullTradesByRefs = vi.mocked(getFullTradesByRefs);

// ── Tests ────────────────────────────────────────────────────────────────

describe('getNoteById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCachedUserSession.mockResolvedValue({ user: MOCK_USER } as any);
    mockedGetFullTradesByRefs.mockResolvedValue([]);
  });

  function setupClient(overrides?: Record<string, any>) {
    const client = createMockSupabaseClient({
      notes: {
        singleData: makeNoteRow({
          strategy: makeStrategy(),
          strategy_ids: [],
          trade_refs: [],
          ...overrides,
        }),
      },
      strategies: {
        selectData: [makeStrategy()],
      },
    });
    mockedCreateClient.mockResolvedValue(client as any);
    return client;
  }

  // ── Authentication ──────────────────────────────────────────────────

  it('throws Unauthorized when no user session', async () => {
    mockedGetCachedUserSession.mockResolvedValue({ user: null } as any);
    await expect(getNoteById(MOCK_NOTE_ID, MOCK_USER_ID)).rejects.toThrow('Unauthorized');
  });

  it('throws Unauthorized when user.id does not match', async () => {
    mockedGetCachedUserSession.mockResolvedValue({
      user: { id: MOCK_OTHER_USER_ID },
    } as any);
    await expect(getNoteById(MOCK_NOTE_ID, MOCK_USER_ID)).rejects.toThrow('Unauthorized');
  });

  // ── Not found ───────────────────────────────────────────────────────

  it('returns null when note not found (PGRST116)', async () => {
    const client = createMockSupabaseClient({
      notes: {
        singleData: null,
        singleError: { code: 'PGRST116', message: 'not found' },
      },
    });
    mockedCreateClient.mockResolvedValue(client as any);

    const result = await getNoteById(MOCK_NOTE_ID, MOCK_USER_ID);
    expect(result).toBeNull();
  });

  // ── Success paths ───────────────────────────────────────────────────

  it('returns mapped Note with joined strategy', async () => {
    setupClient();

    const result = await getNoteById(MOCK_NOTE_ID, MOCK_USER_ID);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(MOCK_NOTE_ID);
    expect(result!.strategy).toEqual(makeStrategy());
  });

  it('resolves strategy_ids into strategies array', async () => {
    const strat1 = makeStrategy({ id: 's1', name: 'Strat 1', slug: 'strat-1' });
    const strat2 = makeStrategy({ id: 's2', name: 'Strat 2', slug: 'strat-2' });

    const client = createMockSupabaseClient({
      notes: {
        singleData: makeNoteRow({
          strategy: null,
          strategy_ids: ['s1', 's2'],
          trade_refs: [],
        }),
      },
      strategies: {
        selectData: [strat1, strat2],
      },
    });
    mockedCreateClient.mockResolvedValue(client as any);

    const result = await getNoteById(MOCK_NOTE_ID, MOCK_USER_ID);
    expect(result).not.toBeNull();
    expect(result!.strategies).toEqual([
      { id: 's1', name: 'Strat 1', slug: 'strat-1' },
      { id: 's2', name: 'Strat 2', slug: 'strat-2' },
    ]);
  });

  it('resolves trade_refs via getFullTradesByRefs', async () => {
    const refs = [makeTradeRef({ id: 't1', mode: 'live' })];
    const fullTrades = [
      {
        id: 't1',
        mode: 'live',
        trade_date: '2026-01-10',
        market: 'EURUSD',
        direction: 'Long',
        trade_outcome: 'Win',
      },
    ];
    mockedGetFullTradesByRefs.mockResolvedValue(fullTrades as any);

    const client = createMockSupabaseClient({
      notes: {
        singleData: makeNoteRow({
          strategy: null,
          strategy_ids: [],
          trade_refs: refs,
        }),
      },
    });
    mockedCreateClient.mockResolvedValue(client as any);

    const result = await getNoteById(MOCK_NOTE_ID, MOCK_USER_ID);
    expect(result).not.toBeNull();
    expect(mockedGetFullTradesByRefs).toHaveBeenCalledWith(MOCK_USER_ID, refs);
    expect(result!.trades).toHaveLength(1);
    expect(result!.trades![0].market).toBe('EURUSD');
  });

  it('returns note without trades when trade_refs is empty', async () => {
    setupClient({ trade_refs: [] });

    const result = await getNoteById(MOCK_NOTE_ID, MOCK_USER_ID);
    expect(result).not.toBeNull();
    expect(result!.trades).toBeUndefined();
    expect(mockedGetFullTradesByRefs).not.toHaveBeenCalled();
  });

  // ── Error handling ──────────────────────────────────────────────────

  it('returns null when an unexpected error occurs', async () => {
    // createClient is outside try/catch, but the supabase query is inside.
    // Make the supabase client's .from() throw inside the try/catch block.
    const client = createMockSupabaseClient({});
    client.from = vi.fn(() => { throw new Error('connection failed'); });
    mockedCreateClient.mockResolvedValue(client as any);

    const result = await getNoteById(MOCK_NOTE_ID, MOCK_USER_ID);
    expect(result).toBeNull();
  });
});
