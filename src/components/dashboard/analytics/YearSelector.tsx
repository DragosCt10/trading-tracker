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
          className="w-28 h-12 rounded-full bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm border-slate-200/60 dark:border-slate-600 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all duration-300 shadow-sm text-slate-900 dark:text-slate-100"
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
