# Supabase request audit (single-user app)

**Context:** ~510 Supabase requests in ~37 minutes (294 Database, 216 Auth) with a single user.  
**References:** `CLAUDE.md`, `.claude/skills/core/performance.md`, `.claude/skills/core/best-practices.md`.

---

## 1. Auth requests (216) – root causes

### 1.1 Middleware: 1 `getUser()` on every matched request

- **Where:** `src/utils/supabase/middleware.ts` → `updateSession()` → `supabase.auth.getUser()`.
- **Invoked by:** `src/proxy.ts` (middleware) with a **broad matcher** that runs for almost all requests (excluding only `_next/static`, `_next/image`, `favicon.ico`, some auth paths, and image extensions).
- **Effect:** Every page navigation, every RSC payload, and **every API request** (e.g. `GET /api/dashboard-stats`) triggers one auth call. So:
  - 1 auth per page load (middleware)
  - 1 auth per `/api/dashboard-stats` call (middleware again)
  - 1 auth per server action invocation that goes through the app (middleware)

**Recommendation:** Exclude `/api/`* from the middleware matcher so API routes are not double-checked (they already call `getUser()`). See fix in **Section 3**.

---

### 1.2 Layout: 2 auth calls per app navigation

- **Where:** `src/app/(app)/layout.tsx` → `getCachedUserSession()` from `src/lib/server/trades.ts`.
- **What it does:** `getUserSession()` (and thus `getCachedUserSession`) calls both `supabase.auth.getUser()` and `supabase.auth.getSession()` → **2 auth calls** per layout execution.
- **When:** Layout runs on each navigation inside `(app)`. React `cache()` deduplicates only within the **same request**, so each new request (e.g. new page) gets 2 auth calls again.

**Recommendation:** Prefer a single source of truth. If you keep using both `getUser()` and `getSession()`, ensure it’s only in one place (e.g. layout) and that middleware isn’t doing redundant work for the same request. Optional: use only `getSession()` in layout if that’s enough for your checks (one auth call instead of two).

---

### 1.3 Duplicate auth in server action chains

**getCalendarTrades → getFilteredTrades**

- **Where:** `src/lib/server/dashboardStats.ts` → `getCalendarTrades()` and `src/lib/server/trades.ts` → `getFilteredTrades()`.
- **Done:** `getCalendarTrades()` no longer calls `getUser()`; it delegates to `getFilteredTrades()` only (1 auth + 1 DB per calendar fetch).

**getDashboardStats (used by StrategyData.tsx)**

- ~~`getDashboardStats` does `getUser()` then calls `getFilteredTrades()` up to three times~~ **Done:** Redundant `getUser()` removed from `getDashboardStats()`; auth is enforced in each `getFilteredTrades()` call. Saves 1 auth per strategy page load.

**Recommendation:** Remove the redundant `getUser()` in `getCalendarTrades()` and rely on `getFilteredTrades()` to enforce auth (and RLS). Same idea for any other “orchestrator” server function that only calls other server functions that already verify the user. See fix in **Section 3**.

---

### 1.4 `/api/dashboard-stats` route

- **Where:** `src/app/api/dashboard-stats/route.ts` → `createClient()` + `getUser()`.
- **Effect:** 1 auth per dashboard stats request. This is correct; the issue was **middleware also running** for this request (2 auth per call). **Done:** `/api` is excluded from the middleware matcher (see 1.1), so the route’s single `getUser()` is the only auth — no code change needed in the route itself.

---

### 1.5 useUserDetails (client)

- **Where:** `src/hooks/useUserDetails.ts` → `fetchUserDetails()` calls `getUser()` and `getSession()` (2 auth) when the query runs.
- **When:** Initial load and whenever the query is invalidated or runs again (e.g. after focus if you ever re-enable refetch, or new tab). With current defaults (e.g. `refetchOnMount: false`), most of the cost is initial load.
- **Note:** Layout already hydrates `userDetails` from server; the client query may still run and hit Supabase if the cache isn’t hydrated in time or is empty.

**Recommendation:** Rely on layout hydration so the client rarely needs to run `fetchUserDetails`. Avoid invalidating `userDetails` unless the user has actually signed in/out or refreshed.

**Done:** `fetchUserDetails()` now uses only `getUser()` and returns `{ user, session: user ? { user } : null }` — 1 auth instead of 2 when the client query runs.

---

### 1.6 Strategy and trade server actions

- **Where:** `src/lib/server/strategies.ts` and `src/lib/server/trades.ts`: many functions each call `createClient()` + `getUser()`.
- **Effect:** Every strategy create/update/archive, ensureDefaultStrategy, and every trade create/update/delete triggers at least one auth call. With frequent mutations or navigations that trigger these, auth count adds up.

**Recommendation:** Keep one `getUser()` per logical “request” (e.g. one per server action entry point). If a server action only calls other server functions that already verify the user, consider passing the result of a single auth check instead of re-calling `getUser()` in each callee.

**Done:** Strategy and trade server actions now use `getCachedUserSession()` instead of `createClient()` + `getUser()`. Cached per request, so one action that calls several of these triggers a single Supabase auth call.

### 1.7 Other server files (notes, settings, accounts, publicShares)

- **Where:** `src/lib/server/notes.ts`, `settings.ts`, `accounts.ts`, `publicShares.ts` also had multiple `createClient()` + `getUser()` calls per function.
- **Done:** A shared `src/lib/server/session.ts` now exports `getUserSession` and `getCachedUserSession` (cached per request). All server modules that need auth use `getCachedUserSession()` from `session.ts` (trades re-exports for layout/pages). Updated: **notes.ts** (getNotes, getNoteById, createNote, updateNote, deleteNote), **settings.ts** (updateSavedNews, updateSavedMarkets, updateStrategiesPageCustomization), **accounts.ts** (createAccount), **publicShares.ts** (createShare, getStrategyShares, setStrategyShareActiveAction, deleteStrategyShareAction). **auth.ts** and **dashboardAggregates.ts** unchanged (auth flow and RPC-only, respectively).

