'use client';

import { cn } from '@/lib/utils';
import {
  DEMO_SYMBOLS,
  DEMO_TFS,
  TIMEFRAME_LABELS,
  type DemoSymbol,
  type DemoTimeframe,
} from './demoCatalog';

interface DemoSymbolPickerProps {
  symbol: DemoSymbol;
  tf: DemoTimeframe;
  onChange: (symbol: DemoSymbol, tf: DemoTimeframe) => void;
}

export function DemoSymbolPicker({ symbol, tf, onChange }: DemoSymbolPickerProps) {
  return (
    <div className="flex flex-col gap-3">
      <SegmentedRow
        label="Symbol"
        options={DEMO_SYMBOLS}
        value={symbol}
        onSelect={(next) => onChange(next, tf)}
        renderOption={(o) => o}
      />
      <SegmentedRow
        label="Timeframe"
        options={DEMO_TFS}
        value={tf}
        onSelect={(next) => onChange(symbol, next)}
        renderOption={(o) => TIMEFRAME_LABELS[o]}
      />
    </div>
  );
}

interface SegmentedRowProps<T extends string> {
  label: string;
  options: readonly T[];
  value: T;
  onSelect: (next: T) => void;
  renderOption: (option: T) => string;
}

function SegmentedRow<T extends string>({
  label,
  options,
  value,
  onSelect,
  renderOption,
}: SegmentedRowProps<T>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground w-20 shrink-0">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex flex-wrap gap-1 rounded-lg border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 p-1 backdrop-blur-sm"
      >
        {options.map((option) => {
          const isActive = option === value;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onSelect(option)}
              className={cn(
                'min-h-[36px] min-w-[44px] rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {renderOption(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
