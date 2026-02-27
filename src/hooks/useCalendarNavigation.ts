import { useCallback, useEffect, useRef } from 'react';
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

  // Helper function to get filtered trades for calendar navigation (respects execution and market filters)
  const getFilteredTradesForCalendar = useCallback(() => {
    // Get base trades based on view mode
    let baseTrades: Trade[] = viewMode === 'yearly' ? allTrades : filteredTrades;
    
    // Apply execution filter in dateRange mode
    if (viewMode === 'dateRange') {
      if (selectedExecution === 'nonExecuted') {
        baseTrades = nonExecutedTrades || [];
      } else if (selectedExecution === 'executed') {
        // Filter to only executed trades
        baseTrades = baseTrades.filter((t) => t.executed === true);
      }
      // If 'all', don't filter (show all trades) - though this shouldn't happen on analytics page
    }
    
    // Apply market filter if needed
    if (selectedMarket !== 'all') {
      baseTrades = baseTrades.filter((t) => t.market === selectedMarket);
    }
    
    return baseTrades;
  }, [viewMode, allTrades, filteredTrades, nonExecutedTrades, selectedMarket, selectedExecution]);

  // Memoize callbacks that depend on allTrades (must be after useDashboardData)
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
      // In date range mode: only allow navigation within the selected date range AND to months with filtered trades
      // Get months that have filtered trades within the date range
      const tradesToCheck = getFilteredTradesForCalendar();
      const monthsWithTrades = new Map<string, boolean>(); // key: "year-month", value: has trades
      
      tradesToCheck.forEach((trade) => {
        const tradeDate = new Date(trade.trade_date);
        const tradeYear = tradeDate.getFullYear();
        const tradeMonth = tradeDate.getMonth();
        
        // Check if trade is within date range
        if (tradeDate >= startDate && tradeDate <= endDate) {
          const key = `${tradeYear}-${tradeMonth}`;
          monthsWithTrades.set(key, true);
        }
      });

      if (direction === 'prev') {
        // Can go back if there's a previous month with trades within the date range
        // Check months from current month backwards to start date
        for (let y = currentYear; y >= startYear; y--) {
          const startM = y === currentYear ? currentMonth - 1 : 11;
          const endM = y === startYear ? startMonth : 0;
          
          for (let m = startM; m >= endM; m--) {
            const key = `${y}-${m}`;
            if (monthsWithTrades.has(key)) return true;
          }
        }
        return false;
      } else {
        // Can go forward if there's a next month with trades within the date range
        // Check months from current month forwards to end date
        for (let y = currentYear; y <= endYear; y++) {
          const startM = y === currentYear ? currentMonth + 1 : 0;
          const endM = y === endYear ? endMonth : 11;
          
          for (let m = startM; m <= endM; m++) {
            const key = `${y}-${m}`;
            if (monthsWithTrades.has(key)) return true;
          }
        }
        return false;
      }
    } else {
      // In yearly mode: allow navigation within the selected year, but only to months with filtered trades
      if (currentYear !== selectedYear) return false;

      // Get months that have filtered trades in the selected year
      const tradesToCheck = getFilteredTradesForCalendar();
      const monthsWithTrades = new Set<number>();
      tradesToCheck.forEach((trade) => {
        const tradeDate = new Date(trade.trade_date);
        if (tradeDate.getFullYear() === selectedYear) {
          monthsWithTrades.add(tradeDate.getMonth());
        }
      });

      if (direction === 'prev') {
        // Find the previous month with trades
        for (let m = currentMonth - 1; m >= 0; m--) {
          if (monthsWithTrades.has(m)) return true;
        }
        return false;
      } else {
        // Find the next month with trades
        for (let m = currentMonth + 1; m <= 11; m++) {
          if (monthsWithTrades.has(m)) return true;
        }
        return false;
      }
    }
  }, [currentDate, dateRange, viewMode, selectedYear, getFilteredTradesForCalendar]);

  const handleMonthNavigation = useCallback((direction: 'prev' | 'next') => {
    if (!canNavigateMonth(direction)) return;

    const newDate = new Date(currentDate);
    let month = newDate.getMonth();
    const year = newDate.getFullYear();

    if (viewMode === 'yearly') {
      // In yearly mode: navigate to the next/previous month that has filtered trades
      const tradesToCheck = getFilteredTradesForCalendar();
      const monthsWithTrades = new Set<number>();
      tradesToCheck.forEach((trade) => {
        const tradeDate = new Date(trade.trade_date);
        if (tradeDate.getFullYear() === selectedYear) {
          monthsWithTrades.add(tradeDate.getMonth());
        }
      });

      if (direction === 'prev') {
        // Find the previous month with trades
        for (let m = month - 1; m >= 0; m--) {
          if (monthsWithTrades.has(m)) {
            month = m;
            break;
          }
        }
      } else {
        // Find the next month with trades
        for (let m = month + 1; m <= 11; m++) {
          if (monthsWithTrades.has(m)) {
            month = m;
            break;
          }
        }
      }
    } else {
      // In date range mode: navigate to the next/previous month that has filtered trades within the date range
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      const startMonth = startDate.getMonth();
      const startYear = startDate.getFullYear();
      const endMonth = endDate.getMonth();
      const endYear = endDate.getFullYear();
      
      const tradesToCheck = getFilteredTradesForCalendar();
      const monthsWithTrades = new Map<string, number>(); // key: "year-month", value: month number
      
      tradesToCheck.forEach((trade) => {
        const tradeDate = new Date(trade.trade_date);
        const tradeYear = tradeDate.getFullYear();
        const tradeMonth = tradeDate.getMonth();
        
        // Check if trade is within date range
        if (tradeDate >= startDate && tradeDate <= endDate) {
          const key = `${tradeYear}-${tradeMonth}`;
          monthsWithTrades.set(key, tradeMonth);
        }
      });

      if (direction === 'prev') {
        // Find the previous month with trades
        let found = false;
        for (let y = year; y >= startYear && !found; y--) {
          const startM = y === year ? month - 1 : 11;
          const endM = y === startYear ? startMonth : 0;
          
          for (let m = startM; m >= endM; m--) {
            const key = `${y}-${m}`;
            if (monthsWithTrades.has(key)) {
              month = m;
              newDate.setFullYear(y);
              found = true;
              break;
            }
          }
        }
      } else {
        // Find the next month with trades
        let found = false;
        for (let y = year; y <= endYear && !found; y++) {
          const startM = y === year ? month + 1 : 0;
          const endM = y === endYear ? endMonth : 11;
          
          for (let m = startM; m <= endM; m++) {
            const key = `${y}-${m}`;
            if (monthsWithTrades.has(key)) {
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
  }, [canNavigateMonth, currentDate, viewMode, selectedYear, getFilteredTradesForCalendar, dateRange, setCurrentDate, setCalendarDateRange]);

  // update calendar for yearly mode after filtered trades are available
  useEffect(() => {
    if (viewMode === 'yearly') {
      const filteredTradesForCalendar = getFilteredTradesForCalendar();
      const tradesInSelectedYear = filteredTradesForCalendar.filter(
        (t) => new Date(t.trade_date).getFullYear() === selectedYear
      );
      // Include trades count so we re-run when the selected year's data loads (e.g. after year change)
      const filterKey = `${viewMode}-${selectedYear}-${selectedMarket}-${selectedExecution}-${tradesInSelectedYear.length}`;
      const calendarYearMatchesSelection = currentDate.getFullYear() === selectedYear;

      // Skip only if filters and data haven't changed AND calendar is already showing a valid month for this year.
      const currentMonthHasTradesInData =
        calendarYearMatchesSelection &&
        tradesInSelectedYear.some((t) => new Date(t.trade_date).getMonth() === currentDate.getMonth());
      if (
        lastFilterKeyRef.current === filterKey &&
        calendarYearMatchesSelection &&
        (tradesInSelectedYear.length === 0 || currentMonthHasTradesInData)
      ) {
        return;
      }

      // In yearly mode: set to the first month with filtered trades, or January if no trades
      const monthsWithTrades = new Set<number>();
      filteredTradesForCalendar.forEach((trade) => {
        const tradeDate = new Date(trade.trade_date);
        if (tradeDate.getFullYear() === selectedYear) {
          monthsWithTrades.add(tradeDate.getMonth());
        }
      });

      const currentMonthHasTrades = currentDate.getFullYear() === selectedYear && monthsWithTrades.has(currentDate.getMonth());

      if (!currentMonthHasTrades) {
        let targetMonth = 0;
        if (monthsWithTrades.size > 0) {
          for (let m = 0; m <= 11; m++) {
            if (monthsWithTrades.has(m)) {
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
  }, [viewMode, selectedYear, selectedMarket, selectedExecution, allTrades, currentDate, getFilteredTradesForCalendar]);

  // update calendar for dateRange mode after filtered trades are available
  useEffect(() => {
    if (viewMode === 'dateRange' && !filteredTradesLoading) {
      const filterKey = `${viewMode}-${dateRange.startDate}-${dateRange.endDate}-${selectedMarket}-${selectedExecution}`;
      
      const filteredTradesForCalendar = getFilteredTradesForCalendar();
      const startDateObj = new Date(dateRange.startDate);
      const endDateObj = new Date(dateRange.endDate);
      
      // In date range mode: find the first month with filtered trades within the date range
      const startYear = startDateObj.getFullYear();
      const startMonth = startDateObj.getMonth();
      
      // Get months that have filtered trades within the date range
      const monthsWithTrades = new Map<string, { year: number; month: number }>();
      filteredTradesForCalendar.forEach((trade) => {
        const tradeDate = new Date(trade.trade_date);
        const tradeYear = tradeDate.getFullYear();
        const tradeMonth = tradeDate.getMonth();
        
        // Check if trade is within date range
        if (tradeDate >= startDateObj && tradeDate <= endDateObj) {
          const key = `${tradeYear}-${tradeMonth}`;
          if (!monthsWithTrades.has(key)) {
            monthsWithTrades.set(key, { year: tradeYear, month: tradeMonth });
          }
        }
      });
      
      // Check if current month has filtered trades and is within date range
      const currentMonthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
      const currentMonthHasTrades = monthsWithTrades.has(currentMonthKey);
      const filtersChanged = lastFilterKeyRef.current !== filterKey;
      
      // Reset calendar if:
      // 1. Filters have changed (date range, market, or execution filter)
      // 2. Current month doesn't have trades in the filtered date range
      if (filtersChanged || !currentMonthHasTrades) {
        // Find the first month with filtered trades, or use start date if no trades
        let targetYear = startYear;
        let targetMonth = startMonth;
        
        if (monthsWithTrades.size > 0) {
          // Find the earliest month with filtered trades
          let earliestDate = endDateObj;
          monthsWithTrades.forEach(({ year, month }) => {
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
      
      // Update ref
      lastFilterKeyRef.current = filterKey;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, dateRange.startDate, dateRange.endDate, selectedMarket, selectedExecution, filteredTrades, filteredTradesLoading]);

  return {
    getFilteredTradesForCalendar,
    canNavigateMonth,
    handleMonthNavigation,
  };
}
