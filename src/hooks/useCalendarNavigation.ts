import { useCallback, useEffect, useMemo, useRef } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { type DateRangeState, createCalendarRangeFromEnd } from '@/utils/dateRangeHelpers';

interface UseCalendarNavigationProps {
  viewMode: 'yearly' | 'dateRange';
  dateRange: DateRangeState;
  currentDate: Date;
  selectedYear: number;
  selectedMarket: string;
  selectedExecution: 'all' | 'executed' | 'nonExecuted';
  /** 'YYYY-MM' strings from server stats — which months have trades (filter-aware). */
  tradeMonths: string[];
  statsLoading: boolean;
  setCurrentDate: (date: Date) => void;
  setCalendarDateRange: (range: DateRangeState) => void;
  setSelectedYear: (year: number) => void;
}

export function useCalendarNavigation({
  viewMode,
  dateRange,
  currentDate,
  selectedYear,
  selectedMarket,
  selectedExecution,
  tradeMonths,
  statsLoading,
  setCurrentDate,
  setCalendarDateRange,
  setSelectedYear,
}: UseCalendarNavigationProps) {
  const lastFilterKeyRef = useRef<string>('');

  // Months with trades for yearly navigation: set of month indices (0–11) in selectedYear
  const monthsWithTradesYearly = useMemo(() => {
    const set = new Set<number>();
    for (const ym of tradeMonths) {
      const [y, m] = ym.split('-').map(Number);
      if (y === selectedYear) set.add(m - 1); // month index 0-based
    }
    return set;
  }, [tradeMonths, selectedYear]);

  // Months with trades for dateRange navigation: map of 'year-month' → { year, month }
  const monthsWithTradesDateRange = useMemo(() => {
    const startYM = dateRange.startDate.slice(0, 7); // 'YYYY-MM'
    const endYM = dateRange.endDate.slice(0, 7);     // 'YYYY-MM'
    const map = new Map<string, { year: number; month: number }>();
    for (const ym of tradeMonths) {
      if (ym >= startYM && ym <= endYM) {
        const [y, m] = ym.split('-').map(Number);
        const key = `${y}-${m - 1}`;
        if (!map.has(key)) map.set(key, { year: y, month: m - 1 });
      }
    }
    return map;
  }, [tradeMonths, dateRange.startDate, dateRange.endDate]);

  const tradesInSelectedYearCount = useMemo(
    () => tradeMonths.filter(ym => ym.startsWith(`${selectedYear}-`)).length,
    [tradeMonths, selectedYear]
  );

  const canNavigateMonth = useCallback((direction: 'prev' | 'next') => {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const startMonth = startDate.getMonth();
    const startYear = startDate.getFullYear();
    const endMonth = endDate.getMonth();
    const endYear = endDate.getFullYear();

    if (viewMode === 'dateRange') {
      if (direction === 'prev') {
        for (let y = currentYear; y >= startYear; y--) {
          const startM = y === currentYear ? currentMonth - 1 : 11;
          const endM = y === startYear ? startMonth : 0;
          for (let m = startM; m >= endM; m--) {
            if (monthsWithTradesDateRange.has(`${y}-${m}`)) return true;
          }
        }
        return false;
      } else {
        for (let y = currentYear; y <= endYear; y++) {
          const startM = y === currentYear ? currentMonth + 1 : 0;
          const endM = y === endYear ? endMonth : 11;
          for (let m = startM; m <= endM; m++) {
            if (monthsWithTradesDateRange.has(`${y}-${m}`)) return true;
          }
        }
        return false;
      }
    } else {
      if (currentYear !== selectedYear) return false;
      if (direction === 'prev') {
        for (let m = currentMonth - 1; m >= 0; m--) {
          if (monthsWithTradesYearly.has(m)) return true;
        }
        return false;
      } else {
        for (let m = currentMonth + 1; m <= 11; m++) {
          if (monthsWithTradesYearly.has(m)) return true;
        }
        return false;
      }
    }
  }, [currentDate, dateRange, viewMode, selectedYear, monthsWithTradesYearly, monthsWithTradesDateRange]);

  const handleMonthNavigation = useCallback((direction: 'prev' | 'next') => {
    if (!canNavigateMonth(direction)) return;

    const newDate = new Date(currentDate);
    let month = newDate.getMonth();
    const year = newDate.getFullYear();

    if (viewMode === 'yearly') {
      if (direction === 'prev') {
        for (let m = month - 1; m >= 0; m--) {
          if (monthsWithTradesYearly.has(m)) {
            month = m;
            break;
          }
        }
      } else {
        for (let m = month + 1; m <= 11; m++) {
          if (monthsWithTradesYearly.has(m)) {
            month = m;
            break;
          }
        }
      }
    } else {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      const startMonth = startDate.getMonth();
      const startYear = startDate.getFullYear();
      const endMonth = endDate.getMonth();
      const endYear = endDate.getFullYear();

      if (direction === 'prev') {
        let found = false;
        for (let y = year; y >= startYear && !found; y--) {
          const startM = y === year ? month - 1 : 11;
          const endM = y === startYear ? startMonth : 0;
          for (let m = startM; m >= endM; m--) {
            if (monthsWithTradesDateRange.has(`${y}-${m}`)) {
              month = m;
              newDate.setFullYear(y);
              found = true;
              break;
            }
          }
        }
      } else {
        let found = false;
        for (let y = year; y <= endYear && !found; y++) {
          const startM = y === year ? month + 1 : 0;
          const endM = y === endYear ? endMonth : 11;
          for (let m = startM; m <= endM; m++) {
            if (monthsWithTradesDateRange.has(`${y}-${m}`)) {
              month = m;
              newDate.setFullYear(y);
              found = true;
              break;
            }
          }
        }
      }
    }

    const targetDate = new Date(newDate.getFullYear(), month, 1);
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);

    setCurrentDate(targetDate);
    setCalendarDateRange({
      startDate: format(monthStart, 'yyyy-MM-dd'),
      endDate: format(monthEnd, 'yyyy-MM-dd'),
    });
    if (viewMode === 'dateRange') {
      setSelectedYear(targetDate.getFullYear());
    }
  }, [canNavigateMonth, currentDate, viewMode, monthsWithTradesYearly, monthsWithTradesDateRange, dateRange, setCurrentDate, setCalendarDateRange, setSelectedYear]);

  // update calendar for yearly mode after filtered trades are available
  useEffect(() => {
    if (viewMode === 'yearly') {
      const filterKey = `${viewMode}-${selectedYear}-${selectedMarket}-${selectedExecution}-${tradesInSelectedYearCount}`;
      const calendarYearMatchesSelection = currentDate.getFullYear() === selectedYear;
      const currentMonthHasTradesInData =
        calendarYearMatchesSelection && monthsWithTradesYearly.has(currentDate.getMonth());

      if (
        lastFilterKeyRef.current === filterKey &&
        calendarYearMatchesSelection &&
        (tradesInSelectedYearCount === 0 || currentMonthHasTradesInData)
      ) {
        return;
      }

      const currentMonthHasTrades = calendarYearMatchesSelection && monthsWithTradesYearly.has(currentDate.getMonth());

      if (!currentMonthHasTrades) {
        let targetMonth = 0;
        if (monthsWithTradesYearly.size > 0) {
          for (let m = 0; m <= 11; m++) {
            if (monthsWithTradesYearly.has(m)) {
              targetMonth = m;
              break;
            }
          }
        }
        const targetDate = new Date(selectedYear, targetMonth, 1);
        setCurrentDate(targetDate);
        setCalendarDateRange(createCalendarRangeFromEnd(targetDate));
      }

      lastFilterKeyRef.current = filterKey;
    }
  }, [viewMode, selectedYear, selectedMarket, selectedExecution, tradesInSelectedYearCount, currentDate, monthsWithTradesYearly, setCurrentDate, setCalendarDateRange]);

  // update calendar for dateRange mode after stats are available
  useEffect(() => {
    if (viewMode === 'dateRange' && !statsLoading) {
      const filterKey = `${viewMode}-${dateRange.startDate}-${dateRange.endDate}-${selectedMarket}-${selectedExecution}`;
      const endDateObj = new Date(dateRange.endDate);

      const currentMonthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
      const currentMonthHasTrades = monthsWithTradesDateRange.has(currentMonthKey);
      const filtersChanged = lastFilterKeyRef.current !== filterKey;

      if (filtersChanged || !currentMonthHasTrades) {
        // When no trades exist, default to endDate (today) instead of startDate.
        // For "All Trades" filter, startDate is 2000-01-01 — falling back to year 2000
        // would set selectedYear to a far-past value, causing a conflict with
        // updateCalendarFromDateRange (which resets to endDate's year) → infinite loop.
        const fallbackYear = endDateObj.getFullYear();
        const fallbackMonth = endDateObj.getMonth();
        let targetYear = fallbackYear;
        let targetMonth = fallbackMonth;

        if (monthsWithTradesDateRange.size > 0) {
          let earliestDate = endDateObj;
          monthsWithTradesDateRange.forEach(({ year, month }) => {
            const monthDate = new Date(year, month, 1);
            if (monthDate < earliestDate) {
              earliestDate = monthDate;
              targetYear = year;
              targetMonth = month;
            }
          });
        }

        // Guard: only call setState if the target month/year is actually different.
        // Without this, when there are no trades, targetDate equals currentDate but as a
        // new object reference — causing the effect to re-fire endlessly (infinite loop).
        const targetMonthKey = `${targetYear}-${targetMonth}`;
        if (targetMonthKey !== currentMonthKey) {
          const targetDate = new Date(targetYear, targetMonth, 1);
          setCurrentDate(targetDate);
          setSelectedYear(targetYear);
          setCalendarDateRange(createCalendarRangeFromEnd(targetDate));
        }
      }

      lastFilterKeyRef.current = filterKey;
    }
  }, [viewMode, dateRange.startDate, dateRange.endDate, selectedMarket, selectedExecution, currentDate, monthsWithTradesDateRange, statsLoading, setCurrentDate, setSelectedYear, setCalendarDateRange]);

  return {
    canNavigateMonth,
    handleMonthNavigation,
  };
}
