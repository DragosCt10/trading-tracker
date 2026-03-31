import { getIntervalForTime } from '@/constants/analytics';

/**
 * Display trade time as interval label (e.g. "08:00 – 11:59").
 * Falls back to raw time for legacy or ISO values.
 */
export function formatTradeTimeForDisplay(value: string | Date | unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') {
    if (value.includes('T') || value.includes('Z')) {
      const d = new Date(value);
      return d.toISOString().slice(11, 19);
    }
    const interval = getIntervalForTime(value);
    return interval?.label ?? value;
  }
  if (value instanceof Date) {
    return value.toISOString().slice(11, 19);
  }
  return String(value);
}
