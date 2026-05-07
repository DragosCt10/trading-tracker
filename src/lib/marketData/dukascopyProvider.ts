/**
 * Server-only Dukascopy historical OHLC provider.
 *
 * Wraps `dukascopy-node`'s `getHistoricalRates` and maps the JSON output to
 * our provider-agnostic `OhlcBar[]` shape. No API key, no auth — Dukascopy's
 * historical data feed is publicly accessible.
 *
 * Commercial use of the data is permitted with attribution to "Dukascopy
 * Bank SA" — that attribution lives in the BacktestChart UI. See email of
 * record from Dukascopy (Normund Nowitzki, Apr 29 2026) confirming this.
 *
 * Why disable the library's internal cache: caching is owned one layer up
 * via Next's `unstable_cache` in the route handler (process-level cache,
 * survives route invocations, has tag-based invalidation). The library's
 * file-system cache would be a duplicate that can't share keys with our
 * outer cache and won't survive serverless cold starts.
 */

// Server-only module. The `dukascopy-node` import below pulls in Node built-ins
// (fs/http/zlib) that won't bundle for the browser — that's the runtime guard
// against accidental client imports. Also listed in `serverExternalPackages`
// in next.config.ts so Next never tries to bundle it.
import { getHistoricalRates, type JsonItem } from 'dukascopy-node';
import type { NativeTimeframe, OhlcBar } from './types';
import { toDukascopyInstrument } from './dukascopySymbols';

export class DukascopyUpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DukascopyUpstreamError';
  }
}

export interface FetchOhlcParams {
  /** App-level symbol from `DUKASCOPY_SYMBOL_TO_INSTRUMENT` (e.g. "NAS100"). */
  symbol: string;
  /** Native Dukascopy timeframe — resampled TFs (m2/m3/m4/w1) are computed
   *  upstream from a parent native, never passed here. */
  timeframe: NativeTimeframe;
  /** ISO 8601 start (inclusive). */
  fromIso: string;
  /** ISO 8601 end. */
  toIso: string;
}

/**
 * Fetch OHLC bars from Dukascopy and map them to `OhlcBar[]`.
 *
 * Throws `DukascopyUpstreamError` for whitelist misses and underlying
 * library errors (network, decode, validation). The route handler maps these
 * to a 502 — the upstream message is logged but not echoed verbatim to the
 * client.
 */
export async function fetchDukascopyOhlc({
  symbol,
  timeframe,
  fromIso,
  toIso,
}: FetchOhlcParams): Promise<OhlcBar[]> {
  const instrument = toDukascopyInstrument(symbol);
  if (!instrument) {
    // Defensive — the route handler should reject unknown symbols before us.
    throw new DukascopyUpstreamError(
      `Symbol "${symbol}" is not whitelisted for backtesting`,
    );
  }

  let rates: JsonItem[];
  try {
    rates = (await getHistoricalRates({
      // The library types the instrument as a literal-union enum; our
      // whitelist guarantees the value is valid, but TypeScript can't see
      // that across the indirection.
      instrument: instrument as Parameters<typeof getHistoricalRates>[0]['instrument'],
      dates: { from: new Date(fromIso), to: new Date(toIso) },
      timeframe,
      // 'bid' biases toward the lower side of the bid-ask spread on every bar.
      // Most charting tools display mid (or sometimes ask). dukascopy-node's
      // type union doesn't expose a 'mid' literal — but Dukascopy's underlying
      // feed only serves bid or ask. We pick 'bid' because that's what brokers
      // quote when you OPEN a long / CLOSE a short — it represents the price
      // you'd actually transact a buy at, which matches the chart convention.
      // Acknowledge upfront that absolute levels can drift from other brokers
      // (e.g. OANDA, MT4) by 0.5-2% on indices due to different LPs, dividend
      // handling, and rollover conventions — affects bias, not strategy edges.
      priceType: 'bid',
      format: 'json',
      // Library cache is disabled — see file header for why.
      useCache: false,
      // Quiet retries so a transient `.bi5` 404 (e.g., a market-closed hour)
      // doesn't fail the whole fetch.
      retryCount: 2,
      retryOnEmpty: false,
      pauseBetweenRetriesMs: 250,
    })) as JsonItem[];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new DukascopyUpstreamError(
      `Dukascopy fetch failed for ${instrument} ${timeframe}: ${msg.slice(0, 200)}`,
    );
  }

  if (!Array.isArray(rates)) return [];

  const bars: OhlcBar[] = [];
  for (const r of rates) {
    // `timestamp` is in milliseconds; lightweight-charts wants seconds.
    const time = Math.floor(Number(r.timestamp) / 1000);
    if (
      !Number.isFinite(time) ||
      !Number.isFinite(r.open) ||
      !Number.isFinite(r.high) ||
      !Number.isFinite(r.low) ||
      !Number.isFinite(r.close)
    ) {
      continue;
    }
    bars.push({
      time,
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: typeof r.volume === 'number' ? r.volume : undefined,
    });
  }
  return bars;
}
