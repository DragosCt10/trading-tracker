import { getIntervalForTime } from '@/constants/analytics';

/**
 * Display trade time as the exact HH:MM the user logged.
 * Strips trailing seconds from DB Time(6) values; preserves ISO/Date branches.
 */
export function formatTradeTimeForDisplay(value: string | Date | unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') {
    if (value.includes('T') || value.includes('Z')) {
      const d = new Date(value);
      return d.toISOString().slice(11, 19);
    }
    return value.slice(0, 5);
  }
  if (value instanceof Date) {
    return value.toISOString().slice(11, 19);
  }
  return String(value);
}

/**
 * Format a trade's logged time honoring its capture mode.
 *
 *  - format='exact'    → "HH:MM" from the picker.
 *  - format='interval' → "HH:MM – HH:MM" bucket label from TIME_INTERVALS.
 *  - format=null/undef → legacy pre-feature row. Heuristic: if the time matches a
 *    bucket start exactly (HH:00 with H even and within TIME_INTERVALS), treat as
 *    interval; otherwise display exact. Until this feature shipped, all writes
 *    were interval-mode, so the heuristic is correct for ~all legacy data.
 */
export function formatTradeTimeWithMode(
  value: string | Date | null | undefined,
  format: 'exact' | 'interval' | null | undefined,
): string {
  const hhmm = formatTradeTimeForDisplay(value).slice(0, 5);
  if (!hhmm) return '';

  const interval = getIntervalForTime(hhmm);
  const isBucketStart = interval?.start === hhmm;

  if (format === 'interval') return interval?.label ?? hhmm;
  if (format === 'exact') return hhmm;
  // Legacy NULL: infer from value shape.
  return isBucketStart ? (interval?.label ?? hhmm) : hhmm;
}
