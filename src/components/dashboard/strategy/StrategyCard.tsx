'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Archive, Pencil, ChartBar, Share2 } from 'lucide-react';
import { Strategy } from '@/types/strategy';
import { Trade } from '@/types/trade';
import { getFilteredTrades } from '@/lib/server/trades';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { EXTRA_CARDS } from '@/constants/extraCards';
import { ShareStrategyModal } from '@/components/ShareStrategyModal';
import { EquityCurveChart } from '@/components/dashboard/analytics/EquityCurveChart';
import { formatPercent, roundToCents } from '@/lib/utils';
import type { StrategyOverviewRow } from '@/lib/server/strategiesOverview';

interface StrategyCardProps {
  strategy: Strategy;
  /** Pre-computed stats + equity curve from get_strategies_overview RPC */
  overviewStats?: StrategyOverviewRow;
  /** Passed from parent so ShareStrategyModal can identify the account/user */
  accountId: string;
  mode: 'live' | 'backtesting' | 'demo';
  userId: string;
  currencySymbol: string;
  onEdit: (strategy: Strategy) => void;
  onDelete: (strategyId: string) => Promise<void>;
  /** When true, data is still loading; avoid showing "No trades yet" until false */
  isLoading?: boolean;
  /** Account balance for P&L % calculation */
  accountBalance?: number;
}

