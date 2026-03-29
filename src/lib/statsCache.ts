/**
 * In-process TTL cache for /api/dashboard-stats responses.
 *
 * Keeps the last N computed results for 30 s so repeated requests for the same
 * params (e.g. rapid filter changes or duplicate calls from the same warm
 * Vercel function instance) skip the Supabase RPC entirely.
 *
 * Key includes userId so there is zero risk of cross-user data leakage.
 * Max 200 entries prevents unbounded memory growth on long-lived instances.
 */
import type { TradingMode } from '@/types/trade';

import type { DashboardApiResponse } from '@/types/dashboard-rpc';

const TTL_MS  = 30_000;
const MAX_SIZE = 200;

interface CacheEntry {
  data:      DashboardApiResponse;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export function buildStatsCacheKey(params: {
  userId:               string;
  accountId:            string;
  strategyId:           string | null;
  mode:                 TradingMode;
  startDate:            string;
  endDate:              string;
  execution:            string;
  market:               string;
  includeCompactTrades: boolean;
  includeSeries:        boolean;
}): string {
  return [
    params.userId,
    params.accountId,
    params.strategyId ?? '',
    params.mode,
    params.startDate,
    params.endDate,
    params.execution,
    params.market,
    params.includeCompactTrades ? '1' : '0',
    params.includeSeries        ? '1' : '0',
  ].join(':');
}

export function getStatsCache(key: string): DashboardApiResponse | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setStatsCache(key: string, data: DashboardApiResponse): void {
  // Evict oldest entry when at capacity
  if (cache.size >= MAX_SIZE) {
    cache.delete(cache.keys().next().value!);
  }
  cache.set(key, { data, expiresAt: Date.now() + TTL_MS });
}
