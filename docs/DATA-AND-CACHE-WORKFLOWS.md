# Data and cache workflows

This document describes how data flows from server and RPC through caches to the client in the trading-tracker app. Use it to understand where data comes from, how it is cached, and how to add or change flows without duplicating requests or breaking hydration.

---

## 1. Request lifecycle (high level)

```
Request
  → Middleware (proxy.ts): updateSession() → 1× Supabase auth (getUser) for protected routes
  → (app)/layout.tsx (RSC): getCachedUserSession() + getCachedAccountsForMode + getCachedAllAccountsForUser
  → Page (RSC): e.g. StrategyData / MyTradesData — fetch initial data, pass to client
  → Client layout (AppLayout): setQueryData to hydrate TanStack Query cache from layout props
  → Client page (StrategyClient / MyTradesClient): useQuery reads cache or fetches; hydrateQueryCache() may seed more keys
```

- **Auth:** One `getUser()` per request in middleware for protected routes; layout and server modules use `getCachedUserSession()` (React `cache()`), so only one auth call per request.
- **API routes** (e.g. `/api/dashboard-stats`) are excluded from the middleware matcher where configured; they do their own `getUser()`.

---

## 2. Auth and session

| Layer | Where | What |
|-------|--------|------|
| **Middleware** | `src/proxy.ts` → `updateSession()` | `supabase.auth.getUser()` for non-auth, non-public paths. Refreshes session and may redirect to `/login`. |
| **Session helper** | `src/lib/server/session.ts` | `getUserSession()` calls `createClient()` + `getUser()`. `getCachedUserSession = cache(getUserSession)` dedupes per request. |
| **Layout** | `(app)/layout.tsx` | `getCachedUserSession()` → redirect if no user; passes `initialUserDetails` to `AppLayout`. |
| **Server modules** | `trades.ts`, `strategies.ts`, `accounts.ts`, `notes.ts`, etc. | All use `getCachedUserSession()` (never raw `createClient()` + `getUser()` in isolation) so one auth per request. |

**Client:** `useUserDetails()` uses query key `['userDetails']`. Layout passes `initialUserDetails` into `AppLayout`, which calls `queryClient.setQueryData(['userDetails'], initialUserDetails)` so the first paint uses server data and avoids an extra auth fetch.

---

## 3. Server-side caching (React `cache()`)

These functions are wrapped with React’s `cache()` so that **within a single request**, duplicate calls with the same arguments return the same promise (one DB/RPC call).

| Function | File | Used by |
|----------|------|---------|
| `getCachedUserSession` | `src/lib/server/session.ts` | Layout, all server actions that need auth |
| `getCachedAccountsForMode` | `src/lib/server/accounts.ts` | Layout |
| `getCachedAllAccountsForUser` | `src/lib/server/accounts.ts` | Layout |
| `getStrategyBySlug` | `src/lib/server/strategies.ts` | Strategy pages, MyTradesData, etc. |
| `getCalendarTrades` | `src/lib/server/dashboardStats.ts` | useDashboardData (via server action in queryFn) |

**Scope:** Per request only. A new navigation or API call is a new request; cache is not shared across requests.

---

## 4. RPC and dashboard stats

### 4.1 Supabase RPC: `get_dashboard_aggregates`

- **Defined in:** DB (Supabase). Called from app via `getDashboardAggregates()` in `src/lib/server/dashboardAggregates.ts`.
- **Parameters:** `p_user_id`, `p_account_id`, `p_mode`, `p_start_date`, `p_end_date`, `p_strategy_id`, `p_execution`, `p_account_balance`, `p_include_compact_trades`, `p_market`.
- **Returns:** `DashboardRpcResult` (core stats, partials, macro, monthly_data, setup/liquidity/direction stats, series, compact_trades, etc.). No auth inside RPC; caller enforces auth.

### 4.2 Building the full API response

