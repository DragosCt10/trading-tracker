import { useCallback, useEffect, useMemo, useRef } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Trade } from '@/types/trade';
import { type DateRangeState, createCalendarRangeFromEnd } from '@/utils/dateRangeHelpers';

interface UseCalendarNavigationProps {
  viewMode: 'yearly' | 'dateRange';
  dateRange: DateRangeState;
  currentDate: Date;
  selectedYear: number;
  selectedMarket: string;
  selectedExecution: 'all' | 'executed' | 'nonExecuted';
  allTrades: Trade[];
  filteredTrades: Trade[];
  nonExecutedTrades: Trade[] | null;
  filteredTradesLoading: boolean;
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
  allTrades,
  filteredTrades,
  nonExecutedTrades,
  filteredTradesLoading,
  setCurrentDate,
  setCalendarDateRange,
  setSelectedYear,
}: UseCalendarNavigationProps) {
  const lastFilterKeyRef = useRef<string>('');

  // Single computed list for calendar (avoids re-filtering in every callback/effect)
  const filteredTradesForCalendar = useMemo(() => {
    let baseTrades: Trade[] = viewMode === 'yearly' ? allTrades : filteredTrades;

    if (viewMode === 'dateRange') {
      if (selectedExecution === 'nonExecuted') {
        baseTrades = nonExecutedTrades || [];
      } else if (selectedExecution === 'executed') {
        baseTrades = baseTrades.filter((t) => t.executed === true);
      }
    }

    if (selectedMarket !== 'all') {
      baseTrades = baseTrades.filter((t) => t.market === selectedMarket);
    }

    return baseTrades;
  }, [viewMode, allTrades, filteredTrades, nonExecutedTrades, selectedMarket, selectedExecution]);

  const getFilteredTradesForCalendar = useCallback(() => filteredTradesForCalendar, [filteredTradesForCalendar]);

  // Reused in canNavigateMonth, handleMonthNavigation, and yearly effect
  const monthsWithTradesYearly = useMemo(() => {
    const set = new Set<number>();
    filteredTradesForCalendar.forEach((trade) => {
      const d = new Date(trade.trade_date);
      if (d.getFullYear() === selectedYear) set.add(d.getMonth());
    });
    return set;
  }, [filteredTradesForCalendar, selectedYear]);

  // Reused in canNavigateMonth, handleMonthNavigation, and dateRange effect
  const monthsWithTradesDateRange = useMemo(() => {
    const startDateObj = new Date(dateRange.startDate);
    const endDateObj = new Date(dateRange.endDate);
    const map = new Map<string, { year: number; month: number }>();
    filteredTradesForCalendar.forEach((trade) => {
      const tradeDate = new Date(trade.trade_date);
      if (tradeDate >= startDateObj && tradeDate <= endDateObj) {
        const tradeYear = tradeDate.getFullYear();
        const tradeMonth = tradeDate.getMonth();
        const key = `${tradeYear}-${tradeMonth}`;
        if (!map.has(key)) map.set(key, { year: tradeYear, month: tradeMonth });
      }
    });
    return map;
  }, [filteredTradesForCalendar, dateRange.startDate, dateRange.endDate]);

  const tradesInSelectedYearCount = useMemo(
    () => filteredTradesForCalendar.filter((t) => new Date(t.trade_date).getFullYear() === selectedYear).length,
    [filteredTradesForCalendar, selectedYear]
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
  }, [canNavigateMonth, currentDate, viewMode, selectedYear, monthsWithTradesYearly, monthsWithTradesDateRange, dateRange, setCurrentDate, setCalendarDateRange, setSelectedYear]);

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

  // update calendar for dateRange mode after filtered trades are available
  useEffect(() => {
    if (viewMode === 'dateRange' && !filteredTradesLoading) {
      const filterKey = `${viewMode}-${dateRange.startDate}-${dateRange.endDate}-${selectedMarket}-${selectedExecution}`;
      const startDateObj = new Date(dateRange.startDate);
      const endDateObj = new Date(dateRange.endDate);
      const startYear = startDateObj.getFullYear();
      const startMonth = startDateObj.getMonth();

      const currentMonthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
      const currentMonthHasTrades = monthsWithTradesDateRange.has(currentMonthKey);
      const filtersChanged = lastFilterKeyRef.current !== filterKey;

      if (filtersChanged || !currentMonthHasTrades) {
        let targetYear = startYear;
        let targetMonth = startMonth;

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

        const targetDate = new Date(targetYear, targetMonth, 1);
        setCurrentDate(targetDate);
        setSelectedYear(targetYear);
        setCalendarDateRange(createCalendarRangeFromEnd(targetDate));
      }

      lastFilterKeyRef.current = filterKey;
    }
  }, [viewMode, dateRange.startDate, dateRange.endDate, selectedMarket, selectedExecution, currentDate, monthsWithTradesDateRange, filteredTradesLoading, setCurrentDate, setSelectedYear, setCalendarDateRange]);

  return {
    getFilteredTradesForCalendar,
    canNavigateMonth,
    handleMonthNavigation,
  };
}
