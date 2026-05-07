/**
 * Pure risk-calc for the backtest trade placement overlay.
 *
 * The existing `tradePnlCalculator.ts` is percentage-based (the user types
 * "1%" and an R:R) — it's the right tool when there's no chart. On the
 * backtest chart the user *drags* prices, so we work in **price space**:
 *   - entryPrice (the user clicks)
 *   - slPrice    (drag handle)
 *   - tpPrice    (drag handle, optional)
 *
 * The risk-% input still drives the dollar amount: `riskDollars = balance × riskPct/100`.
 * SL distance and direction are derived from the entry/SL geometry so we don't
 * ask the user to also pick "long/short" — the chart already says it.
 *
 * Step 1 covers **standard accounts only**. Futures contract math on a
 * NAS100 CFD chart (translating "$/SL-unit" between MNQ and NAS100) is
 * deferred to Step 4 — that's the futures-account-on-index-chart story.
 */

export type Direction = 'long' | 'short' | 'flat';

export interface BacktestRiskInputs {
  /** Price at which the user clicked to enter. */
  entryPrice: number | null;
  /** Stop-loss price line position. */
  slPrice: number | null;
  /** Take-profit price line position. Optional — RR computed only when set. */
  tpPrice: number | null;
  /** Risk percent per trade (e.g. 0.5 for 0.5%). */
  riskPct: number;
  /** Account balance in account currency. */
  balance: number;
}

export interface BacktestRiskResult {
  direction: Direction;
  /** Absolute SL distance in price units. 0 when entry/SL incomplete. */
  slDistance: number;
  /** Risk:Reward ratio. 0 when SL or TP missing, or TP on the wrong side. */
  rr: number;
  /** Dollar risk (riskPct × balance / 100). 0 when inputs are zero/invalid. */
  riskDollars: number;
  /** Projected $ profit at TP if RR is valid; otherwise 0. */
  projectedPnlDollars: number;
  /** True iff entry, SL, balance are all set and SL is on the correct side of entry. */
  isValid: boolean;
}

const ZERO: BacktestRiskResult = {
  direction: 'flat',
  slDistance: 0,
  rr: 0,
  riskDollars: 0,
  projectedPnlDollars: 0,
  isValid: false,
};

export function calculateBacktestRisk({
  entryPrice,
  slPrice,
  tpPrice,
  riskPct,
  balance,
}: BacktestRiskInputs): BacktestRiskResult {
  if (
    entryPrice == null ||
    slPrice == null ||
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(slPrice) ||
    entryPrice === slPrice
  ) {
    return ZERO;
  }

  // Direction is derived from SL geometry: SL below entry ⇒ long, above ⇒ short.
  const direction: Direction = slPrice < entryPrice ? 'long' : 'short';
  const slDistance = Math.abs(entryPrice - slPrice);

  const safeRiskPct = Number.isFinite(riskPct) && riskPct > 0 ? riskPct : 0;
  const safeBalance = Number.isFinite(balance) && balance > 0 ? balance : 0;
  const riskDollars = (safeBalance * safeRiskPct) / 100;

  // RR is only meaningful when TP is on the opposite side of entry from SL.
  let rr = 0;
  let projectedPnlDollars = 0;
  if (
    tpPrice != null &&
    Number.isFinite(tpPrice) &&
    tpPrice !== entryPrice &&
    ((direction === 'long' && tpPrice > entryPrice) ||
      (direction === 'short' && tpPrice < entryPrice))
  ) {
    const tpDistance = Math.abs(tpPrice - entryPrice);
    rr = tpDistance / slDistance;
    projectedPnlDollars = riskDollars * rr;
  }

  return {
    direction,
    slDistance,
    rr,
    riskDollars,
    projectedPnlDollars,
    isValid: riskDollars > 0,
  };
}
