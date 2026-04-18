'use client';

import { useMemo, useState } from 'react';
import { DateRange } from 'react-date-range';
import { format, startOfMonth, startOfQuarter, startOfYear } from 'date-fns';
import { cn } from '@/lib/utils';

export interface Period {
  start: string;
  end: string;
}

interface PeriodPickerProps {
  value: Period;
  onChange: (value: Period) => void;
}

const toIso = (d: Date) => format(d, 'yyyy-MM-dd');

type PresetId = 'mtd' | 'qtd' | 'ytd' | 'custom';

export function PeriodPicker({ value, onChange }: PeriodPickerProps) {
  const presets = useMemo(() => {
    const now = new Date();
    const today = toIso(now);
    return [
      { id: 'mtd' as const, label: 'Month to date', start: toIso(startOfMonth(now)), end: today },
      { id: 'qtd' as const, label: 'Quarter to date', start: toIso(startOfQuarter(now)), end: today },
      { id: 'ytd' as const, label: 'Year to date', start: toIso(startOfYear(now)), end: today },
    ];
  }, []);

  // Track the last preset the user clicked so overlapping ranges (e.g. early in
  // a quarter where MTD and QTD share the same start date) keep the clicked
  // preset highlighted instead of falling back to the first match.
  const [lastClickedId, setLastClickedId] = useState<PresetId | null>(null);

  const active: PresetId = useMemo(() => {
    if (lastClickedId && lastClickedId !== 'custom') {
      const clicked = presets.find((p) => p.id === lastClickedId);
      if (clicked && clicked.start === value.start && clicked.end === value.end) {
        return lastClickedId;
      }
    }
    for (const p of presets) {
      if (p.start === value.start && p.end === value.end) return p.id;
    }
    return 'custom';
  }, [lastClickedId, presets, value.start, value.end]);

  const startDate = useMemo(() => new Date(value.start), [value.start]);
  const endDate = useMemo(() => new Date(value.end), [value.end]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => {
          const isActive = active === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setLastClickedId(p.id);
                onChange({ start: p.start, end: p.end });
              }}
              className={cn(
                'min-w-[2.25rem] px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 cursor-pointer',
                isActive
                  ? 'themed-header-icon-box shadow-sm border-transparent text-slate-50'
                  : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-800 dark:hover:text-slate-200',
              )}
            >
              {p.label}
            </button>
          );
        })}
        <div
          className={cn(
            'min-w-[2.25rem] px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200',
            active === 'custom'
              ? 'themed-header-icon-box shadow-sm border-transparent text-slate-50'
              : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-500',
          )}
          aria-hidden="true"
        >
          Custom
        </div>
      </div>

      <div className="w-full rounded-2xl overflow-hidden border border-slate-200/70 dark:border-slate-800/70 bg-slate-100 dark:bg-gradient-to-br dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] text-slate-900 dark:text-slate-50 shadow-sm [&_.rdrCalendarWrapper]:!w-full [&_.rdrCalendarWrapper]:bg-slate-100 [&_.rdrCalendarWrapper]:dark:bg-transparent [&_.rdrMonth]:!w-full [&_.rdrMonthAndYearWrapper]:!w-full">
        <div className="relative w-full py-2">
          <DateRange
            ranges={[
              {
                startDate,
                endDate,
                key: 'selection',
              },
            ]}
            onChange={(ranges) => {
              const selection = ranges.selection;
              const safeStart = selection.startDate ?? startDate;
              const safeEnd = selection.endDate ?? safeStart;
              setLastClickedId(null);
              onChange({
                start: format(safeStart, 'yyyy-MM-dd'),
                end: format(safeEnd, 'yyyy-MM-dd'),
              });
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

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Selected: {format(startDate, 'MMM d, yyyy')}
        {value.start !== value.end && ` – ${format(endDate, 'MMM d, yyyy')}`}
      </p>
    </div>
  );
}
