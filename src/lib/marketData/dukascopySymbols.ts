/**
 * Whitelist of app-symbol → Dukascopy-instrument mappings for the backtesting
 * chart. Step 1.5 ships **50 high-value symbols** spanning indices, forex
 * majors + crosses, metals, commodities, crypto, and bonds.
 *
 * Each entry has been verified against the `Instrument` enum in
 * `node_modules/dukascopy-node/dist/index.d.ts`. Multiple app aliases (e.g.
 * `GER30` and `GER40`) can map to the same Dukascopy instrument when they
 * refer to the same underlying CFD.
 *
 * Reference: https://github.com/Leo4815162342/dukascopy-node
 */

export const DUKASCOPY_SYMBOL_TO_INSTRUMENT = {
  // === Indices CFDs (10) ===
  US30: 'usa30idxusd',         // Dow Jones Industrial Average
  NAS100: 'usatechidxusd',     // Nasdaq 100
  SPX500: 'usa500idxusd',      // S&P 500
  US2000: 'ussc2000idxusd',    // Russell 2000
  GER30: 'deuidxeur',          // DAX (legacy 30-component name)
  GER40: 'deuidxeur',          // DAX (40-component alias — same Dukascopy CFD)
  UK100: 'gbridxgbp',          // FTSE 100
  JP225: 'jpnidxjpy',          // Nikkei 225
  EU50: 'eusidxeur',           // Euro Stoxx 50
  FR40: 'fraidxeur',           // CAC 40
  AU200: 'ausidxaud',          // ASX 200

  // === Forex majors (7) ===
  EURUSD: 'eurusd',
  GBPUSD: 'gbpusd',
  USDJPY: 'usdjpy',
  USDCHF: 'usdchf',
  USDCAD: 'usdcad',
  AUDUSD: 'audusd',
  NZDUSD: 'nzdusd',

  // === Forex crosses — most-traded (12) ===
  EURJPY: 'eurjpy',
  EURGBP: 'eurgbp',
  EURCHF: 'eurchf',
  EURAUD: 'euraud',
  EURNZD: 'eurnzd',
  GBPJPY: 'gbpjpy',
  GBPCHF: 'gbpchf',
  GBPAUD: 'gbpaud',
  AUDJPY: 'audjpy',
  AUDNZD: 'audnzd',
  CADJPY: 'cadjpy',
  CHFJPY: 'chfjpy',

  // === Metals — forex-style (2) ===
  XAUUSD: 'xauusd',            // Gold
  XAGUSD: 'xagusd',            // Silver

  // === Commodities CFDs (11) ===
  WTI: 'lightcmdusd',          // West Texas Intermediate (Light Crude)
  BRENT: 'brentcmdusd',        // Brent Crude
  NATGAS: 'gascmdusd',         // Natural Gas
  COPPER: 'coppercmdusd',
  PLATINUM: 'xptcmdusd',
  PALLADIUM: 'xpdcmdusd',
  COFFEE: 'coffeecmdusx',      // priced in USD cents
  COTTON: 'cottoncmdusx',
  SUGAR: 'sugarcmdusd',
  SOYBEAN: 'soybeancmdusx',
  COCOA: 'cocoacmdusd',

  // === Crypto CFDs (7) — Dukascopy added crypto Oct 2018; ~7.5y depth ===
  BTCUSD: 'btcusd',
  ETHUSD: 'ethusd',
  LTCUSD: 'ltcusd',
  BCHUSD: 'bchusd',
  ADAUSD: 'adausd',
  LINKUSD: 'lnkusd',           // Chainlink (Dukascopy uses 'lnk' not 'link')
  TRXUSD: 'trxusd',            // Tron

  // === Bonds (1) — only US Treasury available on Dukascopy ===
  UST10Y: 'ustbondtrusd',
} as const;

export type BacktestableSymbol = keyof typeof DUKASCOPY_SYMBOL_TO_INSTRUMENT;

export const BACKTESTABLE_SYMBOLS = Object.keys(
  DUKASCOPY_SYMBOL_TO_INSTRUMENT,
) as BacktestableSymbol[];

const BACKTESTABLE_SYMBOLS_UPPER = new Set(
  BACKTESTABLE_SYMBOLS.map((s) => s.toUpperCase()),
);

export function isBacktestableSymbol(value: string): value is BacktestableSymbol {
  return BACKTESTABLE_SYMBOLS_UPPER.has(value.trim().toUpperCase());
}

/**
 * Returns the Dukascopy `Instrument` enum value for an app symbol, or `null`
 * if the symbol isn't whitelisted. Caller MUST handle null — the route
 * handler returns 400 in that case rather than calling Dukascopy with a bad
 * instrument name.
 */
export function toDukascopyInstrument(value: string): string | null {
  const key = value.trim().toUpperCase() as BacktestableSymbol;
  return (DUKASCOPY_SYMBOL_TO_INSTRUMENT as Record<string, string>)[key] ?? null;
}