- **`getDashboardApiResponse()`** in `src/lib/server/dashboardApiResponse.ts`:
  1. Calls `getDashboardAggregates()` once (main) and optionally once more (non_executed) in parallel.
  2. Runs `calculateFromSeries(main.series, accountBalance)` for drawdown, streaks, Sharpe, TQI.
  3. Derives `earliestTradeDate` and `tradeMonths` from `main.compact_trades`.
  4. Returns `DashboardApiResponse` (RPC result + Layer 2 fields + nonExecutedStats, etc.).

### 4.3 Who calls it

| Caller | Purpose |
|--------|---------|
| **GET /api/dashboard-stats** | Route handler: auth via `getUser()`, then `getDashboardApiResponse(params)` from query string, returns JSON. Client fetches this when filters/year/account change. |
| **StrategyData (RSC)** | Fetches `getDashboardApiResponse()` with initial range/mode/account and passes result as `initialDashboardStats` to `StrategyClient`. Client does **not** call the API on first load. |

So: **1–2 RPCs** per dashboard-stats request (main + optional non_executed). Strategy page load uses the same RPC path on the server and hydrates the client; later refetches go through the API.

---

## 5. TanStack Query: keys and presets

### 5.1 Query key factory

All keys are built via **`src/lib/queryKeys.ts`** so that `invalidateQueries`, `setQueryData`, and `useQuery` stay in sync.

Examples:

- `queryKeys.userDetails()` → `['userDetails']`
- `queryKeys.trades.filtered(mode, accountId, userId, viewMode, startDate, endDate, strategyId)` → `['filteredTrades', ...]`
- `queryKeys.trades.all(mode, accountId, userId, year, strategyId)` → `['allTrades', ...]`
- `queryKeys.dashboardStats(mode, accountId, userId, strategyId, selectedYear, viewMode, startDate, endDate, selectedExecution, market)` → `['dashboardStats', ...]`
- `queryKeys.calendarTrades(mode, accountId, userId, strategyId, startDate, endDate)` → `['calendarTrades', ...]`
- `queryKeys.strategies(userId)`, `queryKeys.accounts(userId, mode)`, `['accounts:all', userId]`, `['actionBar:selection']`, etc.

### 5.2 Cache presets (`src/constants/queryConfig.ts`)

| Preset | staleTime | gcTime | Use for |
|--------|-----------|--------|---------|
| `STATIC_DATA` | ∞ | ∞ | Accounts list, strategies list; manual refresh only. |
| `USER_DATA` | 5 min | 30 min | User profile, settings. |
| `TRADES_DATA` | 10 min | 15 min | Trade lists, dashboard stats. |
| `STRATEGY_STATS` | 0 | 5 min | Strategy aggregates (refetch often). |

Use these in `useQuery` so cache behaviour is consistent and easy to change in one place.

---

## 6. Hydration patterns (server → client cache)

The app avoids duplicate work on first load by seeding the client cache from server data. Key patterns:

### 6.1 Layout → global shell

- **Layout (RSC):** Fetches `getCachedUserSession()`, `getCachedAccountsForMode(userId, 'live')`, `getCachedAllAccountsForUser(userId)`, computes initial active account.
- **AppLayout (client):** Receives `initialUserDetails`, `initialAccountsForLive`, `initialAllAccounts`, `initialActiveAccount`, `initialActiveAccountMode`. In the component body it runs:
  - `queryClient.setQueryData(['userDetails'], initialUserDetails)`
  - `queryClient.setQueryData(['accounts:list', userId, 'live'], initialAccountsForLive)`
  - `queryClient.setQueryData(['accounts:all', userId], initialAllAccounts)`
  - `queryClient.setQueryData(['actionBar:selection'], { mode, activeAccount })` when selection is empty
- **ActionBar:** Gets `initialData` from AppLayout (same data) and uses it for `initialData` in the `['accounts:all', userId]` query and hydrates the same keys in a `useLayoutEffect`. Result: no client `getAllAccountsForUser` on first load.

### 6.2 Strategy dashboard (strategy page)

