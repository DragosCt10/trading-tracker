export type TradingViewLinkType = 'snapshot' | 'chart_idea' | 'idea';

export interface TradingViewLink {
  url: string;
  type: TradingViewLinkType;
  id: string;
  /** Symbol for chart ideas (e.g. "EURUSD"). */
  symbol?: string;
}

/**
 * Strict whitelist regex for TradingView chart URLs.
 *
 * Matches:
 *   https://www.tradingview.com/x/AbCdEfGh/          (snapshot)
 *   https://tradingview.com/chart/EURUSD/AbCdEfGh/    (chart idea)
 *   https://www.tradingview.com/i/AbCdEfGh/           (published idea)
 *
 * IDs are 6-20 alphanumeric chars. Trailing slash is optional.
 */
const TV_URL_RE =
  /https?:\/\/(?:www\.)?tradingview\.com\/(x|chart\/([A-Za-z0-9._-]+)|i)\/([A-Za-z0-9]{6,20})\/?/g;

const MAX_EMBEDS = 5;

/** Extract whitelisted TradingView URLs from text. Deduplicates by URL. Max 5. */
export function extractTradingViewUrls(text: string): TradingViewLink[] {
  const seen = new Set<string>();
  const results: TradingViewLink[] = [];

  for (const match of text.matchAll(TV_URL_RE)) {
    if (results.length >= MAX_EMBEDS) break;

    const url = match[0];
    if (seen.has(url)) continue;
    seen.add(url);

    const pathSegment = match[1]; // "x", "chart/SYMBOL", or "i"
    const id = match[3];

    if (pathSegment === 'x') {
      results.push({ url, type: 'snapshot', id });
    } else if (pathSegment.startsWith('chart/')) {
      const symbol = match[2];
      results.push({ url, type: 'chart_idea', id, symbol });
    } else if (pathSegment === 'i') {
      results.push({ url, type: 'idea', id });
    }
  }

  return results;
}

/** Strip TradingView URLs from text so only the embed shows. Cleans up leftover blank lines. */
export function stripTradingViewUrls(text: string): string {
  return text
    .replace(TV_URL_RE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Derive the S3 image URL for a TradingView snapshot.
 * Returns null for idea types (no client-derivable image).
 */
export function resolveTradingViewImageUrl(link: TradingViewLink): string | null {
  if (link.type !== 'snapshot') return null;
  return `https://s3.tradingview.com/snapshots/${link.id[0].toLowerCase()}/${link.id}.png`;
}
