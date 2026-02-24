'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { DateRange } from 'react-date-range';
import { Calendar } from 'lucide-react';

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
import { useColorTheme } from '@/hooks/useColorTheme';

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
  
  /** execution filter dropdown */
  selectedExecution: 'all' | 'executed' | 'nonExecuted';
  onSelectedExecutionChange: (execution: 'all' | 'executed' | 'nonExecuted') => void;
  /** Show "All" option in execution filter (for my-trades page) */
  showAllTradesOption?: boolean;
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
  selectedExecution,
  onSelectedExecutionChange,
  showAllTradesOption = false,
}) => {
  const { colorTheme } = useColorTheme();
  const rangeColor = React.useMemo(() => {
    if (typeof window === 'undefined') return '#a855f7';
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue('--tc-primary')
      .trim();
    return value || '#a855f7';
  }, [colorTheme]);

  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [tempRange, setTempRange] = React.useState<DateRangeValue>(dateRange);

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const pickerRef = React.useRef<HTMLDivElement | null>(null);

  // keep tempRange in sync if parent changes dateRange
  React.useEffect(() => {
    setTempRange(dateRange);
  }, [dateRange]);


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
    <Card className="mb-8 z-1 relative border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-6 p-6">
        {/* Date range input + picker */}
        <div className="flex items-center gap-4">
          <div className="w-72">
            <label className="block text-sm font-semibold text-slate-500 dark:text-slate-300 mb-1.5">
              Period of Analysis:
            </label>
            <div className="relative w-full">
              <div className="relative">
                <Input
                  ref={inputRef}
                  readOnly
                  value={displayRange}
                  onFocus={() => setShowDatePicker(true)}
                  onClick={() => setShowDatePicker(true)}
                  placeholder="Select date range"
                  className="w-full cursor-pointer h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowDatePicker((v) => !v)}
                  className="themed-focus absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20"
                  aria-label="Open date picker"
                >
                  <Calendar className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>

              {showDatePicker && (
                <div
                  ref={pickerRef}
                  className="absolute left-0 z-[10000] mt-2 rounded-2xl overflow-hidden border border-slate-200/70 dark:border-slate-800/70 bg-slate-50 dark:bg-gradient-to-br dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-lg shadow-slate-300/30 dark:shadow-slate-900/30"
                >
                  {/* Gradient orbs background - dark mode only */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl hidden dark:block">
                    <div className="orb-bg-1 absolute -top-40 -left-32 w-[420px] h-[420px] rounded-full blur-3xl" />
                    <div className="orb-bg-2 absolute -bottom-40 -right-32 w-[420px] h-[420px] rounded-full blur-3xl" />
                  </div>

                  {/* Noise texture overlay - dark mode only */}
                  <div
                    className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none rounded-2xl hidden dark:block"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'repeat',
                    }}
                  />

                  {/* Top accent line - dark mode only */}
                  <div className="absolute -top-px left-0 right-0 h-0.5 opacity-60 hidden dark:block" style={{ background: 'linear-gradient(to right, transparent, var(--tc-primary), transparent)' }} />

                  <div className="relative p-2">
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
                    editableDateInputs={false}
                    maxDate={new Date()}
                    showMonthAndYearPickers
                    rangeColors={[rangeColor]}
                    direction="vertical"
                    />

                    <div className="flex justify-end gap-2 border-t border-slate-200/60 dark:border-slate-700/50 bg-transparent dark:bg-transparent px-4 py-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      className="cursor-pointer rounded-xl px-4 py-2 text-sm transition-colors duration-200 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleApply}
                      className="themed-btn-primary cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 border-0 text-white shadow-md"
                    >
                      Apply
                    </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Period filters */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-300">
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
                      ? 'themed-btn-primary text-white font-semibold shadow-md border-0'
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
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-300">
            Filter by market:
          </span>
          <Select
            value={selectedMarket}
            onValueChange={onSelectedMarketChange}
          >
            <SelectTrigger 
              className="flex w-40 h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
              suppressHydrationWarning
            >
              <SelectValue placeholder="All Markets" />
            </SelectTrigger>
            <SelectContent className="z-[100] border border-slate-200/70 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
              <SelectItem value="all">All Markets</SelectItem>
              {markets.map((market) => (
                <SelectItem key={market} value={market}>
                  {market}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Execution filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-300">
            Filter by execution:
          </span>
          <Select
            value={selectedExecution}
            onValueChange={onSelectedExecutionChange}
          >
            <SelectTrigger 
              className="flex w-40 h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
              suppressHydrationWarning
            >
              <SelectValue placeholder={showAllTradesOption ? "All" : "Executed"} />
            </SelectTrigger>
<SelectContent className="z-[100] border border-slate-200/70 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
            {showAllTradesOption && (
                <SelectItem value="all">All</SelectItem>
              )}
              <SelectItem value="executed">Executed</SelectItem>
              <SelectItem value="nonExecuted">Non Executed</SelectItem>
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
