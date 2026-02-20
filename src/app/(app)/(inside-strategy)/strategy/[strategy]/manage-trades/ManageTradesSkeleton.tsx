'use client';

import { format, startOfMonth, endOfMonth } from 'date-fns';
import AppLayout from '@/components/shared/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

export function ManageTradesSkeleton() {
  const today = new Date();
  const monthStart = fmt(startOfMonth(today));
  const monthEnd = fmt(endOfMonth(today));
  const dateRangeDisplay = `${monthStart} ~ ${monthEnd}`;

  return (
    <AppLayout>
      <TooltipProvider>
        <div className="max-w-(--breakpoint-xl) mx-auto py-8">
          {/* Header Section - same as real page */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Trades
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  Viewing trades for live mode
                </p>
              </div>
              <Button
                disabled
                className="cursor-not-allowed relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 text-white font-semibold shadow-md shadow-purple-500/30 dark:shadow-purple-500/20 px-4 py-2 group border-0 opacity-90"
              >
                <span className="relative z-10">Export Trades</span>
              </Button>
            </div>
          </div>

          {/* Filters Section - same as real page */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                Market:
              </label>
              <div
                className="w-full sm:w-48 h-12 rounded-md flex items-center px-3 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                aria-hidden
              >
                All Markets
              </div>
            </div>

            <div className="flex items-center w-full sm:w-auto">
              <Checkbox
                id="skeleton-non-executed"
                checked={false}
                disabled
                className="h-5 w-5 rounded-md border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              />
              <Label
                htmlFor="skeleton-non-executed"
                className="text-slate-700 dark:text-slate-300 text-sm flex items-center font-normal ml-2 cursor-default"
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
                      This filter shows trades marked as &quot;not executed&quot; due to reasons such as emotions, discipline errors, or other factors.
                    </div>
                  </TooltipContent>
                </Tooltip>
              </Label>
            </div>

            <div className="flex items-center w-full sm:w-auto sm:ml-4">
              <Checkbox
                id="skeleton-partial"
                checked={false}
                disabled
                className="h-5 w-5 rounded-md border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              />
              <Label
                htmlFor="skeleton-partial"
                className="text-slate-700 dark:text-slate-300 text-sm flex items-center font-normal ml-2 cursor-default"
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

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                Sort by:
              </label>
              <div
                className="w-full sm:w-48 h-12 rounded-md flex items-center px-3 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                aria-hidden
              >
                Date
              </div>
            </div>
          </div>

          {/* Date Range - same as real page */}
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex flex-col gap-4 w-full md:flex-row md:items-end">
              <div className="w-full md:flex-1">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Date Range
                </label>
                <div className="relative w-full max-w-xs sm:w-72">
                  <Input
                    readOnly
                    value={dateRangeDisplay}
                    className="pr-10 shadow-none w-full h-12 bg-slate-100/50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 cursor-default"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="size-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z"
                      />
                    </svg>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2 md:mt-0">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  Filter by:
                </span>
                <div className="flex flex-wrap gap-2 items-center">
                  <Button
                    variant="outline"
                    disabled
                    className="cursor-default rounded-xl px-4 py-2 text-sm border border-slate-200/80 bg-slate-100/60 text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300"
                  >
                    Current Year
                  </Button>
                  <Button
                    variant="outline"
                    disabled
                    className="cursor-default rounded-xl px-4 py-2 text-sm border border-slate-200/80 bg-slate-100/60 text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300"
                  >
                    Last 15 Days
                  </Button>
                  <Button
                    variant="outline"
                    disabled
                    className="cursor-default rounded-xl px-4 py-2 text-sm border border-slate-200/80 bg-slate-100/60 text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300"
                  >
                    Last 30 Days
                  </Button>
                  <Button
                    disabled
                    className="cursor-default rounded-xl px-4 py-2 text-sm bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 text-white border-0 shadow-md shadow-purple-500/30 dark:shadow-purple-500/20"
                  >
                    Current Month
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Table - real headers, skeleton only in tbody */}
          <Card className="group relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br from-white via-slate-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-900 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm transition-all duration-500 hover:shadow-xl hover:shadow-slate-200/60 dark:hover:border-slate-600/50">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-violet-500/5 dark:from-purple-500/10 dark:to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" aria-hidden />
            <div className="relative overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200/30 dark:divide-slate-700/30">
                <thead className="bg-transparent border-b border-slate-300 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Market</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Direction</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Setup</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Outcome</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Risk</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Trade</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Liquidity</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Notes</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-transparent divide-y divide-slate-200/30 dark:divide-slate-700/30">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm align-middle">
                        <Skeleton className="h-4 w-20 inline-block align-middle" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm align-middle">
                        <Skeleton className="h-4 w-16 inline-block align-middle" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm align-middle">
                        <Skeleton className="h-4 w-16 inline-block align-middle" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm align-middle">
                        <Skeleton className="h-4 w-12 inline-block align-middle" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm align-middle">
                        <Skeleton className="h-4 w-20 inline-block align-middle" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm align-middle">
                        <Skeleton className="h-6 w-16 rounded-full inline-block align-middle" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm align-middle">
                        <Skeleton className="h-4 w-12 inline-block align-middle" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm align-middle">
                        <Skeleton className="h-4 w-20 inline-block align-middle" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm align-middle">
                        <Skeleton className="h-4 w-20 inline-block align-middle" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm align-middle">
                        <Skeleton className="h-4 w-20 inline-block align-middle" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm align-middle">
                        <Skeleton className="h-4 w-24 inline-block align-middle" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </TooltipProvider>
    </AppLayout>
  );
}
