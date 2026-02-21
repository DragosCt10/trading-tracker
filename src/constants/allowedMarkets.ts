/**
 * Allowed market symbols for search/suggestions. User can pick from this list first,
 * or type a custom value (validated by format in validateMarket).
 * Sorted for consistent display; filter by search at runtime.
 */
export const ALLOWED_MARKETS: string[] = [
  // Forex – major (no slash)
  'AUDCAD', 'AUDCHF', 'AUDJPY', 'AUDNZD', 'AUDUSD',
  'CADCHF', 'CADJPY', 'CHFJPY', 'EURAUD', 'EURCAD', 'EURCHF', 'EURGBP', 'EURJPY', 'EURNZD', 'EURUSD',
  'GBPAUD', 'GBPCAD', 'GBPCHF', 'GBPJPY', 'GBPNZD', 'GBPUSD',
  'NZDCAD', 'NZDCHF', 'NZDJPY', 'NZDUSD',
  'USDCAD', 'USDCHF', 'USDJPY', 'USDNOK', 'USDSEK', 'USDSGD', 'USDTRY', 'USDZAR',
  // Forex – slash format
  'AUD/CAD', 'AUD/CHF', 'AUD/JPY', 'AUD/NZD', 'AUD/USD',
  'CAD/CHF', 'CAD/JPY', 'CHF/JPY', 'EUR/AUD', 'EUR/CAD', 'EUR/CHF', 'EUR/GBP', 'EUR/JPY', 'EUR/NZD', 'EUR/USD',
  'GBP/AUD', 'GBP/CAD', 'GBP/CHF', 'GBP/JPY', 'GBP/NZD', 'GBP/USD',
  'NZD/CAD', 'NZD/CHF', 'NZD/JPY', 'NZD/USD',
  'USD/CAD', 'USD/CHF', 'USD/JPY', 'USD/NOK', 'USD/SEK', 'USD/SGD', 'USD/TRY', 'USD/ZAR',
  // Indices
  'AU200', 'DE30', 'DE40', 'DE30EU', 'EU50', 'EUSTX50', 'FR40', 'HK50', 'IT40', 'JP225', 'NAS100', 'NASDAQ', 'NDX',
  'SPX', 'SPX500', 'UK100', 'US30', 'US100', 'US500', 'USTEC', 'VIX', 'DAX', 'GER40', 'UKOIL', 'USOIL', 'WS30',
  // Commodities
  'BRENT', 'COPPER', 'GOLD', 'NATGAS', 'SILVER', 'WTI', 'XAGUSD', 'XAUUSD', 'XAU/USD', 'XAG/USD', 'WTI/USD', 'BCO/USD',
  // Crypto
  'BTCUSD', 'BTC/USD', 'ETHUSD', 'ETH/USD', 'BNBUSD', 'XRPUSD', 'SOLUSD', 'ADAUSD', 'DOGEUSD', 'DOTUSD', 'AVAXUSD', 'LINKUSD', 'MATICUSD', 'LTCUSD', 'UNIUSD', 'ATOMUSD', 'ETCUSD', 'XLMUSD', 'ALGOUSD', 'FILUSD', 'TRXUSD', 'VETUSD', 'ICPUSD', 'THETAUSD', 'AAVEUSD', 'EOSUSD', 'XTZUSD', 'AXSUSD', 'SANDUSD', 'MANAUSD', 'CRVUSD', 'NEARUSD', 'APTUSD', 'ARBUSD', 'OPUSD', 'INJUSD', 'SUIUSD', 'SEIUSD', 'PEPEUSD', 'WIFUSD', 'BONKUSD', 'FLOKIUSD', 'SHIBUSD',
  // More forex crosses
  'EURDKK', 'EURHUF', 'EURPLN', 'EURRON', 'GBPTRY', 'USDHKD', 'USDCNH', 'USDMXN', 'USDPLN', 'USDDKK', 'USDHUF', 'USDCZK',
  'EUR/DKK', 'EUR/HUF', 'EUR/PLN', 'EUR/RON', 'GBP/TRY', 'USD/HKD', 'USD/CNH', 'USD/MXN', 'USD/PLN', 'USD/DKK', 'USD/HUF', 'USD/CZK',
  // Additional indices / CFDs
  'AUS200', 'CHINA50', 'EU60', 'JPN225', 'STOXX50', 'SWI20', 'US2000', 'USSmallCap', 'VIX30', 'VOLX',
  // More commodities
  'COTTON', 'COFFEE', 'SUGAR', 'CORN', 'WHEAT', 'SOYBEAN', 'NGAS', 'PLATINUM', 'PALLADIUM', 'XPTUSD', 'XPDUSD',
  // Futures – indices (CME etc.)
  'ES', 'NQ', 'YM', 'RTY', 'MES', 'MNQ', 'MYM', 'M2K', 'EMD', 'NQD', 'ES1', 'NQ1', 'YM1', 'RTY1',
  'SPX500', 'USTEC', 'US30', 'US500', 'US2000', 'FDAX', 'FESX', 'FGBL', 'FGBM', 'FGBX', 'STOXX50',
  // Futures – commodities (CME, ICE)
  'CL', 'BZ', 'NG', 'GC', 'SI', 'MGC', 'SIL', 'HG', 'ZC', 'ZW', 'ZS', 'ZM', 'ZL', 'LE', 'GF', 'HE',
  'RB', 'HO', 'QM', 'QM1', 'CL1', 'NG1', 'GC1', 'SI1', 'ZC1', 'ZW1', 'ZS1',
  // Futures – currencies (CME: 6E=euro, 6J=yen, 6B=sterling, 6A=AUD, 6C=CAD, M6E/M6J=micro)
  '6E', '6J', '6B', '6A', '6C', '6N', '6S', 'M6E', 'M6J', 'M6B', 'E7', 'J7', 'EC', 'JY', 'BP', 'AD', 'CD', 'MP', 'SF',
  // Futures – bonds / rates (ZB=30Y, ZN=10Y, ZF=5Y, ZT=2Y, GE=Eurodollar)
  'ZB', 'ZN', 'ZF', 'ZT', 'UB', 'GE', 'FF', 'SOFR', 'TY', 'US', 'FV', 'TU',
  // Duplicates / common aliases
  'GER30', 'NAS100', 'USOIL', 'UKOIL', 'XAUUSD', 'GOLD', 'SILVER', 'XAGUSD', 'BRENT', 'WTI',
].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a.localeCompare(b));

const ALLOWED_MARKETS_UPPER = new Set(ALLOWED_MARKETS.map((m) => m.toUpperCase()));

export function isInAllowedMarkets(value: string): boolean {
  return ALLOWED_MARKETS_UPPER.has(value.trim().toUpperCase());
}

/** Filter allowed markets by search string (case-insensitive), max results. */
export function filterAllowedMarkets(search: string, max = 80): string[] {
  const s = search.trim().toUpperCase();
  if (!s) return ALLOWED_MARKETS.slice(0, max);
  return ALLOWED_MARKETS.filter((m) => m.toUpperCase().includes(s)).slice(0, max);
}
