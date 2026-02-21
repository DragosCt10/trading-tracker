/** Full-day 4-hour buckets for time interval analysis (includes night sessions). */
export const TIME_INTERVALS = [
  { label: '00:00 – 03:59', start: '00:00', end: '03:59' },
  { label: '04:00 – 07:59', start: '04:00', end: '07:59' },
  { label: '08:00 – 11:59', start: '08:00', end: '11:59' },
  { label: '12:00 – 15:59', start: '12:00', end: '15:59' },
  { label: '16:00 – 19:59', start: '16:00', end: '19:59' },
  { label: '20:00 – 23:59', start: '20:00', end: '23:59' },
] as const;
