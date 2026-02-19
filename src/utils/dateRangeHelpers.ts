import {
  format,
  startOfMonth,
  endOfMonth,
  subDays,
  startOfYear,
  endOfYear,
} from 'date-fns';

export type DateRangeState = {
  startDate: string; // yyyy-MM-dd
  endDate: string;   // yyyy-MM-dd
};

export type FilterType = 'year' | '15days' | '30days' | 'month';

/** Small helpers for dates & ranges */

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

export function createInitialDateRange(today = new Date()): DateRangeState {
  return {
    startDate: fmt(subDays(today, 29)),
    endDate: fmt(today),
  };
}

export function createCalendarRangeFromEnd(endDate: Date): DateRangeState {
  return {
    startDate: fmt(startOfMonth(endDate)),
    endDate: fmt(endOfMonth(endDate)),
  };
}

export function buildPresetRange(
  type: FilterType,
  today = new Date()
): {
  dateRange: DateRangeState;
  calendarRange: DateRangeState;
  currentDate: Date;
} {
  let startDate: string;
  let endDate: string;

  if (type === 'year') {
    startDate = fmt(startOfYear(today));
    endDate = fmt(endOfYear(today));
  } else if (type === '15days') {
    endDate = fmt(today);
    startDate = fmt(subDays(today, 14));
  } else if (type === '30days') {
    endDate = fmt(today);
    startDate = fmt(subDays(today, 29));
  } else {
    // current month
    startDate = fmt(startOfMonth(today));
    endDate = fmt(endOfMonth(today));
  }

  const endDateObj = new Date(endDate);

  return {
    dateRange: { startDate, endDate },
    calendarRange: createCalendarRangeFromEnd(endDateObj),
    currentDate: endDateObj,
  };
}

export function isCustomDateRange(range: DateRangeState): boolean {
  const today = new Date();

  const yearStart = fmt(startOfYear(today));
  const yearEnd = fmt(endOfYear(today));
  const last15Start = fmt(subDays(today, 14));
  const last30Start = fmt(subDays(today, 29));
  const monthStart = fmt(startOfMonth(today));
  const monthEnd = fmt(endOfMonth(today));

  const presets: DateRangeState[] = [
    { startDate: yearStart, endDate: yearEnd },
    { startDate: last15Start, endDate: fmt(today) },
    { startDate: last30Start, endDate: fmt(today) },
    { startDate: monthStart, endDate: monthEnd },
  ];

  return !presets.some(
    (p) => p.startDate === range.startDate && p.endDate === range.endDate
  );
}
