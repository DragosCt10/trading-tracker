'use client';

import { useState, useMemo } from 'react';
import { DateRange } from 'react-date-range';
import { format } from 'date-fns';
import { Download, Search } from 'lucide-react';
import { Trade } from '@/types/trade';
import type { DateRangeValue } from '@/components/dashboard/analytics/TradeFiltersBar';
import { exportTradesToCsv } from '@/utils/exportTradesToCsv';
import { Button } from '@/components/ui/button';
import { ModalShell } from '@/components/ui/ModalShell';
import { cn } from '@/lib/utils';

type ExportTradesModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trades: Trade[];
  mode: 'live' | 'backtesting' | 'demo';
};

export function ExportTradesModal({
  open,
  onOpenChange,
  trades,
  mode,
}: ExportTradesModalProps) {
  const initialFrom = trades.length
    ? new Date(trades[trades.length - 1].trade_date)
    : new Date();
  const initialTo = trades.length ? new Date(trades[0].trade_date) : initialFrom;

  const [dateRange, setDateRange] = useState<DateRangeValue>({
    startDate: format(initialFrom, 'yyyy-MM-dd'),
    endDate: format(initialTo, 'yyyy-MM-dd'),
  });
  const [appliedDateRange, setAppliedDateRange] = useState<DateRangeValue>({
    startDate: format(initialFrom, 'yyyy-MM-dd'),
    endDate: format(initialTo, 'yyyy-MM-dd'),
  });
  const [hasSearchedTrades, setHasSearchedTrades] = useState(false);
  const [executionFilter, setExecutionFilter] = useState<'all' | 'executed'>('all');
  const [exporting, setExporting] = useState(false);

  const hasAppliedRange =
    hasSearchedTrades && Boolean(appliedDateRange.startDate && appliedDateRange.endDate);

  const filteredTrades = useMemo(() => {
    if (!hasAppliedRange || !appliedDateRange.startDate || !appliedDateRange.endDate)
      return [];
    const from = new Date(appliedDateRange.startDate);
    const to = new Date(appliedDateRange.endDate);
    const fromTime = new Date(
      from.getFullYear(),
      from.getMonth(),
      from.getDate(),
      0, 0, 0, 0
    ).getTime();
    const toTime = new Date(
      to.getFullYear(),
      to.getMonth(),
      to.getDate(),
      23, 59, 59, 999
    ).getTime();

    let list = trades.filter((t) => {
      const d = new Date(t.trade_date).getTime();
      return d >= fromTime && d <= toTime;
    });

    if (executionFilter === 'executed') {
      list = list.filter((t) => t.executed !== false);
    }

    return list;
  }, [trades, hasAppliedRange, appliedDateRange.startDate, appliedDateRange.endDate, executionFilter]);

  const canExport = hasAppliedRange && filteredTrades.length > 0 && !exporting;

  const handleSearchTrades = () => {
    setAppliedDateRange(dateRange);
    setHasSearchedTrades(true);
  };

  const handleExport = () => {
    if (!canExport) return;
    setExporting(true);
    try {
      exportTradesToCsv({
        trades: filteredTrades,
        filename: `alpha_stats_trades_${appliedDateRange.startDate}_to_${appliedDateRange.endDate}`,
      });
    } catch (error) {
      console.error('Error exporting trades:', error);
    } finally {
      setExporting(false);
    }
  };

  const tradeSummary = (() => {
    if (!hasAppliedRange) return '';
    if (filteredTrades.length === 0) {
      return 'No trades found in this period. Select a different range and search again.';
    }
    return `${filteredTrades.length} trade${filteredTrades.length === 1 ? '' : 's'} found in this period.`;
  })();

  const handleClose = (next: boolean) => {
    if (!next) {
      setHasSearchedTrades(false);
      setExporting(false);
    }
    onOpenChange(next);
  };

  return (
    <ModalShell
      open={open}
      onOpenChange={handleClose}
      icon={<Download className="h-5 w-5" />}
      title="Export trades"
      description="Select a date range and export your trades as a CSV file. Choose whether to include all trades or only executed ones."
      mode={mode}
    >
      <div className="space-y-12">
        {/* Step 1: Date range selection */}
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-400">
              Step 1 · Select date range
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Only trades in this window will be included in the export.
            </p>
          </div>

          <div className="w-full rounded-2xl overflow-hidden border border-slate-200/70 dark:border-slate-800/70 bg-slate-100 dark:bg-gradient-to-br dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] text-slate-900 dark:text-slate-50 shadow-sm [&_.rdrCalendarWrapper]:!w-full [&_.rdrCalendarWrapper]:bg-slate-100 [&_.rdrCalendarWrapper]:dark:bg-transparent [&_.rdrMonth]:!w-full [&_.rdrMonthAndYearWrapper]:!w-full">
            <div className="relative w-full py-2">
              <DateRange
                ranges={[
                  {
                    startDate: new Date(dateRange.startDate),
                    endDate: new Date(dateRange.endDate),
                    key: 'selection',
                  },
                ]}
                onChange={(ranges) => {
                  const { startDate, endDate } = ranges.selection;
                  const safeStart = startDate ?? initialFrom;
                  const safeEnd = endDate ?? safeStart;
                  setDateRange({
                    startDate: format(safeStart, 'yyyy-MM-dd'),
                    endDate: format(safeEnd, 'yyyy-MM-dd'),
                  });
                  setHasSearchedTrades(false);
                }}
                moveRangeOnFirstSelection={false}
                editableDateInputs={false}
                maxDate={new Date()}
                showMonthAndYearPickers
                rangeColors={['var(--tc-primary, #8b5cf6)']}
                direction="vertical"
              />
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 w-full">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-400">
              Step 2 · Look for the trades
            </p>

            {/* Execution filter toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setExecutionFilter('all');
                  if (hasSearchedTrades) setHasSearchedTrades(false);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border',
                  executionFilter === 'all'
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
                    : 'bg-transparent text-slate-600 border-slate-300 hover:bg-slate-100 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800'
                )}
              >
                All trades
              </button>
              <button
                type="button"
                onClick={() => {
                  setExecutionFilter('executed');
                  if (hasSearchedTrades) setHasSearchedTrades(false);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border',
                  executionFilter === 'executed'
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
                    : 'bg-transparent text-slate-600 border-slate-300 hover:bg-slate-100 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800'
                )}
              >
                Executed only
              </button>
            </div>

            <Button
              type="button"
              onClick={handleSearchTrades}
              size="sm"
              className="themed-btn-primary cursor-pointer w-full sm:w-auto relative overflow-hidden rounded-xl text-white font-semibold border-0 px-4 py-2 group [&_svg]:text-white"
            >
              <Search className="h-3.5 w-3.5" />
              Find trades
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
            </Button>
          </div>

          {hasAppliedRange && (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Selected: {format(new Date(appliedDateRange.startDate), 'MMM d, yyyy')}
                {appliedDateRange.startDate !== appliedDateRange.endDate &&
                  ` – ${format(new Date(appliedDateRange.endDate), 'MMM d, yyyy')}`}
              </p>
              <p className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                {tradeSummary}
              </p>
            </>
          )}
        </div>

        {/* Step 3: Export */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-400">
            Step 3 · Export to CSV
          </p>
          <Button
            type="button"
            onClick={handleExport}
            disabled={!canExport}
            size="sm"
            className="themed-btn-primary cursor-pointer w-full sm:w-auto relative overflow-hidden rounded-xl text-white font-semibold border-0 px-4 py-2 group [&_svg]:text-white disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            <span className="text-sm">{exporting ? 'Exporting…' : 'Export CSV'}</span>
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
          </Button>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Your trades will be downloaded as a CSV file that you can open in Excel,
            Google Sheets, or any spreadsheet application.
          </p>
        </div>
      </div>
    </ModalShell>
  );
}
