import { useState, useEffect, useRef, useCallback } from 'react';
import { format, startOfYear, endOfYear } from 'date-fns';
import {
  type DateRangeState,
  type FilterType,
  createCalendarRangeFromEnd,
  buildPresetRange,
} from '@/utils/dateRangeHelpers';

export function useDateRangeManagement(initialRange: DateRangeState) {
  const [dateRange, setDateRange] = useState<DateRangeState>(initialRange);
  const [calendarDateRange, setCalendarDateRange] = useState<DateRangeState>(
    () => createCalendarRangeFromEnd(new Date(initialRange.endDate))
  );
  const [currentDate, setCurrentDate] = useState(
    () => new Date(initialRange.endDate)
  );
  const [selectedYear, setSelectedYear] = useState(
    () => new Date(initialRange.endDate).getFullYear()
  );
  const [activeFilter, setActiveFilter] = useState<FilterType>('30days');
  const prevViewModeRef = useRef<'yearly' | 'dateRange'>('yearly');

  // update calendar when main date range changes (without allTrades dependency - handled separately)
  const updateCalendarFromDateRange = useCallback((viewMode: 'yearly' | 'dateRange') => {
    const endDateObj = new Date(dateRange.endDate);
    
    if (viewMode === 'dateRange') {
      // In date range mode: temporarily use the end date
      // Will be updated to first month with trades in the effect below after allTrades is available
      setCurrentDate(endDateObj);
      setSelectedYear(endDateObj.getFullYear());
      setCalendarDateRange(createCalendarRangeFromEnd(endDateObj));
    }
    // Yearly mode calendar initialization is handled in a separate effect after allTrades is available
  }, [dateRange]);

  // update dateRange when switching to yearly mode or when selectedYear changes
  const updateDateRangeForYearlyMode = useCallback((viewMode: 'yearly' | 'dateRange') => {
    if (viewMode === 'yearly') {
      const yearStart = format(startOfYear(new Date(selectedYear, 0, 1)), 'yyyy-MM-dd');
      const yearEnd = format(endOfYear(new Date(selectedYear, 11, 31)), 'yyyy-MM-dd');
      setDateRange({ startDate: yearStart, endDate: yearEnd });
    }
  }, [selectedYear]);

  // reset filter to '30days' when switching back to dateRange mode from yearly mode
  const resetFilterOnModeSwitch = useCallback((viewMode: 'yearly' | 'dateRange') => {
    // Only reset if switching FROM yearly TO dateRange
    if (viewMode === 'dateRange' && prevViewModeRef.current === 'yearly') {
      // Reset activeFilter to '30days' and set dateRange to default "Last 30 Days"
      setActiveFilter('30days');
      const today = new Date();
      const { dateRange: defaultRange, calendarRange, currentDate } =
        buildPresetRange('30days', today);
      setDateRange(defaultRange);
      setCurrentDate(currentDate);
      setCalendarDateRange(calendarRange);
    }
    // Update the ref to track current viewMode for next comparison
    prevViewModeRef.current = viewMode;
  }, []);

  const handleFilter = useCallback((type: FilterType) => {
    const today = new Date();
    setActiveFilter(type);

    const { dateRange: nextRange, calendarRange, currentDate } =
      buildPresetRange(type, today);

    setDateRange(nextRange);
    setCurrentDate(currentDate);
    setCalendarDateRange(calendarRange);
  }, []);

  return {
    dateRange,
    setDateRange,
    calendarDateRange,
    setCalendarDateRange,
    currentDate,
    setCurrentDate,
    selectedYear,
    setSelectedYear,
    activeFilter,
    setActiveFilter,
    updateCalendarFromDateRange,
    updateDateRangeForYearlyMode,
    resetFilterOnModeSwitch,
    handleFilter,
  };
}