export const StrategyCard: React.FC<StrategyCardProps> = ({
  strategy,
  overviewStats,
  accountId,
  mode,
  userId,
  currencySymbol,
  onEdit,
  onDelete,
  isLoading = false,
  accountBalance,
}) => {
  const router = useRouter();
  const { isDark } = useDarkMode();
  const [mounted, setMounted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  // Derive chart data from the pre-computed equity curve
  const chartData = useMemo(() => {
    if (!overviewStats?.equityCurve?.length) return [];
    return overviewStats.equityCurve.map((pt) => ({ date: pt.d, profit: pt.p }));
  }, [overviewStats?.equityCurve]);

  // Calculate cumulative P&L from the last equity curve point
  const totalProfit = useMemo(() => {
    if (!overviewStats?.equityCurve?.length) return 0;
    return overviewStats.equityCurve[overviewStats.equityCurve.length - 1]?.p ?? 0;
  }, [overviewStats?.equityCurve]);

  // Calculate P&L percentage
  const pnlPercent = useMemo(() => {
    if (!accountBalance) return 0;
    return (totalProfit / accountBalance) * 100;
  }, [totalProfit, accountBalance]);

  // Calculate total account value (balance + profit)
  const totalValue = useMemo(() => {
    if (!accountBalance) return 0;
    return accountBalance + totalProfit;
  }, [accountBalance, totalProfit]);

  // Lazy-fetch full trades only when the share modal is opened.
  // This avoids fetching 30k trades on page load; share is an infrequent action.
  const { data: shareTrades = [] } = useQuery<Trade[]>({
    queryKey: ['strategy-share-trades', strategy.id, accountId, mode],
    queryFn: () =>
      getFilteredTrades({
        userId,
        accountId,
        mode,
        startDate: '2000-01-01',
        endDate: new Date().toISOString().split('T')[0],
        strategyId: strategy.id,
      }),
    enabled: isShareOpen && !!userId && !!accountId,
    staleTime: 5 * 60_000,
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(strategy.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAnalytics = () => {
    router.push(`/strategy/${strategy.slug}`);
  };

  if (!mounted) {
    return (
      <Card className={`relative overflow-hidden shadow-none backdrop-blur-sm ${
        isDark
          ? 'border-slate-600 bg-slate-800/30'
          : 'border-slate-200/60 bg-slate-50/50'
      }`}>
        <div className="relative p-6 h-[320px]" aria-hidden />
      </Card>
    );
  }

  const totalTrades = overviewStats?.totalTrades ?? 0;
  const winRate = overviewStats?.winRate ?? 0;
  const avgRR = overviewStats?.avgRR ?? 0;
  const totalRR = overviewStats?.totalRR ?? 0;

  const hasTrades = totalTrades > 0;
  const isChartReady = !isLoading;

  return (
    <Card className={`relative overflow-hidden shadow-none backdrop-blur-sm ${
      isDark
        ? 'border-slate-600 bg-slate-800/30'
        : 'border-slate-300/60 bg-slate-50/50'
    }`}>
      <div className="relative p-6 flex flex-col h-full">
        {/* Strategy Name + Share button (top-right) */}
        <div className="flex items-start justify-between mb-2 gap-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {strategy.name}
          </h3>
          <div className="flex items-center gap-2">
            {accountBalance && (
              <div
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  totalProfit >= 0
                    ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {totalProfit >= 0 ? '+' : ''}
                {pnlPercent.toFixed(2)}%
              </div>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsShareOpen(true)}
              disabled={!hasTrades || !isChartReady}
              className="h-8 w-8 cursor-pointer shrink-0 rounded-full border-slate-200/80 bg-slate-50/80 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50 disabled:opacity-60 disabled:pointer-events-none"
              aria-label="Share strategy stats"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Performance Graph */}
        <div className="h-32 mb-4">
          <EquityCurveChart
            data={chartData}
            currencySymbol={currencySymbol}
            hasTrades={hasTrades}
            isLoading={isLoading}
          />
        </div>

        {/* Metrics */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 dark:text-slate-400">Win rate</span>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100">
              {formatPercent(winRate)}%
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Total RR</span>
              <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                {totalRR.toFixed(2)}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Avg RR</span>
              <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                {avgRR.toFixed(2)}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Profit</span>
              <span className={`text-base font-bold ${
                totalProfit >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}>
                {totalProfit >= 0 ? '+' : ''}{currencySymbol}{Math.abs(roundToCents(totalProfit)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Total Trades */}
        <div className="mb-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Total trades: <span className="font-semibold text-slate-900 dark:text-slate-100">{totalTrades}</span>
          </p>
        </div>

        {/* Extra Cards Badges */}
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-wider font-medium text-slate-400 dark:text-slate-500 mb-1.5">Extra stats cards</p>
          {strategy.extra_cards && strategy.extra_cards.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {strategy.extra_cards.slice(0, 4).map((key) => {
                const def = EXTRA_CARDS.find((c) => c.key === key);
                return def ? (
                  <span
                    key={key}
                    className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/70 dark:border-slate-700/50"
                  >
                    {def.label}
                  </span>
                ) : null;
              })}
              {strategy.extra_cards.length > 4 && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500 border border-slate-200/70 dark:border-slate-700/50 cursor-default">
                        +{strategy.extra_cards.length - 4} more
                      </span>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="max-w-[220px] rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 px-3 py-2"
                    >
                      <div className="flex flex-wrap gap-1">
                        {strategy.extra_cards.slice(4).map((key) => {
                          const def = EXTRA_CARDS.find((c) => c.key === key);
                          return def ? (
                            <span
                              key={key}
                              className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-600/50"
                            >
                              {def.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">None selected</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-4 border-t border-slate-200/60 dark:border-slate-700/50">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(strategy)}
              disabled={!isChartReady}
              className="cursor-pointer relative h-8 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 text-xs font-medium transition-colors duration-200 gap-2 disabled:opacity-60 disabled:pointer-events-none"
            >
              <Pencil className="h-4 w-4" />
              <span>Edit</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalytics}
              disabled={!isChartReady}
              className="cursor-pointer relative h-8 overflow-hidden rounded-xl themed-btn-primary text-white font-semibold group border-0 text-xs disabled:opacity-60 disabled:pointer-events-none [&_svg]:text-white px-3"
            >
              <span className="relative z-10 flex items-center justify-center gap-2 group-hover:text-white">
                <ChartBar className="h-4 w-4 group-hover:text-white" />
                <span className="hidden sm:inline group-hover:text-white">Analytics</span>
              </span>
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isDeleting || !isChartReady}
                    className="relative cursor-pointer p-2 px-4.5 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 disabled:opacity-60 disabled:pointer-events-none h-8 w-8"
                  >
                    <span className="relative z-10 flex items-center justify-center">
                      {isDeleting ? (
                        <svg
                          className="h-4 w-4 animate-spin"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      ) : (
                        <Archive className="h-4 w-4" />
                      )}
                    </span>
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 bg-gradient-to-br from-white via-purple-100/80 to-violet-100/70 dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      <span className="text-slate-900 dark:text-slate-50 font-semibold text-lg">Archive strategy</span>
                    </AlertDialogTitle>
                  <AlertDialogDescription>
                    <span className="text-slate-600 dark:text-slate-400">Move &quot;{strategy.name}&quot; to Archived? You can reactivate it later from the Archived list. Your trades will be kept.</span>
                  </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex gap-3">
                    <AlertDialogCancel asChild>
                      <Button
                        variant="outline"
                        className="rounded-xl cursor-pointer border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300"
                      >
                        Cancel
                      </Button>
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button
                        variant="outline"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="relative cursor-pointer px-4 py-2 overflow-hidden rounded-xl border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700/60 group border disabled:opacity-60"
                      >
                        {isDeleting ? 'Archiving...' : 'Yes, Archive'}
                      </Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
          </div>
        </div>

        <ShareStrategyModal
          open={isShareOpen}
          onOpenChange={setIsShareOpen}
          strategy={strategy}
          trades={shareTrades}
          currencySymbol={currencySymbol}
          accountId={accountId}
          mode={mode}
          userId={userId}
        />
      </div>
    </Card>
  );
};
