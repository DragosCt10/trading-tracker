'use client';

import { useMemo } from 'react';
import { Calendar, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TIMEFRAMES, type Timeframe, maxDaysForTimeframe } from '@/lib/marketData/types';
import {
  BACKTESTABLE_SYMBOLS,
  type BacktestableSymbol,
} from '@/lib/marketData/dukascopySymbols';

export interface SymbolPickerValue {
  symbol: BacktestableSymbol;
  timeframe: Timeframe;
  fromIso: string; // YYYY-MM-DD format input → expanded to ISO at query time
  toIso: string;
}

interface SymbolPickerProps {
  value: SymbolPickerValue;
  onChange: (next: SymbolPickerValue) => void;
  /** Disable the form while a fetch is in flight. */
  disabled?: boolean;
}

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  m1: '1 minute',
  m2: '2 minutes',
  m3: '3 minutes',
  m4: '4 minutes',
  m5: '5 minutes',
  m15: '15 minutes',
  m30: '30 minutes',
  h1: '1 hour',
  h4: '4 hours',
  d1: 'Daily',
  w1: 'Weekly',
  mn1: 'Monthly',
};

// Short labels (TradingView-style) shown in the compact trigger.
const TIMEFRAME_SHORT: Record<Timeframe, string> = {
  m1: '1m',
  m2: '2m',
  m3: '3m',
  m4: '4m',
  m5: '5m',
  m15: '15m',
  m30: '30m',
  h1: '1h',
  h4: '4h',
  d1: '1D',
  w1: '1W',
  mn1: '1M',
};

// Shared classes for flat TradingView-style toolbar buttons.
const TV_BTN =
  'h-8 gap-1.5 px-2 w-auto min-w-0 border-transparent bg-transparent shadow-none ' +
  'hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ' +
  'focus:ring-0 focus-visible:ring-0 focus:ring-offset-0';

/**
 * TradingView-style toolbar: flat single-row, no labels above inputs,
 * compact pill buttons with hover-fill, vertical separators between
 * groups. Symbol + timeframe are flat Selects; date range is two flat
 * native date inputs with an arrow between them.
 */
export function SymbolPicker({ value, onChange, disabled }: SymbolPickerProps) {
  const maxDays = useMemo(() => maxDaysForTimeframe(value.timeframe), [value.timeframe]);

  return (
    <div className="flex flex-wrap items-center gap-0.5 text-sm">
      {/* Symbol */}
      <Select
        value={value.symbol}
        disabled={disabled}
        onValueChange={(v) => onChange({ ...value, symbol: v as BacktestableSymbol })}
      >
        <SelectTrigger
          aria-label="Symbol"
          className={`${TV_BTN} font-semibold text-slate-900 dark:text-slate-100`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-[400px]">
          {BACKTESTABLE_SYMBOLS.map((s) => (
            <SelectItem key={s} value={s} className="cursor-pointer">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />

      {/* Timeframe */}
      <Select
        value={value.timeframe}
        disabled={disabled}
        onValueChange={(v) => onChange({ ...value, timeframe: v as Timeframe })}
      >
        <SelectTrigger
          aria-label="Timeframe"
          title={`Max ${maxDays.toLocaleString()} days at ${value.timeframe}`}
          className={`${TV_BTN} font-medium text-slate-700 dark:text-slate-200`}
        >
          <SelectValue>{TIMEFRAME_SHORT[value.timeframe]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {TIMEFRAMES.map((tf) => (
            <SelectItem key={tf} value={tf} className="cursor-pointer">
              <span className="inline-block w-9 font-mono text-xs text-slate-500 dark:text-slate-400">
                {TIMEFRAME_SHORT[tf]}
              </span>
              <span>{TIMEFRAME_LABELS[tf]}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />

      {/* Date range — flat native inputs with an arrow between */}
      <div className="flex items-center gap-0.5 pl-1">
        <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        <Input
          type="date"
          aria-label="From date"
          value={value.fromIso}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, fromIso: e.target.value })}
          className={`${TV_BTN} w-[130px] font-medium text-slate-700 dark:text-slate-200`}
        />
        <ArrowRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        <Input
          type="date"
          aria-label="To date"
          value={value.toIso}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, toIso: e.target.value })}
          className={`${TV_BTN} w-[130px] font-medium text-slate-700 dark:text-slate-200`}
        />
      </div>
    </div>
  );
}
