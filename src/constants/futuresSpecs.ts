import type { CustomFuturesSpec } from '@/types/account-settings';

/**
 * FUTURES_SPECS — canonical catalog of supported CME / ICE futures contracts.
 *
 * Collapsed-unit model: each spec carries a single `dollarPerSlUnit` multiplier
 * and a human-readable `slUnitLabel` describing what one unit of `sl_size`
 * represents in the contract's native idiom (point, tick, cent, pip).
 *
 * P&L formula:
 *   risk_$ = num_contracts × sl_size × dollarPerSlUnit
 *
 * Catalog values must be cross-checked against CME spec sheets and a real
 * broker statement before broader rollout. The Phase 8 verification step
 * places a 1-contract trade per category and reconciles dollars.
 */

export type SpecSource = 'hardcoded' | 'custom' | 'override';

export type FuturesCategory =
  | 'equity-index'
  | 'metals'
  | 'energy'
  | 'treasuries'
  | 'fx'
  | 'grains-softs'
  | 'crypto';

export interface FuturesSpec {
  symbol: string;
  label: string;
  category: FuturesCategory;
  /** Dollar value of 1 unit of sl_size for this contract. */
  dollarPerSlUnit: number;
  /** Descriptive unit label rendered in the form, e.g. "point", "tick (1/32)", or "cent (per lb)". */
  slUnitLabel: string;
  /**
   * Size of one tick expressed in the spec's native unit (points). Only set for contracts where
   * users commonly express SL in either "points" or "ticks" (equity-index futures). When defined,
   * the trade form exposes a Point/Tick toggle and converts the typed value at the UI boundary —
   * `sl_size` is always persisted in the spec's native unit.
   */
  tickSize?: number;
}

