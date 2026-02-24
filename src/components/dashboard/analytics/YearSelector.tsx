'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface YearSelectorProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
}

export function YearSelector({ selectedYear, onYearChange }: YearSelectorProps) {
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
        <SelectContent>
          {[selectedYear - 1, selectedYear, selectedYear + 1].map((year) => (
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
