'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';

export function ManageTradesSkeleton() {
  return (
    <div>
      <div className="max-w-7xl mx-auto min-h-0">
        {/* Header - same structure as ManageTradesClient */}
        <div className="mb-8 flex-shrink-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Manage Trades
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Viewing trades for live mode
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                disabled
                className="cursor-not-allowed rounded-xl themed-btn-primary text-white font-semibold px-4 py-2 border-0 opacity-70"
              >
                Export Trades
              </Button>
            </div>
          </div>
        </div>

        {/* Filters - same layout as ManageTradesClient (Row 1: Market + Sort) */}
        <div className="mb-6 flex-shrink-0 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 whitespace-nowrap">
              Market:
            </span>
            <Select disabled>
              <SelectTrigger className="flex w-28 h-8 text-xs rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30">
                <SelectValue placeholder="All Markets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Markets</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 whitespace-nowrap">
              Sort by:
            </span>
            <Select disabled>
              <SelectTrigger className="flex w-28 h-8 text-xs rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trade_date">Date</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: Period + Quick Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 whitespace-nowrap">
                Period:
              </span>
              <div className="relative w-64">
                <Skeleton className="h-8 w-full rounded-xl" />
              </div>
            </div>
            <div className="w-full md:w-auto md:ml-auto flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 whitespace-nowrap mr-0.5">
                Quick Filters:
              </span>
              {['All Trades', 'Current Year', 'Last 15 Days', 'Last 30 Days', 'Current Month'].map((label, i) => (
                <Skeleton key={i} className="h-8 w-24 rounded-xl" />
              ))}
            </div>
          </div>

          {/* Row 3: Checkboxes */}
          <TooltipProvider>
            <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center">
                <Checkbox id="sk-non-exec" disabled className="h-5 w-5 rounded-md border-2" />
                <Label htmlFor="sk-non-exec" className="text-slate-700 dark:text-slate-300 text-sm ml-2 cursor-default">
                  Show only non-executed trades
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-1 inline-block w-4 h-4 text-slate-400" aria-hidden />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="w-64 max-w-xs rounded-xl p-4">
                      <div className="text-slate-600 dark:text-slate-300 text-sm">Placeholder</div>
                    </TooltipContent>
                  </Tooltip>
                </Label>
              </div>
              <div className="flex items-center">
                <Checkbox id="sk-partial" disabled className="h-5 w-5 rounded-md border-2" />
                <Label htmlFor="sk-partial" className="text-slate-700 dark:text-slate-300 text-sm ml-2 cursor-default">
                  Show only partial trades
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-1 inline-block w-4 h-4 text-slate-400" aria-hidden />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="w-64 max-w-xs rounded-xl p-4">
                      <div className="text-slate-600 dark:text-slate-300 text-sm">Placeholder</div>
                    </TooltipContent>
                  </Tooltip>
                </Label>
              </div>
            </div>
          </TooltipProvider>
        </div>
        

        {/* Table Card - same min-height as client to prevent layout shift */}
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm min-h-[420px]">
          <div className="relative overflow-x-auto min-h-[380px]">
            <table className="min-w-full divide-y divide-slate-200/30 dark:divide-slate-700/30">
              <thead className="bg-transparent border-b border-slate-300 dark:border-slate-700">
                <tr>
                  <th className="w-12 px-4 py-4 text-left" />
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Market</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Direction</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Setup</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Outcome</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Risk</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Screens</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Notes</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-transparent divide-y divide-slate-200/30 dark:divide-slate-700/30">
                {Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>
                    <td className="w-12 px-4 py-4 whitespace-nowrap">
                      <Skeleton className="h-5 w-5 rounded" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-5 w-16" /></td>
                    <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-5 w-16" /></td>
                    <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-5 w-12" /></td>
                    <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-5 w-12" /></td>
                    <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-5 w-24" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Pagination placeholder - same vertical space as client */}
        <div className="mt-6 flex items-center justify-between flex-shrink-0">
          <Skeleton className="h-5 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-20 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
