import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format percentage for display: whole numbers as "100", "50", "0"; otherwise two decimals. */
export function formatPercent(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(Math.round(rounded)) : value.toFixed(2)
}
