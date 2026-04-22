'use client';

import { useState, useTransition } from 'react';
import { BarChart3, RefreshCw, Loader2, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { getAdminPlatformStats, revalidateLandingStats } from '@/lib/server/platformStats';
import type { AdminPlatformStats, ComparisonPeriod, PlatformStatConfig } from '@/types/platform-stats';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return String(n);
}

const STAT_CONFIG: PlatformStatConfig[] = [
  { key: 'tradersCount',       label: 'Traders',       format: formatNumber },
  { key: 'tradesCount',        label: 'Trades',        format: formatCompact },
  { key: 'statsBoardsCount',   label: 'Stats Boards',  format: formatNumber },
  { key: 'subscriptionsCount', label: 'Subscriptions', format: formatNumber },
];

const PERIODS: { value: ComparisonPeriod; label: string }[] = [
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
];

function getDelta(current: number, previous: number): { pct: string; positive: boolean } | null {
  if (previous === 0) return current > 0 ? { pct: '+100%', positive: true } : null;
  const diff = current - previous;
  const pct = (diff / previous) * 100;
  return {
    pct: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
    positive: pct >= 0,
  };
}

export default function PlatformStatsPanel() {
  const [stats, setStats] = useState<AdminPlatformStats | null>(null);
  const [period, setPeriod] = useState<ComparisonPeriod | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, startFetch] = useTransition();
  const [isRevalidating, startRevalidate] = useTransition();

  const themedGradientStyle = {
    background: 'linear-gradient(to right, var(--tc-primary), var(--tc-accent), var(--tc-accent-end))',
    boxShadow:
      '0 10px 15px -3px color-mix(in oklab, var(--tc-primary) 30%, transparent), 0 4px 6px -4px color-mix(in oklab, var(--tc-primary) 20%, transparent)',
  } as const;

  function handleFetch() {
    setError(null);
    startFetch(async () => {
      const result = await getAdminPlatformStats(period);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setStats(result.data);
    });
  }

  function handleRevalidate() {
    startRevalidate(async () => {
      const result = await revalidateLandingStats();
      if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Controls card */}
      <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent flex items-center gap-2">
            <BarChart3 className="h-4.5 w-4.5 text-slate-600 dark:text-slate-300" />
            Platform Stats
          </CardTitle>
          <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
            Real-time platform metrics. Raw numbers (no multiplier).
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Period filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Compare vs:</span>
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPeriod(period === p.value ? undefined : p.value)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                    period === p.value
                      ? 'text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-800/30 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200/70 dark:border-slate-700/50'
                  )}
                  style={period === p.value ? themedGradientStyle : undefined}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleFetch}
              disabled={isFetching}
              className="relative h-10 px-5 overflow-hidden rounded-2xl border-0 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 group disabled:opacity-60"
              style={themedGradientStyle}
            >
              <span className="relative z-10 flex items-center gap-2">
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                Fetch Stats
              </span>
              {!isFetching && (
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleRevalidate}
              disabled={isRevalidating}
              className="h-10 rounded-2xl border-slate-200/70 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/30"
            >
              {isRevalidating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              Refresh Landing Cache
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 px-4 py-3 text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Trades by mode — exact counts */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(
            [
              { key: 'live',        label: 'Live Trades' },
              { key: 'demo',        label: 'Demo Trades' },
              { key: 'backtesting', label: 'Backtesting Trades' },
            ] as const
          ).map(({ key, label }) => (
            <Card
              key={key}
              className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm"
            >
              <CardContent className="pt-5 pb-4 px-5">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">
                  {formatNumber(stats.tradesByMode[key])}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CONFIG.map((cfg) => {
            const current = stats[cfg.key];
            const previous =
              cfg.key === 'subscriptionsCount'
                ? undefined
                : stats.prev?.[cfg.key as keyof NonNullable<typeof stats.prev>];
            const delta = previous != null ? getDelta(current, previous) : null;

            return (
              <Card
                key={cfg.key}
                className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm"
              >
                <CardContent className="pt-5 pb-4 px-5">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                    {cfg.label}
                  </p>
                  <p
                    className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50"
                    aria-label={`${current.toLocaleString()} ${cfg.label}`}
                  >
                    {cfg.format(current)}
                  </p>
                  {delta && (
                    <div
                      className={cn(
                        'mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
                        delta.positive
                          ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800'
                          : 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-200 dark:border-rose-800'
                      )}
                      aria-label={`${delta.pct} change from previous period`}
                    >
                      {delta.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {delta.pct}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
