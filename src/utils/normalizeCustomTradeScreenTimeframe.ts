/**
 * Normalizes custom screenshot TF strings (e.g. `10s`, `2H`, `15m`).
 *
 * Rules:
 * - must be a positive/decimal number + suffix
 * - suffix can only be: `m`, `H`, `s` (case-insensitive)
 * - returns normalized value (H uppercase, m/s lowercase)
 * - returns `''` when input is empty/whitespace (meaning "no TF")
 * - returns `null` when invalid (meaning the user typed something unsupported)
 */
export function normalizeCustomTradeScreenTimeframe(raw: string): string | null {
  const v = raw.trim();
  if (!v) return '';
  const match = v.match(/^(\d+(?:\.\d+)?)([mHs])$/i);
  if (!match) return null;
  const numberPart = match[1];
  const suffixRaw = match[2];
  const suffixNormalized = suffixRaw.toLowerCase() === 'h' ? 'H' : suffixRaw.toLowerCase();

  // Ensure only m, H, s are allowed
  if (suffixNormalized !== 'H' && suffixNormalized !== 'm' && suffixNormalized !== 's') return null;

  return `${numberPart}${suffixNormalized}`;
}

