// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useTradeSaveFlow } from '@/hooks/useTradeSaveFlow';
import type { Trade } from '@/types/trade';
import type { Strategy } from '@/types/strategy';

// ── Mocks ──────────────────────────────────────────────────────

const mockInvalidateTradeQueries = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/tradeQueryInvalidation', () => ({
  invalidateAndRefetchTradeQueries: (...args: unknown[]) => mockInvalidateTradeQueries(...args),
}));

const mockUpdateSavedNews = vi.fn().mockResolvedValue(undefined);
const mockUpdateSavedMarkets = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/server/settings', () => ({
  updateSavedNews: (...args: unknown[]) => mockUpdateSavedNews(...args),
  updateSavedMarkets: (...args: unknown[]) => mockUpdateSavedMarkets(...args),
}));

const mockUpdateStrategySetupTypes = vi.fn().mockResolvedValue(undefined);
const mockUpdateStrategyLiquidityTypes = vi.fn().mockResolvedValue(undefined);
const mockSyncStrategyTags = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/server/strategies', () => ({
  updateStrategySetupTypes: (...args: unknown[]) => mockUpdateStrategySetupTypes(...args),
  updateStrategyLiquidityTypes: (...args: unknown[]) => mockUpdateStrategyLiquidityTypes(...args),
  syncStrategyTags: (...args: unknown[]) => mockSyncStrategyTags(...args),
}));

// Mock savedFeatures — pass through so we can verify the hook uses them
vi.mock('@/utils/savedFeatures', () => ({
  mergeNewsIntoSaved: vi.fn((_name: string, _intensity: number | null, saved: unknown[]) => [...saved, { id: 'new', name: _name }]),
  mergeSetupTypeIntoSaved: vi.fn((_name: string, saved: string[]) => [...saved, _name]),
  mergeLiquidityTypeIntoSaved: vi.fn((_name: string, saved: string[]) => [...saved, _name]),
  mergeMarketIntoSaved: vi.fn((_market: string, saved: string[]) => [...saved, _market]),
  normalizeNewsName: vi.fn((n: string) => n.toLowerCase().trim()),
}));

vi.mock('@/lib/queryKeys', () => ({
  queryKeys: {
    settings: (userId: string) => ['settings', userId],
    strategies: (userId: string, accountId: string) => ['strategies', userId, accountId],
  },
}));

// ── Helpers ────────────────────────────────────────────────────

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    trade_screens: [],
    trade_time: '09:00',
    trade_date: '2025-01-15',
    day_of_week: 'Wednesday',
    market: 'EURUSD',
    setup_type: 'OTE',
    liquidity: 'HOD',
    direction: 'Long',
    trade_outcome: 'Win',
    session: 'London',
    break_even: false,
    reentry: false,
    news_related: false,
    mss: 'Bullish',
    local_high_low: false,
    quarter: 'Q1',
    evaluation: 'A',
    partials_taken: false,
    executed: true,
    launch_hour: false,
    trend: 'Trend-following',
    strategy_id: 'strat-1',
    tags: [],
    ...overrides,
  };
}

const mockStrategy: Strategy = {
  id: 'strat-1',
  name: 'Test Strategy',
  slug: 'test-strategy',
  saved_setup_types: ['OTE'],
  saved_liquidity_types: ['HOD'],
  saved_tags: [{ name: 'tag1' }],
} as Strategy;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // Pre-seed cache so setQueryData updaters have data to work with
  queryClient.setQueryData(['settings', 'user-1'], { saved_news: [], saved_markets: ['GBPUSD'] });
  queryClient.setQueryData(['strategies', 'user-1', 'acc-1'], [mockStrategy]);

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return { wrapper, queryClient };
}

// ── Tests ──────────────────────────────────────────────────────

