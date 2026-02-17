'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { DateRange } from 'react-date-range';
import { Calendar, ChevronDown } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type PresetKey = 'year' | '15days' | '30days' | 'month';

export interface DateRangeValue {
  startDate: string; // yyyy-MM-dd
  endDate: string;   // yyyy-MM-dd
}

interface TradeFiltersBarProps {
  dateRange: DateRangeValue;
  onDateRangeChange: (range: DateRangeValue) => void;

  /** which preset filter is currently active */
  activeFilter: PresetKey | null;
  /** called when user clicks a preset (Current Year, Last 15 days, etc.) */
  onFilterChange: (key: PresetKey) => void;
  /** true when user is using a manual custom range */
  isCustomRange: boolean;

  /** market dropdown */
  selectedMarket: string;
  onSelectedMarketChange: (market: string) => void;
  markets: string[]; // unique list of markets (e.g. from allTrades)
}

export const TradeFiltersBar: React.FC<TradeFiltersBarProps> = ({
  dateRange,
  onDateRangeChange,
  activeFilter,
  onFilterChange,
  isCustomRange,
  selectedMarket,
  onSelectedMarketChange,
  markets,
}) => {
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [tempRange, setTempRange] = React.useState<DateRangeValue>(dateRange);
  const [pickerPosition, setPickerPosition] = React.useState({ top: 0, left: 0 });

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const pickerRef = React.useRef<HTMLDivElement | null>(null);

  // keep tempRange in sync if parent changes dateRange
  React.useEffect(() => {
    setTempRange(dateRange);
  }, [dateRange]);

  // Calculate picker position when opening
  React.useEffect(() => {
    if (showDatePicker && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setPickerPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
      });
    }
  }, [showDatePicker]);

  // click-outside to close date picker
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!showDatePicker) return;

      const target = event.target as Node;
      if (
        pickerRef.current &&
        !pickerRef.current.contains(target) &&
        inputRef.current &&
        !inputRef.current.contains(target)
      ) {
        // discard changes
        setTempRange(dateRange);
        setShowDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker, dateRange]);

  const presets: { key: PresetKey; label: string }[] = [
    { key: 'year', label: 'Current Year' },
    { key: '15days', label: 'Last 15 Days' },
    { key: '30days', label: 'Last 30 Days' },
    { key: 'month', label: 'Current Month' },
  ];

  const handleApply = () => {
    onDateRangeChange({ ...tempRange });
    setShowDatePicker(false);
  };

  const handleCancel = () => {
    setTempRange({ ...dateRange });
    setShowDatePicker(false);
  };

  const displayRange = `${dateRange.startDate} ~ ${dateRange.endDate}`;

  return (
    <Card className="mb-8 z-1 relative border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br bg-slate-50/70  dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-900 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-6 p-6">
        {/* Date range input + picker */}
        <div className="flex items-center gap-4">
          <div className="w-72">
            <div className="relative w-full">
              <div className="relative">
                <Input
                  ref={inputRef}
                  readOnly
                  value={displayRange}
                  onFocus={() => setShowDatePicker(true)}
                  onClick={() => setShowDatePicker(true)}
                  placeholder="Select date range"
                  className="w-full cursor-pointer shadow-none border-slate-200/60 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all duration-200 rounded-xl h-10"
                />
                <button
                  type="button"
                  onClick={() => setShowDatePicker((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                </button>
              </div>

              {showDatePicker && (
                <div
                  ref={pickerRef}
                  className="absolute left-0 z-[10000] mt-2 rounded-2xl overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br bg-slate-50 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-900 shadow-2xl shadow-slate-900/30 dark:shadow-black/60 backdrop-blur-sm [&_.rdrCalendarWrapper]:bg-transparent [&_.rdrDateDisplayItem]:cursor-pointer [&_.rdrDateDisplayItem]:rounded-full [&_.rdrDateDisplayItem]:border [&_.rdrDateDisplayItem]:border-slate-300/50 [&_.rdrDateDisplayItem]:bg-transparent [&_.rdrDateDisplayItem]:text-black [&_.rdrDateDisplayItem]:shadow-none [&_.rdrDateDisplayItem]:hover:bg-purple-50/30 [&_.rdrDateDisplayItem]:hover:text-purple-600 [&_.rdrDateDisplayItem]:dark:border-slate-600/50 [&_.rdrDateDisplayItem]:dark:text-slate-200 [&_.rdrDateDisplayItem]:dark:hover:bg-purple-900/20 [&_.rdrDateDisplayItem]:dark:hover:text-purple-300 [&_.rdrDateDisplayItem]:font-medium [&_.rdrDateDisplayItem]:transition-colors [&_.rdrDateDisplayItem]:duration-200 [&_.rdrDateDisplayItem]:px-3 [&_.rdrDateDisplayItem]:py-1.5 [&_.rdrDateDisplayItem]:text-sm [&_input]:cursor-pointer [&_input]:rounded-full [&_input]:border [&_input]:border-slate-300/50 [&_input]:bg-transparent [&_input]:text-black [&_input]:shadow-none [&_input]:hover:bg-purple-50/30 [&_input]:hover:text-purple-600 [&_input]:dark:border-slate-600/50 [&_input]:dark:text-slate-200 [&_input]:dark:hover:bg-purple-900/20 [&_input]:dark:hover:text-purple-300 [&_input]:font-medium [&_input]:transition-colors [&_input]:duration-200 [&_input]:px-3 [&_input]:py-1.5 [&_input]:text-sm"
                >
                  <DateRange
                    ranges={[
                      {
                        startDate: new Date(tempRange.startDate),
                        endDate: new Date(tempRange.endDate),
                        key: 'selection',
                      },
                    ]}
                    onChange={(ranges) => {
                      const { startDate, endDate } = ranges.selection;
                      const safeStart = startDate || new Date();
                      const safeEnd = endDate || safeStart;

                      setTempRange({
                        startDate: format(safeStart, 'yyyy-MM-dd'),
                        endDate: format(safeEnd, 'yyyy-MM-dd'),
                      });
                    }}
                    moveRangeOnFirstSelection={false}
                    editableDateInputs
                    maxDate={new Date()}
                    showMonthAndYearPickers
                    rangeColors={['#8b5cf6']} // violet-500
                    direction="vertical"
                  />

                  <div className="flex justify-end gap-2 border-t border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br bg-slate-50/70 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-900 backdrop-blur-sm px-4 py-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      className="cursor-pointer rounded-xl px-4 py-2 text-sm transition-colors duration-200 relative overflow-hidden group border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 font-medium"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleApply}
                      className="cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 relative overflow-hidden group border-0 bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 hover:from-purple-600 hover:via-violet-700 hover:to-fuchsia-700 text-white shadow-md shadow-purple-500/30 dark:shadow-purple-500/20"
                    >
                      <span className="relative z-10">Apply</span>
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Period filters */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Filter by period:
          </span>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => {
              const isActive = activeFilter === preset.key && !isCustomRange;
              return (
                <Button
                  key={preset.key}
                  type="button"
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onFilterChange(preset.key)}
                  className={cn(
                    'cursor-pointer rounded-xl px-4 py-2 text-sm transition-colors duration-200 relative overflow-hidden group',
                    isActive
                      ? 'bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 hover:from-purple-600 hover:via-violet-700 hover:to-fuchsia-700 text-white font-semibold shadow-md shadow-purple-500/30 dark:shadow-purple-500/20 border-0'
                      : 'border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 font-medium',
                  )}
                >
                  <span className="relative z-10">{preset.label}</span>
                  {isActive && (
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Market filter */}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Filter by market:
          </span>
          <Select
            value={selectedMarket}
            onValueChange={onSelectedMarketChange}
          >
            <SelectTrigger 
              className="flex w-40 shadow-none border-slate-200/60 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all duration-200 rounded-xl h-10" 
              suppressHydrationWarning
            >
              <SelectValue placeholder="All Markets" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-lg backdrop-blur-sm">
              <SelectItem value="all" className="rounded-lg focus:bg-slate-100 dark:focus:bg-slate-800">All Markets</SelectItem>
              {markets.map((market) => (
                <SelectItem key={market} value={market} className="rounded-lg focus:bg-slate-100 dark:focus:bg-slate-800">
                  {market}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* <button
          onClick={async () => {
            const analysisData: TradingAnalysisRequest = { 
              startDate: dateRange.startDate,
              endDate: dateRange.endDate,
              accountBalance: selection.activeAccount?.account_balance || 0,
              totalTrades: stats.totalTrades,
              totalWins: stats.totalWins,
              totalLosses: stats.totalLosses,
              winRate: stats.winRate,
              winRateWithBE: stats.winRateWithBE,
              totalProfit: stats.totalProfit,
              averageProfit: stats.averageProfit,
              maxDrawdown: stats.maxDrawdown,
              averagePnLPercentage: stats.averagePnLPercentage,
              profitFactor: macroStats.profitFactor,
              consistencyScore: macroStats.consistencyScore,
              consistencyScoreWithBE: macroStats.consistencyScoreWithBE,
              sharpeWithBE: macroStats.sharpeWithBE
            };

            try {
              setOpenAnalyzeModal(true);
              setAnalysisResults(''); // Reset
              await analyzeTradingData(analysisData, (partial) => {
                setAnalysisResults(partial);
              });
            } catch (error) {
              setAnalysisResults('Error generating analysis. Please try again.');
            }
          }}
          className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md relative bg-linear-to-b from-stone-700 to-stone-800 border-stone-900 text-stone-50 rounded-lg hover:bg-linear-to-b hover:from-stone-800 hover:to-stone-800 hover:border-stone-900 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.25),inset_0_-2px_0px_rgba(0,0,0,0.35)] after:pointer-events-none transition antialiased"
        >
          Analyze Trading Performance
        </button> */}
      </div>
    </Card>
  );
};