---

## 2. Database requests (294) – root causes

### 2.1 Dashboard stats (RPC)

- **Where:** `src/app/api/dashboard-stats/route.ts` → `getDashboardAggregates()` once or twice (main + optional nonExecuted).
- **Effect:** 1–2 RPCs (DB requests) per dashboard stats fetch. `getDashboardAggregates` does **not** call `getUser()` (good); only the route does.

---

### 2.2 Calendar trades: server action + pagination

- **Where:** `useDashboardData` → `getCalendarTrades()` → `getFilteredTrades()` in `src/lib/server/trades.ts`.
- **Effect:**  
  - 1 call to `getFilteredTrades` per calendar month.  
  - Inside `getFilteredTrades`, pagination in chunks of 500: if a month has >500 trades, multiple DB queries.
- **Query key:** `calendarTrades(mode, accountId, userId, strategyId, startDate, endDate)`. Changing month or strategy changes the key → new fetch. With `STATIC_DATA` (infinite staleTime), same key is not refetched; different keys (e.g. switching months) are expected.

**Recommendation:** Keep one calendar query per visible month. If you add “prefetch next/previous month”, use the same query key pattern and cache to avoid duplicate requests.

---

### 2.3 Layout: accounts

- **Where:** `src/app/(app)/layout.tsx` → `getAccountsForMode(userId, 'live')` and `getAllAccountsForUser(userId)`.
- **Effect:** 2 DB reads per layout run (no auth in these; they use `userId` from session). Cached per request via React `cache()` only if you wrap them; currently they are not wrapped, so every layout run = 2 DB calls.

**Recommendation:** Consider `cache(getAccountsForMode)` and `cache(getAllAccountsForUser)` if the same layout request can call them multiple times, or ensure they’re only called once per request.

---

**Done (2.3):** `src/lib/server/accounts.ts` now exports `getCachedAccountsForMode` and `getCachedAllAccountsForUser` (React `cache()` wrappers). Layout uses these so repeated calls in the same request are deduplicated.

### 2.4 ManageTrades: getFilteredTrades

- **Where:** `ManageTradesClient` uses a query whose `queryFn` calls `getFilteredTrades` (server action).
- **Effect:** 1+ DB requests (depending on pagination) per fetch. Invalidations after create/update/delete cause refetches.

---

### 2.5 Strategies and strategy trades

- **Where:** `StrategiesClient`, `useStrategies`, etc. → `getUserStrategies`, all-strategy-trades, archived strategies.
- **Effect:** Each of these triggers server actions that run DB queries. Broad invalidations (e.g. `queryClient.invalidateQueries({ queryKey: ['strategy-trades'] })`) cause multiple refetches across the app.

**Recommendation:** Invalidate only the specific query keys that actually changed (e.g. one strategy id) so you don’t refetch every strategy and every trade list at once.

---

### 2.6 ActionBar: getAllAccountsForUser

- **Where:** `src/components/shared/ActionBar.tsx` → `useQuery` with `queryFn: () => getAllAccountsForUser(userId)`.
- **Effect:** 1 DB request when the query runs. With `STATIC_DATA` and refetch disabled, this is mainly on first load or after invalidation.

**Done:** AppLayout now passes `initialData.allAccounts` (from layout’s `getAllAccountsForUser`) to ActionBar. ActionBar uses it as `initialData` for the `['accounts:all', userId]` query and hydrates that key in the cache, so the client does not call `getAllAccountsForUser` on first load — one fewer DB request per app load.

---

## 3. Implemented fixes (high impact)

1. **Middleware matcher**
  - Exclude `/api` (and optionally other static/internal paths) so API routes that already perform auth do not get an extra `getUser()` in middleware.  
  - File: `src/proxy.ts` (or wherever the middleware matcher is defined).
2. **getCalendarTrades**
  - Remove `getUser()` from `getCalendarTrades()` and rely on `getFilteredTrades()` for auth and RLS.  
  - File: `src/lib/server/dashboardStats.ts`.

These two changes reduce:

- One auth per `/api/dashboard-stats` (and other /api) request.
- One auth per calendar-trades fetch.

---

## 4. Summary table


| Source                        | Auth (approx.)    | DB (approx.)          | Action                                             |
| ----------------------------- | ----------------- | --------------------- | -------------------------------------------------- |
| Middleware (every request)    | 1 per request     | 0                     | Exclude /api from matcher ✅                        |
| Layout (per navigation)       | 2 per request     | 2 per request         | Use only getUser(); return session: { user } ✅      |
| getCalendarTrades chain       | 2 per fetch       | 1+ (pagination)       | Remove duplicate getUser ✅                         |
| /api/dashboard-stats          | 1 per call        | 1–2 RPCs              | Keep; avoid double auth via matcher ✅              |
| useUserDetails                | 2 when query runs | 0                     | Rely on layout hydration                           |
| Strategy/trade server actions | 1 per action      | 1+ per action         | Avoid redundant getUser in callees                 |
| Invalidations / refetches     | 0                 | N (refetched queries) | Narrow invalidations to affected keys              |


---

## 5. Next steps (optional)

- Add a **request log or dev-only counter** for Supabase auth and DB calls per request to validate improvements.
- **Narrow invalidation** in `StrategiesClient` and after trade mutations so only the affected strategy/trade list is refetched.
- Consider **session caching** (e.g. short-lived in-memory or edge cache) for `getUser()`/`getSession()` in layout if you need to scale further (likely overkill for a single user).

