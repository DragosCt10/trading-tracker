import { format } from 'date-fns';

// Intl.NumberFormat construction is ~50x slower than .format() on an existing
// instance. In a 10k-row ledger we call these formatters ~40k times, so
// caching the instances keyed on their full shape is a real win.
const currencyCache = new Map<string, Intl.NumberFormat>();
function currencyFormatter(currency: string): Intl.NumberFormat {
  let fmt = currencyCache.get(currency);
  if (!fmt) {
    fmt = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    });
    currencyCache.set(currency, fmt);
  }
  return fmt;
}

const numberCache = new Map<number, Intl.NumberFormat>();
function numberFormatter(digits: number): Intl.NumberFormat {
  let fmt = numberCache.get(digits);
  if (!fmt) {
    fmt = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    numberCache.set(digits, fmt);
  }
  return fmt;
}

const intFormatter = new Intl.NumberFormat();

export function formatPdfCurrency(value: number, currency: string): string {
  return currencyFormatter(currency).format(value);
}

export function formatPdfPercent(value: number, digits = 2): string {
  return `${value.toFixed(digits)}%`;
}

export function formatPdfSignedPercent(value: number, digits = 2): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatPdfNumber(value: number, digits = 2): string {
  return numberFormatter(digits).format(value);
}

export function formatPdfInt(value: number): string {
  return intFormatter.format(Math.round(value));
}

export function formatPdfDate(iso: string): string {
  return format(new Date(iso), 'yyyy-MM-dd');
}

export function formatPdfPeriod(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  return `${format(s, 'MMM d, yyyy')} – ${format(e, 'MMM d, yyyy')}`;
}

// Ledger dates come from a TIMESTAMP column — the same date appears on every
// row for that day. A tiny cache of the `yyyy-MM-dd` form keeps `new Date()` +
// `format()` off the hot path.
const isoDateCache = new Map<string, string>();
function formatIsoDate(iso: string): string {
  let d = isoDateCache.get(iso);
  if (!d) {
    d = format(new Date(iso), 'yyyy-MM-dd');
    isoDateCache.set(iso, d);
  }
  return d;
}

export function formatPdfDateTime(dateIso: string, timeIso?: string | null): string {
  const d = formatIsoDate(dateIso);
  if (!timeIso) return d;
  // trade_time is a TIME with a date prefix from the DB; strip to HH:mm
  const t = timeIso.length >= 5 ? timeIso.slice(0, 5) : timeIso;
  return `${d} ${t}`;
}
