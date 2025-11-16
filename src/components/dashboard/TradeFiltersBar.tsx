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
    <Card className="mb-8 border shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-4 p-6">
        {/* Date range input + picker */}
        <div className="flex items-center gap-4">
          <div className="w-72">
            <div className="relative w-full">
              <Input
                ref={inputRef}
                readOnly
                value={displayRange}
                onFocus={() => setShowDatePicker(true)}
                onClick={() => setShowDatePicker(true)}
                placeholder="Select date range"
                className="w-full cursor-pointer shadow-none"
              />
              <button
                type="button"
                onClick={() => setShowDatePicker((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center text-slate-600 hover:text-slate-800"
              >
                <Calendar className="h-4 w-4" />
              </button>

              {showDatePicker && (
                <div
                  ref={pickerRef}
                  className="absolute left-0 z-50 mt-2 rounded-lg overflow-hidden border border-slate-200 bg-white shadow-none"
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
                    rangeColors={['#1e293b']} // slate-800
                    direction="vertical"
                  />

                  <div className="flex justify-end gap-2 border-t border-slate-200 bg-white px-3 py-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      className="border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleApply}
                      className="bg-slate-800 text-slate-50 hover:bg-slate-900"
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Period filters */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-800">
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
                    'rounded-lg px-4 text-sm transition',
                    isActive
                      ? 'bg-slate-800 text-slate-50 hover:bg-slate-900 border-slate-900'
                      : 'border-slate-400 text-slate-700 hover:bg-slate-50',
                  )}
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Market filter */}
        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm font-medium text-slate-800">
            Filter by market:
          </span>
          <Select
            value={selectedMarket}
            onValueChange={onSelectedMarketChange}
          >
            <SelectTrigger className="flex w-40 shadow-none">
              <SelectValue placeholder="All Markets" />
            </SelectTrigger>
            <SelectContent className="">
              <SelectItem value="all">All Markets</SelectItem>
              {markets.map((market) => (
                <SelectItem key={market} value={market}>
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
