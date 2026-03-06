/**
 * Centralised query-key factory.
 *
 * Always build keys through these functions so that invalidateQueries /
 * setQueryData / getQueryData calls stay in sync with the actual keys used
 * in useQuery calls — no more silent mismatches from typos.
 *
 * Usage:
 *   queryKey: queryKeys.userDetails()
 *   queryClient.invalidateQueries({ queryKey: queryKeys.trades.all(mode, accountId, userId, year) })
 */
export const queryKeys = {
  userDetails: () => ['userDetails'] as const,

  settings: (userId?: string) =>
    ['settings', userId] as const,

  accounts: (userId?: string, mode?: string) =>
    ['accounts:list', userId, mode] as const,

  strategies: (userId?: string) =>
    ['strategies:list', userId] as const,

  archivedStrategies: (userId?: string) =>
    ['archived-strategies', userId] as const,

  trades: {
    all: (
      mode: string,
      accountId: string | undefined,
      userId: string | undefined,
      year: number,
      strategyId?: string | null
    ) => ['allTrades', mode, accountId, userId, year, strategyId] as const,

    filtered: (
      mode: string,
      accountId: string | undefined,
      userId: string | undefined,
      viewMode: string,
      startDate: string,
      endDate: string,
      strategyId?: string | null
    ) => ['filteredTrades', mode, accountId, userId, viewMode, startDate, endDate, strategyId] as const,

    nonExecuted: (
      mode: string,
      accountId: string | undefined,
      userId: string | undefined,
      viewMode: string,
      startDate: string,
      endDate: string,
      strategyId?: string | null
    ) => ['nonExecutedTrades', mode, accountId, userId, viewMode, startDate, endDate, strategyId] as const,
  },

  allStrategyTrades: (
    userId: string | undefined,
    accountId: string | undefined,
    mode: string
  ) => ['all-strategy-trades', userId, accountId, mode, 'all-years'] as const,

  allStrategyStats: (
    userId: string | undefined,
    accountId: string | undefined,
    mode: string,
    strategyIds: string
  ) => ['all-strategy-stats', userId, accountId, mode, strategyIds] as const,

  notes: (userId?: string, strategyId?: string) =>
    ['notes', userId, strategyId] as const,

  strategyShares: (
    strategyId: string,
    userId: string,
    accountId: string,
    mode: string
  ) => ['strategy-shares', strategyId, userId, accountId, mode] as const,

  /** My Trades page: all trades for strategy/account/mode (filtering is client-side) */
  myTradesAll: (
    mode: string,
    accountId: string | undefined,
    userId: string | undefined,
    strategyId: string
  ) => ['myTrades-all', mode, accountId, userId, strategyId] as const,
} as const;
