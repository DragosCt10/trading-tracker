/**
 * Allowlist for the public backtesting demo on /backtesting/landing.
 *
 * The demo fetches bars from /api/market-data/ohlc/public, a no-auth sibling
 * of the auth-gated /api/market-data/ohlc that enforces this same allowlist
 * server-side. The picker UI is a hint; the gate is the route handler.
 */
export const DEMO_SYMBOLS = ['EURUSD', 'BTCUSD', 'NAS100', 'XAUUSD'] as const;
export type DemoSymbol = (typeof DEMO_SYMBOLS)[number];

export const DEMO_TFS = ['h4', 'd1', 'w1'] as const;
export type DemoTimeframe = (typeof DEMO_TFS)[number];

export const DEFAULT_DEMO_SYMBOL: DemoSymbol = 'EURUSD';
export const DEFAULT_DEMO_TF: DemoTimeframe = 'd1';

/** Lookback window for the demo. Public endpoint caps requests at 31 days. */
export const DEMO_LOOKBACK_DAYS = 30;

/**
 * Build the public OHLC endpoint URL for a (symbol, timeframe) pair plus an
 * ISO 8601 time range. Returns a relative path; the browser calls it as-is.
 */
export function demoBarsUrl(
  symbol: DemoSymbol,
  tf: DemoTimeframe,
  fromIso: string,
  toIso: string,
): string {
  const params = new URLSearchParams({
    symbol,
    timeframe: tf,
    from: fromIso,
    to: toIso,
  });
  return `/api/market-data/ohlc/public?${params.toString()}`;
}

/** Display labels for the picker UI. Symbol codes are shown as-is. */
export const TIMEFRAME_LABELS: Record<DemoTimeframe, string> = {
  h4: '4 hour',
  d1: 'Daily',
  w1: 'Weekly',
};