describe('useTradeSaveFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invalidateTradeCache calls invalidateTradeQueries with correct args', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useTradeSaveFlow({
          userId: 'user-1',
          accountId: 'acc-1',
          mode: 'live',
          settings: { saved_news: [], saved_markets: [] },
          currentStrategy: mockStrategy,
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.invalidateTradeCache(['strat-1']);
    });

    expect(mockInvalidateTradeQueries).toHaveBeenCalledWith({
      queryClient: expect.anything(),
      strategyIds: ['strat-1'],
      mode: 'live',
      accountId: 'acc-1',
      userId: 'user-1',
    });
  });

  it('runPostSaveSync syncs news when trade has news_related=true', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useTradeSaveFlow({
          userId: 'user-1',
          accountId: 'acc-1',
          mode: 'live',
          settings: { saved_news: [], saved_markets: [] },
          currentStrategy: mockStrategy,
        }),
      { wrapper },
    );

    const trade = makeTrade({ news_related: true, news_name: 'CPI', news_intensity: 3 });

    await act(async () => {
      await result.current.runPostSaveSync({ trade, strategyIds: ['strat-1'] });
    });

    expect(mockUpdateSavedNews).toHaveBeenCalledTimes(1);
  });

  it('runPostSaveSync does NOT sync news when news_related=false', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useTradeSaveFlow({
          userId: 'user-1',
          accountId: 'acc-1',
          mode: 'live',
          settings: { saved_news: [], saved_markets: [] },
          currentStrategy: mockStrategy,
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.runPostSaveSync({ trade: makeTrade(), strategyIds: ['strat-1'] });
    });

    expect(mockUpdateSavedNews).not.toHaveBeenCalled();
  });

  it('runPostSaveSync syncs setup_type, liquidity, and market', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useTradeSaveFlow({
          userId: 'user-1',
          accountId: 'acc-1',
          mode: 'live',
          settings: { saved_news: [], saved_markets: ['GBPUSD'] },
          currentStrategy: mockStrategy,
        }),
      { wrapper },
    );

    const trade = makeTrade({ setup_type: 'FVG', liquidity: 'LOD', market: 'EURUSD' });

    await act(async () => {
      await result.current.runPostSaveSync({ trade, strategyIds: ['strat-1'] });
    });

    expect(mockUpdateStrategySetupTypes).toHaveBeenCalledTimes(1);
    expect(mockUpdateStrategyLiquidityTypes).toHaveBeenCalledTimes(1);
    expect(mockUpdateSavedMarkets).toHaveBeenCalledTimes(1);
  });

  it('runPostSaveSync syncs tags with pending colors', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useTradeSaveFlow({
          userId: 'user-1',
          accountId: 'acc-1',
          mode: 'live',
          settings: { saved_news: [], saved_markets: [] },
          currentStrategy: mockStrategy,
        }),
      { wrapper },
    );

    const trade = makeTrade({ tags: ['Setup-A', 'reversal'] });

    await act(async () => {
      await result.current.runPostSaveSync({
        trade,
        strategyIds: ['strat-1'],
        pendingTagColors: { 'setup-a': 'purple' },
      });
    });

    expect(mockSyncStrategyTags).toHaveBeenCalledWith(
      'strat-1',
      'user-1',
      expect.arrayContaining([
        expect.objectContaining({ name: 'setup-a', color: 'purple' }),
        expect.objectContaining({ name: 'reversal' }),
      ]),
    );
  });

  it('runPostSaveSync updates React Query cache for settings', async () => {
    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(
      () =>
        useTradeSaveFlow({
          userId: 'user-1',
          accountId: 'acc-1',
          mode: 'live',
          settings: { saved_news: [], saved_markets: ['GBPUSD'] },
          currentStrategy: mockStrategy,
        }),
      { wrapper },
    );

    const trade = makeTrade({ market: 'USDJPY' });

    await act(async () => {
      await result.current.runPostSaveSync({ trade, strategyIds: ['strat-1'] });
    });

    const settingsCache = queryClient.getQueryData(['settings', 'user-1']) as Record<string, unknown>;
    expect(settingsCache.saved_markets).toEqual(expect.arrayContaining(['USDJPY']));
  });

  it('runPostSaveSync updates strategies cache with new setup types', async () => {
    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(
      () =>
        useTradeSaveFlow({
          userId: 'user-1',
          accountId: 'acc-1',
          mode: 'live',
          settings: { saved_news: [], saved_markets: [] },
          currentStrategy: mockStrategy,
        }),
      { wrapper },
    );

    const trade = makeTrade({ setup_type: 'BOS' });

    await act(async () => {
      await result.current.runPostSaveSync({ trade, strategyIds: ['strat-1'] });
    });

    const strategies = queryClient.getQueryData(['strategies', 'user-1', 'acc-1']) as Array<{ saved_setup_types?: string[] }>;
    expect(strategies[0].saved_setup_types).toEqual(expect.arrayContaining(['BOS']));
  });

  it('runPostSaveSync calls onSyncError when a server action fails (8A)', async () => {
    mockUpdateSavedMarkets.mockRejectedValueOnce(new Error('Network error'));
    const onSyncError = vi.fn();

    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useTradeSaveFlow({
          userId: 'user-1',
          accountId: 'acc-1',
          mode: 'live',
          settings: { saved_news: [], saved_markets: [] },
          currentStrategy: mockStrategy,
        }),
      { wrapper },
    );

    const trade = makeTrade({ market: 'EURUSD' });

    await act(async () => {
      await result.current.runPostSaveSync({ trade, strategyIds: ['strat-1'], onSyncError });
    });

    expect(onSyncError).toHaveBeenCalledWith(
      expect.stringContaining('Trade saved'),
    );
  });

  it('runPostSaveSync does not call onSyncError on success', async () => {
    const onSyncError = vi.fn();

    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useTradeSaveFlow({
          userId: 'user-1',
          accountId: 'acc-1',
          mode: 'live',
          settings: { saved_news: [], saved_markets: [] },
          currentStrategy: mockStrategy,
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.runPostSaveSync({ trade: makeTrade(), strategyIds: ['strat-1'], onSyncError });
    });

    expect(onSyncError).not.toHaveBeenCalled();
  });

  it('skips all syncs when userId is undefined', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useTradeSaveFlow({
          userId: undefined,
          accountId: 'acc-1',
          mode: 'live',
          settings: { saved_news: [], saved_markets: [] },
          currentStrategy: mockStrategy,
        }),
      { wrapper },
    );

    const trade = makeTrade({ news_related: true, news_name: 'CPI', setup_type: 'OTE', market: 'EURUSD' });

    await act(async () => {
      await result.current.runPostSaveSync({ trade, strategyIds: ['strat-1'] });
    });

    // None of the server actions should be called when userId is missing
    expect(mockUpdateSavedNews).not.toHaveBeenCalled();
    expect(mockUpdateStrategySetupTypes).not.toHaveBeenCalled();
    expect(mockUpdateSavedMarkets).not.toHaveBeenCalled();
  });

  it('skips strategy syncs when currentStrategy is undefined', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useTradeSaveFlow({
          userId: 'user-1',
          accountId: 'acc-1',
          mode: 'live',
          settings: { saved_news: [], saved_markets: [] },
          currentStrategy: undefined,
        }),
      { wrapper },
    );

    const trade = makeTrade({ setup_type: 'OTE', liquidity: 'HOD', tags: ['tag1'] });

    await act(async () => {
      await result.current.runPostSaveSync({ trade, strategyIds: ['strat-1'] });
    });

    expect(mockUpdateStrategySetupTypes).not.toHaveBeenCalled();
    expect(mockUpdateStrategyLiquidityTypes).not.toHaveBeenCalled();
    expect(mockSyncStrategyTags).not.toHaveBeenCalled();
    // Market sync should still work (doesn't need strategy)
    expect(mockUpdateSavedMarkets).toHaveBeenCalledTimes(1);
  });
});
