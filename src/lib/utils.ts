import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a numeric value for display (rates, percentages, RR, etc.):
 * integers as "1", "50"; fractional values up to 2 decimals with trailing zeros dropped ("1.5", "2.25").
 */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const rounded = Math.round(value * 100) / 100
  if (Number.isInteger(rounded)) return String(rounded)
  return rounded.toFixed(2).replace(/\.?0+$/, '')
}

/** Round to 2 decimal places (cents) for consistent currency display across components. */
export function roundToCents(value: number): number {
  return Math.round(value * 100) / 100
}

const compactCountFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1,
})

/** Social-style counts: 999, 1K, 1.1K, 1M … */
export function formatCompactCount(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0'
  return compactCountFormatter.format(Math.round(value))
}
