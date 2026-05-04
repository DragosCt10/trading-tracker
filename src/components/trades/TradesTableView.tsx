'use client';

import type { Trade } from '@/types/trade';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTradeTimeWithMode } from '@/utils/formatTradeTime';
import { ScreensCarouselCell } from '@/components/trades/ScreensCarouselCell';
import { OutcomeChips } from '@/components/trades/OutcomeChips';

export type TradesTableViewProps = {
  trades: Trade[];
  isLoading?: boolean;
  emptyMessage?: string;
  /** When set, show checkbox column and use selection state */
  showCheckboxes?: boolean;
  selectedIds?: Set<string>;
  allOnPageSelected?: boolean;
  onToggleSelectAll?: () => void;
  onToggleSelectOne?: (id: string) => void;
  onOpenDetails: (trade: Trade) => void;
  onOpenNotes?: (notes: string) => void;
  /** Optional error to show instead of rows */
  error?: Error | null;
};

const TABLE_HEAD_CLASS =
  'px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider';
const TABLE_CELL_CLASS = 'px-6 py-4 whitespace-nowrap text-sm';

export function TradesTableView({
  trades,
  isLoading = false,
  emptyMessage = 'No trades found.',
  showCheckboxes = false,
  selectedIds = new Set(),
  allOnPageSelected = false,
  onToggleSelectAll,
  onToggleSelectOne,
  onOpenDetails,
  onOpenNotes,
  error = null,
}: TradesTableViewProps) {
  const colCount = showCheckboxes ? 11 : 10;

  if (error) {
    return (
      <div className="relative overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200/30 dark:divide-slate-700/30">
          <thead className="bg-transparent border-b border-slate-300 dark:border-slate-700">
            <tr>
              {showCheckboxes && <th className="w-12 px-4 py-4 text-left" />}
              <th className={TABLE_HEAD_CLASS}>Screens</th>
              <th className={TABLE_HEAD_CLASS}>Date</th>
              <th className={TABLE_HEAD_CLASS}>Time</th>
              <th className={TABLE_HEAD_CLASS}>Market</th>
              <th className={TABLE_HEAD_CLASS}>Direction</th>
              <th className={TABLE_HEAD_CLASS}>RR</th>
              <th className={TABLE_HEAD_CLASS}>Outcome</th>
              <th className={TABLE_HEAD_CLASS}>Risk</th>
              <th className={TABLE_HEAD_CLASS}>Notes</th>
              <th className={TABLE_HEAD_CLASS}>Actions</th>
            </tr>
          </thead>
          <tbody className="bg-transparent divide-y divide-slate-200/30 dark:divide-slate-700/30">
            <tr>
              <td colSpan={colCount} className="px-6 py-12 text-center">
                <p className="text-red-600 dark:text-red-400 text-sm font-semibold">
                  Failed to load trades: {error.message}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (isLoading && trades.length === 0) {
    return (
      <div className="relative overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200/30 dark:divide-slate-700/30">
          <thead className="bg-transparent border-b border-slate-300 dark:border-slate-700">
            <tr>
              {showCheckboxes && <th className="w-12 px-4 py-4 text-left" />}
              <th className={TABLE_HEAD_CLASS}>Screens</th>
              <th className={TABLE_HEAD_CLASS}>Date</th>
              <th className={TABLE_HEAD_CLASS}>Time</th>
              <th className={TABLE_HEAD_CLASS}>Market</th>
              <th className={TABLE_HEAD_CLASS}>Direction</th>
              <th className={TABLE_HEAD_CLASS}>RR</th>
              <th className={TABLE_HEAD_CLASS}>Outcome</th>
              <th className={TABLE_HEAD_CLASS}>Risk</th>
              <th className={TABLE_HEAD_CLASS}>Notes</th>
              <th className={TABLE_HEAD_CLASS}>Actions</th>
            </tr>
          </thead>
          <tbody className="bg-transparent divide-y divide-slate-200/30 dark:divide-slate-700/30">
            {Array.from({ length: 6 }).map((_, index) => (
              <tr key={`skeleton-${index}`}>
                {showCheckboxes && (
                  <td className="w-12 px-4 py-4 whitespace-nowrap">
                    <Skeleton className="h-5 w-5 rounded" />
                  </td>
                )}
                <td className={cn(TABLE_CELL_CLASS, 'align-middle')}>
                  <Skeleton className="h-16 w-28 rounded-lg" />
                </td>
                <td className={TABLE_CELL_CLASS}>
                  <Skeleton className="h-5 w-20" />
                </td>
                <td className={TABLE_CELL_CLASS}>
                  <Skeleton className="h-5 w-16" />
                </td>
                <td className={TABLE_CELL_CLASS}>
                  <Skeleton className="h-5 w-16" />
                </td>
                <td className={TABLE_CELL_CLASS}>
                  <Skeleton className="h-5 w-12" />
                </td>
                <td className={TABLE_CELL_CLASS}>
                  <Skeleton className="h-5 w-20" />
                </td>
                <td className={TABLE_CELL_CLASS}>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </td>
                <td className={TABLE_CELL_CLASS}>
                  <Skeleton className="h-5 w-12" />
                </td>
                <td className={TABLE_CELL_CLASS}>
                  <Skeleton className="h-5 w-20" />
                </td>
                <td className={TABLE_CELL_CLASS}>
                  <Skeleton className="h-5 w-24" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="relative overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200/30 dark:divide-slate-700/30">
          <thead className="bg-transparent border-b border-slate-300 dark:border-slate-700">
            <tr>
              {showCheckboxes && <th className="w-12 px-4 py-4 text-left" />}
              <th className={TABLE_HEAD_CLASS}>Screens</th>
              <th className={TABLE_HEAD_CLASS}>Date</th>
              <th className={TABLE_HEAD_CLASS}>Time</th>
              <th className={TABLE_HEAD_CLASS}>Market</th>
              <th className={TABLE_HEAD_CLASS}>Direction</th>
              <th className={TABLE_HEAD_CLASS}>RR</th>
              <th className={TABLE_HEAD_CLASS}>Outcome</th>
              <th className={TABLE_HEAD_CLASS}>Risk</th>
              <th className={TABLE_HEAD_CLASS}>Notes</th>
              <th className={TABLE_HEAD_CLASS}>Actions</th>
            </tr>
          </thead>
          <tbody className="bg-transparent divide-y divide-slate-200/30 dark:divide-slate-700/30">
            <tr>
              <td colSpan={colCount} className="px-6 py-12 text-center">
                <p className="text-slate-600 dark:text-slate-400 text-sm">{emptyMessage}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200/30 dark:divide-slate-700/30">
        <thead className="bg-transparent border-b border-slate-300 dark:border-slate-700">
          <tr>
            {showCheckboxes && (
              <th className="w-12 px-4 py-4 text-left">
                <Checkbox
                  checked={allOnPageSelected}
                  onCheckedChange={onToggleSelectAll}
                  aria-label="Select all on page"
                  className="h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-purple-400 dark:hover:border-purple-500 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-purple-500 data-[state=checked]:to-violet-600 data-[state=checked]:border-purple-500 dark:data-[state=checked]:border-purple-400 data-[state=checked]:!text-white transition-colors duration-150"
                />
              </th>
            )}
            <th className={TABLE_HEAD_CLASS}>Screens</th>
            <th className={TABLE_HEAD_CLASS}>Date</th>
            <th className={TABLE_HEAD_CLASS}>Time</th>
            <th className={TABLE_HEAD_CLASS}>Market</th>
            <th className={TABLE_HEAD_CLASS}>Direction</th>
            <th className={TABLE_HEAD_CLASS}>RR</th>
            <th className={TABLE_HEAD_CLASS}>Outcome</th>
            <th className={TABLE_HEAD_CLASS}>Risk</th>
            <th className={TABLE_HEAD_CLASS}>Notes</th>
            <th className={TABLE_HEAD_CLASS}>Actions</th>
          </tr>
        </thead>
        <tbody className="bg-transparent divide-y divide-slate-200/30 dark:divide-slate-700/30">
          {trades.map((trade) => (
            <tr key={trade.id} suppressHydrationWarning>
              {showCheckboxes && (
                <td className="w-12 px-4 py-4 whitespace-nowrap">
                  {trade.id && (
                    <Checkbox
                      checked={selectedIds.has(trade.id)}
                      onCheckedChange={() => onToggleSelectOne?.(trade.id!)}
                      aria-label={`Select trade ${trade.trade_date} ${trade.market}`}
                      className="h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-purple-400 dark:hover:border-purple-500 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-purple-500 data-[state=checked]:to-violet-600 data-[state=checked]:border-purple-500 dark:data-[state=checked]:border-purple-400 data-[state=checked]:!text-white transition-colors duration-150"
                    />
                  )}
                </td>
              )}
              <td className={cn(TABLE_CELL_CLASS, 'align-middle')}>
                <ScreensCarouselCell trade={trade} />
              </td>
              <td className={cn(TABLE_CELL_CLASS, 'font-medium text-slate-900 dark:text-slate-100')}>
                {trade.trade_date}
              </td>
              <td className={cn(TABLE_CELL_CLASS, 'text-slate-700 dark:text-slate-300')} suppressHydrationWarning>
                {formatTradeTimeWithMode(trade.trade_time, trade.trade_time_format)}
              </td>
              <td className={cn(TABLE_CELL_CLASS, 'font-medium text-slate-900 dark:text-slate-100')}>
                {trade.market}
              </td>
              <td className={cn(TABLE_CELL_CLASS, 'text-slate-700 dark:text-slate-300')}>
                {trade.direction === 'Long' ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="text-emerald-500 dark:text-emerald-400 text-xs">↑</span>
                    <span>Long</span>
                  </span>
                ) : trade.direction === 'Short' ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="text-rose-500 dark:text-rose-400 text-xs">↓</span>
                    <span>Short</span>
                  </span>
                ) : (
                  <span>{trade.direction ?? '—'}</span>
                )}
              </td>
              <td className={TABLE_CELL_CLASS}>
                {typeof trade.risk_reward_ratio === 'number' && !Number.isNaN(trade.risk_reward_ratio) ? (
                  <span className="text-slate-700 dark:text-slate-300">
                    {trade.risk_reward_ratio.toFixed(2)}
                    <span className="ml-0.5 text-[10px] text-slate-400 dark:text-slate-500">R</span>
                  </span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-600">—</span>
                )}
              </td>
              <td className={cn(TABLE_CELL_CLASS, 'text-slate-900 dark:text-slate-100')}>
                <OutcomeChips trade={trade} />
              </td>
              <td className={cn(TABLE_CELL_CLASS, 'font-medium text-slate-900 dark:text-slate-100')}>
                {trade.risk_per_trade}%
              </td>
              <td className={cn(TABLE_CELL_CLASS, 'text-slate-900 dark:text-slate-100')}>
                {trade.notes ? (
                  onOpenNotes ? (
                    <button
                      type="button"
                      onClick={() => onOpenNotes(trade.notes || '')}
                      className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 underline font-medium transition-colors cursor-pointer"
                    >
                      View Notes
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenDetails(trade)}
                      className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 underline font-medium transition-colors cursor-pointer"
                    >
                      View Notes
                    </button>
                  )
                ) : (
                  <span className="text-slate-400 dark:text-slate-500">No notes</span>
                )}
              </td>
              <td className={cn(TABLE_CELL_CLASS, 'text-slate-900 dark:text-slate-100')}>
                <button
                  type="button"
                  onClick={() => onOpenDetails(trade)}
                  className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 underline font-medium transition-colors cursor-pointer"
                >
                  Trade Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
