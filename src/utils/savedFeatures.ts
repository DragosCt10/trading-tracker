import * as fuzz from 'fuzzball';
import type { SavedNewsItem } from '@/types/account-settings';

// ─── Markets (saved_markets, user_settings) ─────────────────────────────────

/** High cap so users can save as many markets as they want; prevents unbounded growth. */
const MAX_SAVED_MARKETS = 100;

/**
 * Merges a selected market into the user's saved_markets list (user_settings).
 * Adds to the front (most recent first), case-insensitive deduplication.
 * Capped at MAX_SAVED_MARKETS.
 */
export function mergeMarketIntoSaved(
  market: string,
  savedMarkets: string[]
): string[] {
  const trimmed = market.trim();
  if (!trimmed) return savedMarkets;

  const upper = trimmed.toUpperCase();
  const without = savedMarkets.filter(
    (m) => m.trim().toUpperCase() !== upper
  );
  const merged = [trimmed, ...without].slice(0, MAX_SAVED_MARKETS);
  return merged;
}

// ─── News (saved_news, user_settings) ───────────────────────────────────────

/** Trim, lowercase, collapse whitespace */
export function normalizeNewsName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Finds an existing SavedNewsItem whose canonical name or aliases are
 * fuzzily similar to `input` (token_set_ratio, same algo as columnMatcher).
 * Returns the best match above `threshold` (default 70), or null.
 */
export function findSimilarNews(
  input: string,
  savedNews: SavedNewsItem[],
  threshold = 70
): SavedNewsItem | null {
  if (!input.trim() || savedNews.length === 0) return null;

  const normalised = normalizeNewsName(input);
  let best: { item: SavedNewsItem; score: number } | null = null;

  for (const item of savedNews) {
    const candidates = [item.name, ...(item.aliases ?? [])].map(normalizeNewsName);
    const topScore = Math.max(...candidates.map((c) => fuzz.token_set_ratio(normalised, c)));

    if (topScore > (best?.score ?? threshold - 1)) {
      best = { item, score: topScore };
    }
  }

  return best && best.score >= threshold ? best.item : null;
}

/**
 * Merges a new trade's news into the account's saved news list.
 * - If a similar entry already exists: updates intensity + adds the typed
 *   name as an alias (if different from the canonical name).
 * - Otherwise appends a brand-new entry.
 * Returns the updated list (does not mutate the original).
 */
export function mergeNewsIntoSaved(
  typedName: string,
  intensity: number | null,
  savedNews: SavedNewsItem[]
): SavedNewsItem[] {
  const canonical = normalizeNewsName(typedName);
  const match = findSimilarNews(typedName, savedNews);

  if (match) {
    return savedNews.map((item) => {
      if (item.id !== match.id) return item;
      const existingAliases = item.aliases ?? [];
      const needsAlias =
        canonical !== normalizeNewsName(item.name) &&
        !existingAliases.some((a) => normalizeNewsName(a) === canonical);
      return {
        ...item,
        // Only overwrite intensity when the user explicitly selected one
        ...(intensity !== null ? { intensity } : {}),
        aliases: needsAlias ? [...existingAliases, typedName.trim()] : existingAliases,
      };
    });
  }

  const newItem: SavedNewsItem = {
    id: crypto.randomUUID(),
    name: typedName.trim(),
    intensity: intensity ?? 1,
    aliases: [],
  };
  return [...savedNews, newItem];
}

// ─── Setup types (saved_setup_types, strategies) ─────────────────────────────

const MAX_SAVED_SETUP_TYPES = 11;

/**
 * Merges a typed setup type into the user's saved setup types list.
 * Case-insensitive deduplication — appends only if not already present.
 * Maximum 11 saved types; no-op if already at limit.
 * Returns the updated list (does not mutate the original).
 */
export function mergeSetupTypeIntoSaved(
  typedName: string,
  savedSetupTypes: string[]
): string[] {
  const trimmed = typedName.trim();
  if (!trimmed) return savedSetupTypes;
  if (savedSetupTypes.length >= MAX_SAVED_SETUP_TYPES) return savedSetupTypes;

  const lower = trimmed.toLowerCase();
  const alreadyExists = savedSetupTypes.some(
    (s) => s.trim().toLowerCase() === lower
  );

  if (alreadyExists) return savedSetupTypes;

  return [...savedSetupTypes, trimmed];
}

// ─── Liquidity types (saved_liquidity_types, strategies) ─────────────────────

const MAX_SAVED_LIQUIDITY_TYPES = 11;

/**
 * Merges a typed liquidity value into the user's saved liquidity types list.
 * Case-insensitive deduplication — appends only if not already present.
 * Maximum 11 saved types; no-op if already at limit.
 * Returns the updated list (does not mutate the original).
 */
export function mergeLiquidityTypeIntoSaved(
  typedName: string,
  savedLiquidityTypes: string[]
): string[] {
  const trimmed = typedName.trim();
  if (!trimmed) return savedLiquidityTypes;
  if (savedLiquidityTypes.length >= MAX_SAVED_LIQUIDITY_TYPES) return savedLiquidityTypes;

  const lower = trimmed.toLowerCase();
  const alreadyExists = savedLiquidityTypes.some(
    (s) => s.trim().toLowerCase() === lower
  );

  if (alreadyExists) return savedLiquidityTypes;

  return [...savedLiquidityTypes, trimmed];
}
