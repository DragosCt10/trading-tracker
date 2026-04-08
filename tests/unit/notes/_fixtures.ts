/**
 * Shared test fixtures for Insight Vault (notes) tests.
 */
import type { TradingMode } from '@/types/trade';

// ── Constants ────────────────────────────────────────────────────────────

export const MOCK_USER_ID = 'user-uuid-123';
export const MOCK_OTHER_USER_ID = 'user-uuid-other';
export const MOCK_NOTE_ID = 'note-uuid-abc';
export const MOCK_STRATEGY_ID = 'strategy-uuid-1';
export const MOCK_STRATEGY_ID_2 = 'strategy-uuid-2';
export const MOCK_STRATEGY_IDS = [MOCK_STRATEGY_ID, MOCK_STRATEGY_ID_2];

export const MOCK_USER = { id: MOCK_USER_ID, email: 'test@example.com' };

// ── Factories ────────────────────────────────────────────────────────────

export function makeNoteRow(overrides?: Record<string, any>) {
  return {
    id: MOCK_NOTE_ID,
    user_id: MOCK_USER_ID,
    strategy_id: null as string | null,
    strategy_ids: [] as string[],
    title: 'Test Note',
    content: 'Some markdown content',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
    is_pinned: false,
    tags: [] as string[],
    trade_refs: [] as Array<{ id: string; mode: string }>,
    strategy: null as { id: string; name: string; slug: string } | null,
    ...overrides,
  };
}

export function makeStrategy(overrides?: Partial<{ id: string; name: string; slug: string }>) {
  return {
    id: MOCK_STRATEGY_ID,
    name: 'Test Strategy',
    slug: 'test-strategy',
    ...overrides,
  };
}

export function makeTradeRef(overrides?: Partial<{ id: string; mode: TradingMode }>) {
  return {
    id: 'trade-uuid-1',
    mode: 'live' as TradingMode,
    ...overrides,
  };
}

export function makeNoteInput(overrides?: Record<string, any>) {
  return {
    title: 'New Note',
    content: 'Note content here',
    strategy_id: null as string | null,
    strategy_ids: [] as string[],
    is_pinned: false,
    tags: [] as string[],
    trade_refs: [] as Array<{ id: string; mode: TradingMode }>,
    ...overrides,
  };
}

export function makeTradeSummary(overrides?: Record<string, any>) {
  return {
    id: 'trade-uuid-1',
    trade_date: '2026-01-10',
    market: 'EURUSD',
    direction: 'Long',
    trade_outcome: 'Win',
    pnl_percentage: 1.5,
    ...overrides,
  };
}
