'use client';

import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const START_YEAR = 2000;

interface YearSelectorProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
}

export function YearSelector({ selectedYear, onYearChange }: YearSelectorProps) {
  const years = useMemo(() => {
    const endYear = new Date().getFullYear() + 1;
    const list: number[] = [];
    for (let y = endYear; y >= START_YEAR; y--) {
      list.push(y);
    }
    return list;
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Year</span>
      <Select value={String(selectedYear)} onValueChange={(value) => onYearChange(Number(value))}>
        <SelectTrigger
          suppressHydrationWarning
          className="themed-focus w-28 h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 transition-all duration-300"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="z-[100] max-h-60 overflow-y-auto rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 cursor-pointer">
          {years.map((year) => (
            <SelectItem
              key={year}
              value={String(year)}
            >
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