export const FUTURES_SPECS: Record<string, FuturesSpec> = {
  // Equity index — SL is expressed in POINTS (the convention traders use for these contracts).
  // dollarPerSlUnit = $ per 1 full point. Multiply by num_contracts × sl_size_in_points for risk.
  // tickSize = points per tick → enables the form's Point/Tick toggle.
  ES: { symbol: 'ES', label: 'E-mini S&P 500', category: 'equity-index', dollarPerSlUnit: 50, slUnitLabel: 'point', tickSize: 0.25 },
  MES: { symbol: 'MES', label: 'Micro E-mini S&P 500', category: 'equity-index', dollarPerSlUnit: 5, slUnitLabel: 'point', tickSize: 0.25 },
  NQ: { symbol: 'NQ', label: 'E-mini Nasdaq-100', category: 'equity-index', dollarPerSlUnit: 20, slUnitLabel: 'point', tickSize: 0.25 },
  MNQ: { symbol: 'MNQ', label: 'Micro E-mini Nasdaq-100', category: 'equity-index', dollarPerSlUnit: 2, slUnitLabel: 'point', tickSize: 0.25 },
  YM: { symbol: 'YM', label: 'E-mini Dow', category: 'equity-index', dollarPerSlUnit: 5, slUnitLabel: 'point', tickSize: 1 },
  MYM: { symbol: 'MYM', label: 'Micro E-mini Dow', category: 'equity-index', dollarPerSlUnit: 0.5, slUnitLabel: 'point', tickSize: 1 },
  RTY: { symbol: 'RTY', label: 'E-mini Russell 2000', category: 'equity-index', dollarPerSlUnit: 50, slUnitLabel: 'point', tickSize: 0.10 },
  M2K: { symbol: 'M2K', label: 'Micro E-mini Russell 2000', category: 'equity-index', dollarPerSlUnit: 5, slUnitLabel: 'point', tickSize: 0.10 },
  EMD: { symbol: 'EMD', label: 'E-mini S&P MidCap 400', category: 'equity-index', dollarPerSlUnit: 100, slUnitLabel: 'point', tickSize: 0.10 },
  NKD: { symbol: 'NKD', label: 'Nikkei 225 (USD)', category: 'equity-index', dollarPerSlUnit: 5, slUnitLabel: 'point', tickSize: 5 },

  // Metals
  GC: { symbol: 'GC', label: 'Gold', category: 'metals', dollarPerSlUnit: 10, slUnitLabel: 'tick (0.10)' },
  MGC: { symbol: 'MGC', label: 'Micro Gold', category: 'metals', dollarPerSlUnit: 1, slUnitLabel: 'tick (0.10)' },
  SI: { symbol: 'SI', label: 'Silver', category: 'metals', dollarPerSlUnit: 25, slUnitLabel: 'tick (0.005)' },
  SIL: { symbol: 'SIL', label: 'Micro Silver', category: 'metals', dollarPerSlUnit: 5, slUnitLabel: 'tick (0.005)' },
  HG: { symbol: 'HG', label: 'Copper', category: 'metals', dollarPerSlUnit: 12.5, slUnitLabel: 'tick (0.0005)' },
  PL: { symbol: 'PL', label: 'Platinum', category: 'metals', dollarPerSlUnit: 5, slUnitLabel: 'tick (0.10)' },
  PA: { symbol: 'PA', label: 'Palladium', category: 'metals', dollarPerSlUnit: 5, slUnitLabel: 'tick (0.05)' },

  // Energy
  CL: { symbol: 'CL', label: 'Crude Oil WTI', category: 'energy', dollarPerSlUnit: 10, slUnitLabel: 'tick (0.01)' },
  MCL: { symbol: 'MCL', label: 'Micro Crude Oil', category: 'energy', dollarPerSlUnit: 1, slUnitLabel: 'tick (0.01)' },
  QM: { symbol: 'QM', label: 'E-mini Crude Oil', category: 'energy', dollarPerSlUnit: 12.5, slUnitLabel: 'tick (0.025)' },
  BZ: { symbol: 'BZ', label: 'Brent Crude', category: 'energy', dollarPerSlUnit: 10, slUnitLabel: 'tick (0.01)' },
  NG: { symbol: 'NG', label: 'Natural Gas', category: 'energy', dollarPerSlUnit: 10, slUnitLabel: 'tick (0.001)' },
  HO: { symbol: 'HO', label: 'NY Heating Oil', category: 'energy', dollarPerSlUnit: 4.2, slUnitLabel: 'tick (0.0001)' },
  RB: { symbol: 'RB', label: 'RBOB Gasoline', category: 'energy', dollarPerSlUnit: 4.2, slUnitLabel: 'tick (0.0001)' },

  // Treasuries
  ZB: { symbol: 'ZB', label: '30-Year T-Bond', category: 'treasuries', dollarPerSlUnit: 31.25, slUnitLabel: 'tick (1/32)' },
  UB: { symbol: 'UB', label: 'Ultra T-Bond', category: 'treasuries', dollarPerSlUnit: 31.25, slUnitLabel: 'tick (1/32)' },
  ZN: { symbol: 'ZN', label: '10-Year T-Note', category: 'treasuries', dollarPerSlUnit: 15.625, slUnitLabel: 'tick (1/64)' },
  TN: { symbol: 'TN', label: 'Ultra 10-Year', category: 'treasuries', dollarPerSlUnit: 15.625, slUnitLabel: 'tick (1/64)' },
  ZF: { symbol: 'ZF', label: '5-Year T-Note', category: 'treasuries', dollarPerSlUnit: 7.8125, slUnitLabel: 'tick (1/128)' },
  ZT: { symbol: 'ZT', label: '2-Year T-Note', category: 'treasuries', dollarPerSlUnit: 15.625, slUnitLabel: 'tick (1/128)' },

  // FX
  '6E': { symbol: '6E', label: 'Euro FX', category: 'fx', dollarPerSlUnit: 12.5, slUnitLabel: 'pip (0.0001)' },
  '6B': { symbol: '6B', label: 'British Pound', category: 'fx', dollarPerSlUnit: 6.25, slUnitLabel: 'pip (0.0001)' },
  '6J': { symbol: '6J', label: 'Japanese Yen', category: 'fx', dollarPerSlUnit: 12.5, slUnitLabel: 'pip (0.000001)' },
  '6A': { symbol: '6A', label: 'Australian Dollar', category: 'fx', dollarPerSlUnit: 10, slUnitLabel: 'pip (0.0001)' },
  '6C': { symbol: '6C', label: 'Canadian Dollar', category: 'fx', dollarPerSlUnit: 10, slUnitLabel: 'pip (0.0001)' },
  '6S': { symbol: '6S', label: 'Swiss Franc', category: 'fx', dollarPerSlUnit: 12.5, slUnitLabel: 'pip (0.0001)' },
  M6E: { symbol: 'M6E', label: 'Micro Euro FX', category: 'fx', dollarPerSlUnit: 1.25, slUnitLabel: 'pip (0.0001)' },
  M6B: { symbol: 'M6B', label: 'Micro British Pound', category: 'fx', dollarPerSlUnit: 0.625, slUnitLabel: 'pip (0.0001)' },
  M6A: { symbol: 'M6A', label: 'Micro Aussie', category: 'fx', dollarPerSlUnit: 1, slUnitLabel: 'pip (0.0001)' },

  // Grains / Softs / Cattle
  ZC: { symbol: 'ZC', label: 'Corn', category: 'grains-softs', dollarPerSlUnit: 50, slUnitLabel: 'cent' },
  ZW: { symbol: 'ZW', label: 'Wheat', category: 'grains-softs', dollarPerSlUnit: 50, slUnitLabel: 'cent' },
  ZS: { symbol: 'ZS', label: 'Soybeans', category: 'grains-softs', dollarPerSlUnit: 50, slUnitLabel: 'cent' },
  ZM: { symbol: 'ZM', label: 'Soybean Meal', category: 'grains-softs', dollarPerSlUnit: 100, slUnitLabel: '$0.10 (per ton)' },
  ZL: { symbol: 'ZL', label: 'Soybean Oil', category: 'grains-softs', dollarPerSlUnit: 600, slUnitLabel: 'cent (per lb)' },
  KC: { symbol: 'KC', label: 'Coffee', category: 'grains-softs', dollarPerSlUnit: 375, slUnitLabel: 'cent (per lb)' },
  SB: { symbol: 'SB', label: 'Sugar #11', category: 'grains-softs', dollarPerSlUnit: 1120, slUnitLabel: 'cent (per lb)' },
  CC: { symbol: 'CC', label: 'Cocoa', category: 'grains-softs', dollarPerSlUnit: 10, slUnitLabel: '$1 (per ton)' },
  CT: { symbol: 'CT', label: 'Cotton', category: 'grains-softs', dollarPerSlUnit: 500, slUnitLabel: 'cent (per lb)' },
  LE: { symbol: 'LE', label: 'Live Cattle', category: 'grains-softs', dollarPerSlUnit: 400, slUnitLabel: 'cent (per lb)' },

  // Crypto (CME)
  BTC: { symbol: 'BTC', label: 'Bitcoin', category: 'crypto', dollarPerSlUnit: 25, slUnitLabel: 'tick (5)' },
  MBT: { symbol: 'MBT', label: 'Micro Bitcoin', category: 'crypto', dollarPerSlUnit: 0.5, slUnitLabel: 'tick (5)' },
  ETH: { symbol: 'ETH', label: 'Ether', category: 'crypto', dollarPerSlUnit: 25, slUnitLabel: 'tick (0.50)' },
  MET: { symbol: 'MET', label: 'Micro Ether', category: 'crypto', dollarPerSlUnit: 0.05, slUnitLabel: 'tick (0.50)' },
};

