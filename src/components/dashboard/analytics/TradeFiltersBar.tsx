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

type PresetKey = 'year' | '15days' | '30days' | 'month' | 'all';

export interface DateRangeValue {
  startDate: string; // yyyy-MM-dd
  endDate: string;   // yyyy-MM-dd
}

type FullTradeFiltersBarProps = {
  /** default */
  variant?: 'full';
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
  /** Override the start date shown in the period input (e.g. actual first trade date instead of 2000-01-01) */
  displayStartDate?: string;
};

type MarketOnlyTradeFiltersBarProps = {
  variant: 'marketOnly';

  /** market dropdown */
  selectedMarket: string;
  onSelectedMarketChange: (market: string) => void;
  markets: string[];
};

type TradeFiltersBarProps = FullTradeFiltersBarProps | MarketOnlyTradeFiltersBarProps;

export const TradeFiltersBar: React.FC<TradeFiltersBarProps> = (props) => {
  const { colorTheme } = useColorTheme();
  const rangeColor = React.useMemo(() => {
    if (typeof window === 'undefined') return '#a855f7';
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue('--tc-primary')
      .trim();
    return value || '#a855f7';
  }, [colorTheme]);

  if (props.variant === 'marketOnly') {
    const { selectedMarket, onSelectedMarketChange, markets } = props;
    return (
      <Card className="mb-4 z-1 relative border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
          {/* Market filter */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 whitespace-nowrap">
              Market:
            </span>
            <Select value={selectedMarket} onValueChange={onSelectedMarketChange}>
              <SelectTrigger
                className="flex w-28 h-8 text-xs rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-none themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
                suppressHydrationWarning
              >
                <SelectValue placeholder="All Markets" />
              </SelectTrigger>
              <SelectContent className="z-[100] rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 cursor-pointer">
                <SelectItem value="all">All Markets</SelectItem>
                {markets.map((market) => (
                  <SelectItem key={market} value={market}>
                    {market}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>
    );
  }

  const {
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
    displayStartDate,
  } = props;

  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [tempRange, setTempRange] = React.useState<DateRangeValue>({
    startDate: displayStartDate ?? dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const pickerRef = React.useRef<HTMLDivElement | null>(null);

  // keep tempRange in sync if parent changes dateRange
  React.useEffect(() => {
    setTempRange({
      startDate: displayStartDate ?? dateRange.startDate,
      endDate: dateRange.endDate,
    });
  }, [dateRange, displayStartDate]);


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
        setTempRange({ startDate: displayStartDate ?? dateRange.startDate, endDate: dateRange.endDate });
        setShowDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker, dateRange]);

  const presets: { key: PresetKey; label: string }[] = [
    { key: 'all', label: 'All Trades' },
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
    setTempRange({ startDate: displayStartDate ?? dateRange.startDate, endDate: dateRange.endDate });
    setShowDatePicker(false);
  };

  const displayRange = `${displayStartDate ?? dateRange.startDate} ~ ${dateRange.endDate}`;

  return (
    <Card className="mb-4 z-1 relative border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
      <div className="flex flex-wrap items-start gap-3 px-4 py-2.5">
        {/* Left: Period (label + input) and preset buttons stacked */}
        <div className="flex flex-col gap-2">
          {/* Period: prefix + date input */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 whitespace-nowrap">
              Period:
            </span>
            <div className="relative w-64">
              <div className="relative">
                <Input
                  ref={inputRef}
                  readOnly
                  value={displayRange}
                  onFocus={() => setShowDatePicker(true)}
                  onClick={() => setShowDatePicker(true)}
                  placeholder="Select date range"
                  className="w-full cursor-pointer h-8 text-xs rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-none themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300 pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowDatePicker((v) => !v)}
                  className="themed-focus absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer p-0.5 rounded hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors duration-200 focus:outline-none"
                  aria-label="Open date picker"
                >
                  <Calendar className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
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

                      <div className="flex justify-end gap-2 border-t border-slate-200/60 dark:border-slate-700/50 bg-transparent dark:bg-transparent px-3 py-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancel}
                        className="cursor-pointer rounded-xl h-8 px-3 text-xs transition-colors duration-200 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleApply}
                        className="themed-btn-primary cursor-pointer rounded-xl h-8 px-3 text-xs font-semibold transition-all duration-200 border-0 text-white shadow-sm"
                      >
                        Apply
                      </Button>
                      </div>
                    </div>
                  </div>
              )}
            </div>
          </div>

          {/* Preset filter buttons under Period input */}
          <div className="flex flex-wrap gap-2 mt-2">
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
                    'cursor-pointer rounded-xl h-8 px-3 text-xs transition-colors duration-200 relative overflow-hidden group',
                    isActive
                      ? 'themed-btn-primary text-white font-semibold shadow-sm border-0'
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

        {/* Right: Market and Execution filters (unchanged position) */}
        <div className="ml-auto flex flex-wrap items-center gap-3">
        {/* Market filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 whitespace-nowrap">
            Market:
          </span>
          <Select
            value={selectedMarket}
            onValueChange={onSelectedMarketChange}
          >
            <SelectTrigger
              className="flex w-28 h-8 text-xs rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-none themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
              suppressHydrationWarning
            >
              <SelectValue placeholder="All Markets" />
            </SelectTrigger>
            <SelectContent className="z-[100] rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 cursor-pointer">
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
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 whitespace-nowrap">
            Execution:
          </span>
          <Select
            value={selectedExecution}
            onValueChange={onSelectedExecutionChange}
          >
            <SelectTrigger
              className="flex w-28 h-8 text-xs rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-none themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
              suppressHydrationWarning
            >
              <SelectValue placeholder={showAllTradesOption ? "All" : "Executed"} />
            </SelectTrigger>
<SelectContent className="z-[100] rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 cursor-pointer">
            {showAllTradesOption && (
                <SelectItem value="all">All</SelectItem>
              )}
              <SelectItem value="executed">Executed</SelectItem>
              <SelectItem value="nonExecuted">Non Executed</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
          className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md relative bg-linear-to-b from-stone-700 to-stone-800 border-stone-900 text-stone-50 rounded-xl hover:bg-linear-to-b hover:from-stone-800 hover:to-stone-800 hover:border-stone-900 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.25),inset_0_-2px_0px_rgba(0,0,0,0.35)] after:pointer-events-none transition antialiased"
        >
          Analyze Trading Performance
        </button> */}
      </div>
    </Card>
  );
};
