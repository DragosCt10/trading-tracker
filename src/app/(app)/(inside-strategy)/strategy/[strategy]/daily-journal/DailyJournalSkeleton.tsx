'use client';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TradeFiltersBar } from '@/components/dashboard/analytics/TradeFiltersBar';
import { buildPresetRange } from '@/utils/dateRangeHelpers';

export function DailyJournalSkeleton() {
  const defaultDateRange = buildPresetRange('year').dateRange;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header — same structure as MyTradesClient / DailyJournalClient */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Daily Journal
        </h1>
        <div className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
          Log daily notes and reflections for{' '}
          <Skeleton className="h-4 w-24 inline-block align-middle" />
        </div>
      </div>

      {/* Trade Filters Bar — real component, same as MyTradesSkeleton */}
      <TradeFiltersBar
        dateRange={defaultDateRange}
        onDateRangeChange={() => {}}
        activeFilter="year"
        onFilterChange={() => {}}
        isCustomRange={false}
        selectedMarket="all"
        onSelectedMarketChange={() => {}}
        markets={[]}
        selectedExecution="executed"
        onSelectedExecutionChange={() => {}}
        showAllTradesOption={true}
      />

      <div className="space-y-4 mt-6">
        {/* One skeleton card matching the real day card layout */}
        <Card
          className="rounded-2xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm overflow-hidden"
        >
          {/* Header row — same as real card */}
          <div className="w-full flex items-center justify-between px-5 py-4 text-left">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-4 shrink-0 rounded" />
              <div className="gap-1 flex flex-col">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <Skeleton className="h-8 w-16 rounded-xl" />
          </div>

          {/* Equity curve + stats section — same structure as real card */}
          <div className="border-t border-slate-200/70 dark:border-slate-700/60 px-5 py-4">
            <div className="flex flex-col gap-10 md:flex-row md:items-center">
              <div className="md:w-1/3 h-32 flex items-center">
                <Skeleton className="h-full w-full rounded-lg" />
              </div>
              <div className="flex-1 md:flex md:items-center">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-20 gap-y-6 text-xs sm:text-sm w-full">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i}>
                      <Skeleton className="h-3 w-16 mb-1.5" />
                      <Skeleton className="h-4 w-10" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Collapsible table — same columns as real card (expanded state) */}
          <div className="border-t border-slate-200/70 dark:border-slate-700/60 px-5 py-4">
            <div className="relative overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200/30 dark:divide-slate-700/30">
                <thead className="bg-transparent border-b border-slate-200/70 dark:border-slate-700/70">
                  <tr>
                    <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Screens
                    </th>
                    <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Market
                    </th>
                    <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      P&L
                    </th>
                    <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Direction
                    </th>
                    <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      RR Ratio
                    </th>
                    <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Outcome
                    </th>
                    <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Risk
                    </th>
                    <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-transparent divide-y divide-slate-200/30 dark:divide-slate-700/30">
                  {[1, 2, 3].map((row) => (
                    <tr key={row}>
                      <td className="px-3 py-3 whitespace-nowrap align-middle">
                        <Skeleton className="w-32 h-20 rounded-lg" />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Skeleton className="h-4 w-12" />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Skeleton className="h-4 w-14" />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Skeleton className="h-4 w-12" />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Skeleton className="h-4 w-10" />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Skeleton className="h-5 w-12 rounded" />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Skeleton className="h-4 w-8" />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Skeleton className="h-4 w-20" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
