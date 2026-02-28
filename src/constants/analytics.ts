/** Single time-interval entry for Time Interval Stats. */
export type TimeIntervalEntry = { label: string; start: string; end: string };

/** Full-day 4-hour buckets for Time Interval Stats (includes night sessions). */
export const TIME_INTERVALS: readonly TimeIntervalEntry[] = [
  { label: '00:00 – 03:59', start: '00:00', end: '03:59' },
  { label: '04:00 – 07:59', start: '04:00', end: '07:59' },
  { label: '08:00 – 11:59', start: '08:00', end: '11:59' },
  { label: '12:00 – 15:59', start: '12:00', end: '15:59' },
  { label: '16:00 – 19:59', start: '16:00', end: '19:59' },
  { label: '20:00 – 23:59', start: '20:00', end: '23:59' },
];

/**
 * Normalize time string to HH:MM for comparison.
 * Used so legacy trade_time values (e.g. "09:30") map correctly into intervals.
 */
function normalizeTimeToHHMM(time: string): string {
  if (!time || typeof time !== 'string') return '00:00';
  const [h = '0', m = '0'] = time.split(':');
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Return the interval that contains the given time (e.g. "09:30" -> "08:00 – 11:59").
 * Used to pre-select interval in NewTradeModal when loading a draft with simple time.
 */
export function getIntervalForTime(tradeTime: string): TimeIntervalEntry | null {
  const normalized = normalizeTimeToHHMM(tradeTime);
  const [hT, mT] = normalized.split(':').map(Number);
  const tM = hT * 60 + mT;
  for (const interval of TIME_INTERVALS) {
    const [hS, mS] = interval.start.split(':').map(Number);
    const [hE, mE] = interval.end.split(':').map(Number);
    const sM = hS * 60 + mS;
    const eM = hE * 60 + mE;
    if (tM >= sM && tM <= eM) return interval;
  }
  return null;
}
