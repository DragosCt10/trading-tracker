'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK_FILTER_LABELS = [
  { key: 'all', label: 'All Trades', active: false },
  { key: 'year', label: 'Current Year', active: true },
  { key: '15days', label: 'Last 15 Days', active: false },
  { key: '30days', label: 'Last 30 Days', active: false },
  { key: 'month', label: 'Current Month', active: false },
] as const;

export function ManageTradesSkeleton() {
  return (
    <TooltipProvider>
      <div className="max-w-7xl mx-auto">
        {/* First part: exact copy of client header + filters + checkboxes (static values) */}
        {/* Header Section - matches ManageTradesClient exactly */}
        <div className="mb-8">
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
                className="cursor-pointer relative overflow-hidden rounded-xl themed-btn-primary text-white font-semibold px-4 py-2 group border-0 [&_svg]:text-white"
              >
                <span className="relative z-10">Export Trades</span>
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filters Section - matches ManageTradesClient exactly */}
        <div className="mb-6 space-y-4">
          {/* Row 1: Market and Sort (same structure as client) */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 whitespace-nowrap">
                Market:
              </span>
              <Select value="all">
                <SelectTrigger
                  id="market-filter"
                  className="flex w-28 h-8 text-xs rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-none themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
                  suppressHydrationWarning
                >
                  <SelectValue placeholder="All Markets" />
                </SelectTrigger>
                <SelectContent className="z-[100] border border-slate-200/70 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
                  <SelectItem value="all">All Markets</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 whitespace-nowrap">
                Sort by:
              </span>
              <Select value="trade_date">
                <SelectTrigger
                  id="sort-by"
                  className="flex w-28 h-8 text-xs rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-none themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
                  suppressHydrationWarning
                >
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent className="z-[100] border border-slate-200/70 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
                  <SelectItem value="trade_date">Date</SelectItem>
                  <SelectItem value="market">Market</SelectItem>
                  <SelectItem value="outcome">Outcome</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Date Range (left) and Quick Filters (right) - matches client exactly */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 whitespace-nowrap">
                Period:
              </span>
              <div className="relative w-64">
                <div className="relative">
                  <Input
                    readOnly
                    placeholder="Select date range"
                    type="text"
                    value="2026-01-01 ~ 2026-12-31"
                    className="w-full cursor-pointer h-8 text-xs rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-none themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300 pr-8"
                  />
                  <button
                    type="button"
                    className="themed-focus absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer p-0.5 rounded hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors duration-200 focus:outline-none"
                    aria-label="Open date picker"
                  >
                    <Calendar className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  </button>
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto md:ml-auto flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 whitespace-nowrap mr-0.5">
                Quick Filters:
              </span>
              {QUICK_FILTER_LABELS.map(({ key, label, active }) => (
                <Button
                  key={key}
                  type="button"
                  variant={active ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'cursor-pointer rounded-xl h-8 px-3 text-xs transition-colors duration-200 relative overflow-hidden group',
                    active
                      ? 'themed-btn-primary text-white font-semibold shadow-sm border-0'
                      : 'border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 font-medium',
                  )}
                >
                  <span className="relative z-10">{label}</span>
                  {active && (
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Row 3: Checkbox Filters - matches ManageTradesClient exactly */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center">
              <Checkbox
                id="non-executed-checkbox"
                className="h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-purple-400 dark:hover:border-purple-500 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-purple-500 data-[state=checked]:to-violet-600 data-[state=checked]:border-purple-500 dark:data-[state=checked]:border-purple-400 data-[state=checked]:!text-white transition-colors duration-150"
              />
              <Label
                htmlFor="non-executed-checkbox"
                className="cursor-pointer text-slate-700 dark:text-slate-300 text-sm flex items-center font-normal ml-2"
              >
                Show only non-executed trades
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="ml-1 cursor-pointer">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="w-64 max-w-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xl">
                    <div className="text-slate-600 dark:text-slate-300">
                      This filter shows trades marked as &quot;not executed&quot; due to reasons such as emotions, discipline errors, or other factors. These trades are <span className="font-semibold">not</span> included in your statistics.
                    </div>
                  </TooltipContent>
                </Tooltip>
              </Label>
            </div>

            <div className="flex items-center">
              <Checkbox
                id="partial-trades-checkbox"
                className="h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-purple-400 dark:hover:border-purple-500 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-purple-500 data-[state=checked]:to-violet-600 data-[state=checked]:border-purple-500 dark:data-[state=checked]:border-purple-400 data-[state=checked]:!text-white transition-colors duration-150"
              />
              <Label
                htmlFor="partial-trades-checkbox"
                className="cursor-pointer text-slate-700 dark:text-slate-300 text-sm flex items-center font-normal ml-2"
              >
                Show only partial trades
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="ml-1 cursor-pointer">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="w-64 max-w-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xl">
                    <div className="text-slate-600 dark:text-slate-300">
                      This filter shows trades where partial profits were taken during the trade execution.
                    </div>
                  </TooltipContent>
                </Tooltip>
              </Label>
            </div>
          </div>
        </div>

        {/* Table: skeleton only - Card matches client table container */}
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
              <tbody className="divide-y divide-slate-200/30 dark:divide-slate-700/30">
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
    </TooltipProvider>
  );
}