/** Maximum number of user-saved custom specs per user. Cap exists to bound JSONB row size. */
export const MAX_CUSTOM_FUTURES_SPECS = 50;

/** Symbol regex enforced at save time. Upper-case alphanumerics + . _ - separators. */
export const FUTURES_SYMBOL_REGEX = /^[A-Z0-9._-]{1,16}$/;

/** Normalize a market input for spec lookup (trim + upper-case). */
export function normalizeFuturesSymbol(market: string | null | undefined): string {
  return (market ?? '').trim().toUpperCase();
}

/**
 * Three-tier spec resolver.
 *  1. Hardcoded `FUTURES_SPECS`
 *  2. User-saved `customSpecs`
 *  3. Returns `null` (caller falls through to per-trade override)
 */
export function getFuturesSpec(
  market: string | null | undefined,
  customSpecs?: CustomFuturesSpec[] | null,
): { spec: FuturesSpec; source: 'hardcoded' | 'custom' } | null {
  const symbol = normalizeFuturesSymbol(market);
  if (!symbol) return null;

  const hardcoded = FUTURES_SPECS[symbol];
  if (hardcoded) return { spec: hardcoded, source: 'hardcoded' };

  if (customSpecs && customSpecs.length > 0) {
    const custom = customSpecs.find((s) => normalizeFuturesSymbol(s.symbol) === symbol);
    if (custom) {
      return {
        spec: {
          symbol,
          label: custom.label ?? symbol,
          category: 'equity-index', // category is informational; custom specs default — UI can still group/display
          dollarPerSlUnit: custom.dollarPerSlUnit,
          slUnitLabel: custom.slUnitLabel,
        },
        source: 'custom',
      };
    }
  }

  return null;
}

/**
 * Validate a candidate `CustomFuturesSpec` for save. Returns null on success or an
 * error message otherwise. Run on both client (UX feedback) and server (security).
 */
export function validateCustomFuturesSpec(input: {
  symbol: string;
  dollarPerSlUnit: number;
  slUnitLabel: string;
  label?: string;
}): string | null {
  const symbol = normalizeFuturesSymbol(input.symbol);
  if (!symbol) return 'Symbol is required.';
  if (!FUTURES_SYMBOL_REGEX.test(symbol)) {
    return 'Symbol must be 1-16 characters, alphanumeric or . _ - only.';
  }
  if (FUTURES_SPECS[symbol]) {
    return `${symbol} is already in the catalog — no need to save it. Just type ${symbol} in your trade form and the spec will auto-fill.`;
  }
  if (!Number.isFinite(input.dollarPerSlUnit) || input.dollarPerSlUnit <= 0) {
    return 'Dollar per SL-unit must be a positive number.';
  }
  if (!input.slUnitLabel || input.slUnitLabel.trim() === '') {
    return 'Unit label is required (e.g. "point", "tick", "cent").';
  }
  if (input.label != null && input.label.length > 80) {
    return 'Label must be 80 characters or fewer.';
  }
  return null;
}
