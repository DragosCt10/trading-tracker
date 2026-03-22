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

  strategies: (userId?: string, accountId?: string) =>
    ['strategies:list', userId, accountId] as const,

  /** Per-account strategy stats + equity curves (StrategyCard, My Trades cumulative PnL). Invalidate on trade mutations. */
  strategiesOverview: (userId?: string, accountId?: string, mode?: string) =>
    ['strategies-overview', userId, accountId, mode] as const,

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

  /**
   * Pre-computed dashboard stats from /api/dashboard-stats.
   * selectedMarket is excluded — market filtering is handled client-side by the Web Worker.
   * selectedExecution is included so each execution mode is cached separately.
   */
  dashboardStats: (
    mode: string,
    accountId: string | undefined,
    userId: string | undefined,
    strategyId: string | null | undefined,
    selectedYear: number,
    viewMode: string,
    startDate: string,
    endDate: string,
    selectedExecution: string,
    market: string,
  ) => [
    'dashboardStats', mode, accountId, userId, strategyId,
    selectedYear, viewMode, startDate, endDate,
    selectedExecution, market,
  ] as const,

  /**
   * Compact trades cache key — mirrors dashboardStats but used to store/read
   * the compact_trades array separately for the Web Worker.
   */
  compactTrades: (
    mode: string,
    accountId: string | undefined,
    userId: string | undefined,
    strategyId: string | null | undefined,
    selectedYear: number,
    viewMode: string,
    startDate: string,
    endDate: string,
    selectedExecution: string
  ) => [
    'compactTrades', mode, accountId, userId, strategyId,
    selectedYear, viewMode, startDate, endDate,
    selectedExecution,
  ] as const,

  /** Active subscription for a user (tier, features, limits). */
  subscription: (userId?: string) => ['subscription', userId] as const,

  /** Social profile for a user (by userId). */
  socialProfile: (userId?: string) => ['socialProfile', userId] as const,

  feed: {
    public:        ()                                  => ['feed:public']                        as const,
    timeline:      (userId?: string)                   => ['feed:timeline',      userId]         as const,
    post:          (postId: string)                    => ['feed:post',           postId]         as const,
    comments:      (postId: string)                    => ['feed:comments',       postId]         as const,
    profile:       (username: string)                  => ['feed:profile',        username]       as const,
    notifications: (userId?: string)                   => ['feed:notifications',  userId]         as const,
    unreadCount:   (userId?: string)                   => ['feed:unreadCount',    userId]         as const,
    channels:      (userId?: string)                   => ['feed:channels',       userId]         as const,
    channelPosts:  (channelId: string)                 => ['feed:channelPosts',   channelId]      as const,
    search:        (query: string, type: string)       => ['feed:search',         query, type]    as const,
    followers:     (profileId?: string)                => ['feed:followers',      profileId]      as const,
    following:     (profileId?: string)                => ['feed:following',      profileId]      as const,
  },

  /** Full Trade[] for a single calendar month (for calendar display). */
  calendarTrades: (
    mode: string,
    accountId: string | undefined,
    userId: string | undefined,
    strategyId: string | null | undefined,
    startDate: string,
    endDate: string
  ) => ['calendarTrades', mode, accountId, userId, strategyId, startDate, endDate] as const,

} as const;
