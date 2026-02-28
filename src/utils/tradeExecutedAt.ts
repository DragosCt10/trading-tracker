/**
 * Converts trade_date (YYYY-MM-DD) and trade_time (HH:mm, interval start) from the user's
 * local timezone to a UTC ISO string. Used for session bucketing (NY/UK/Asia) and analytics.
 *
 * @param trade_date - Date string YYYY-MM-DD
 * @param trade_time - Time string HH:mm (e.g. interval start "08:00")
 * @returns UTC ISO string (e.g. "2025-02-24T13:00:00.000Z") or null if inputs are invalid
 */
export function tradeDateAndTimeToUtcISO(
  trade_date: string | null | undefined,
  trade_time: string | null | undefined
): string | null {
  if (!trade_date || !trade_time) return null;
  const dateStr = trade_date.trim();
  const timeStr = trade_time.trim();
  if (!dateStr || !timeStr) return null;

  // Parse as local date + time then convert to UTC
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  if (
    Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d) ||
    Number.isNaN(hh) || Number.isNaN(mm)
  ) {
    return null;
  }

  // Month is 0-indexed in Date
  const localDate = new Date(y, m - 1, d, hh, mm, 0, 0);
  if (Number.isNaN(localDate.getTime())) return null;
  return localDate.toISOString();
}