- **StrategyData (RSC):** Fetches `getDashboardApiResponse(...)` (same params as initial view: live, dateRange, executed, all markets), passes result as `initialDashboardStats` to `StrategyClient`.
- **StrategyClient (client):** In `hydrateQueryCache()` it does `queryClient.setQueryData(dashboardStatsKey, props.initialDashboardStats)` using the same key shape as `useDashboardData` (mode, accountId, userId, strategyId, year, 'dateRange', initialDateRange, 'executed', 'all'). So `useDashboardData`’s first run sees data and does not call `/api/dashboard-stats`. Optional: also hydrates `filteredTrades`, `allTrades`, `nonExecutedTrades` when those props exist.

### 6.3 My-trades page

- **MyTradesData (RSC):** Creates a `QueryClient`, prefetches with `queryKeys.trades.filtered(...)` and `queryFn` that calls `getFilteredTrades`, then wraps in `<HydrationBoundary state={dehydrate(queryClient)}>`. Client's `useQuery` finds the prefetched data and does not refetch on mount.

---

## 7. Where data comes from (by screen)

| Screen / feature | Server (RSC) | Client (TanStack Query) | Notes |
|------------------|--------------|--------------------------|-------|
| **App shell** | Layout: session + accounts (cached). | AppLayout sets `userDetails`, `accounts:list`, `accounts:all`, `actionBar:selection`. ActionBar uses initialData for `accounts:all`. | One auth, 2 DB reads (accounts) per layout. |
| **Strategy dashboard** | StrategyData: `getDashboardApiResponse()`. | useDashboardData: key `dashboardStats`; hydrated from `initialDashboardStats`. Calendar: `getCalendarTrades` (server action) with `STATIC_DATA`. | No API call for dashboard stats on first load. |
| **My-trades** | MyTradesData: prefetchQuery filtered trades + HydrationBoundary. | useQuery finds prefetched data. | No duplicate getFilteredTrades on first load. |
| **Strategies list** | Strategies page may prefetch. | StrategiesClient: useQuery for filtered trades / stats; can setQueryData after fetch. | Key shape must match. |
| **Calendar (in dashboard)** | — | useQuery with `getCalendarTrades` (server action); key `calendarTrades(mode, accountId, userId, strategyId, start, end)`. `getCalendarTrades` is React-cached on server. | One request per month; optional higher limit to reduce pagination round-trips. |

---

## 8. Invalidation and mutations

- After create/update/delete of trades or strategies, the app invalidates the relevant query keys (e.g. `queryKeys.trades.filtered(...)`, `queryKeys.dashboardStats(...)`, `['strategy-trades']`) so the next read refetches.
- Prefer **specific keys** (e.g. one strategy id) over broad invalidation so you don’t refetch every list at once.
- Optimistic updates: some flows use `queryClient.setQueryData(key, updater)` with a function to patch the cache before the server responds; then invalidate or replace on success/error.

---

## 9. File reference

| Concern | Files |
|--------|--------|
| Auth / session | `src/lib/server/session.ts`, `src/proxy.ts`, `src/utils/supabase/middleware.ts` |
| Accounts | `src/lib/server/accounts.ts` (cached helpers + CRUD) |
| RPC + dashboard API | `src/lib/server/dashboardAggregates.ts`, `src/lib/server/dashboardApiResponse.ts`, `src/app/api/dashboard-stats/route.ts` |
| Trades | `src/lib/server/trades.ts` (getFilteredTrades, CRUD; all use getCachedUserSession) |
| Dashboard stats (JS path) | `src/lib/server/dashboardStats.ts` (getCalendarTrades cached; getDashboardStats uses getFilteredTrades) |
| Strategies | `src/lib/server/strategies.ts` (getStrategyBySlug cached) |
| Query keys | `src/lib/queryKeys.ts` |
| Cache presets | `src/constants/queryConfig.ts` |
| Layout hydration | `src/app/(app)/layout.tsx`, `src/components/shared/layout/AppLayout.tsx`, `src/components/shared/ActionBar.tsx` |
| Page-level hydration | StrategyData + StrategyClient (`hydrateQueryCache`), MyTradesData + HydrationBoundary |

Use this doc when adding new server data, new RPCs, or new client queries so you can plug into the same auth, cache, and hydration patterns and avoid duplicate requests or hydration mismatches.
